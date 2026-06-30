import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getOmise, isOmiseConfigured } from '@/lib/omise'
import { calcG2G } from '@/lib/g2g-calc'
import { isInstallmentBank, installmentSourceType, INSTALLMENT_TERMS } from '@/lib/installment-config'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Transient lock to prevent two concurrent requests (double-click, two tabs,
// slow network + retry) from both charging Omise for the same application.
async function ensurePaymentLockColumn() {
  await db.query(`
    ALTER TABLE g2g_applications ADD COLUMN IF NOT EXISTS payment_processing BOOLEAN DEFAULT FALSE
  `).catch(() => {})
}

// access_token gates /pay/[id] and the pay-remaining flow — without it, the page
// is reachable by anyone who guesses or enumerates the sequential payment id,
// exposing the customer's name, business name, and exact amount owed.
async function ensureAccessTokenColumn() {
  await db.query(`
    ALTER TABLE g2g_payments ADD COLUMN IF NOT EXISTS access_token TEXT
  `).catch(() => {})
}

export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  try {
    const { rows } = await db.query(
      `SELECT p.*, a.firstname, a.lastname, a.business_name, a.email
       FROM g2g_payments p
       LEFT JOIN g2g_applications a ON a.id = p.application_id
       ORDER BY p.created_at DESC`
    )
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const d = await req.json()
    // d: { application_id, coupon_code, wht, method, is_deposit, token_or_source, applicant_name, batch_number }

    // 1. Validate coupon server-side
    let coupon_discount = 0
    let couponCodeToCredit: string | null = null
    if (d.coupon_code) {
      const { rows: couponRows } = await db.query(
        `SELECT * FROM coupons WHERE code=$1 AND active=TRUE`,
        [String(d.coupon_code).toUpperCase().trim()]
      )
      if (!couponRows.length) return NextResponse.json({ error: 'โค้ดส่วนลดไม่ถูกต้อง' }, { status: 400 })
      const c = couponRows[0]
      if (c.expires_at && new Date(c.expires_at) < new Date())
        return NextResponse.json({ error: 'โค้ดหมดอายุแล้ว' }, { status: 400 })
      if (c.max_uses !== null && c.used_count >= c.max_uses)
        return NextResponse.json({ error: 'โค้ดถูกใช้ครบแล้ว' }, { status: 400 })
      coupon_discount = c.type === 'percent'
        ? Math.round(200_000 * (Number(c.value) / 100))
        : Number(c.value)
      // Usage is incremented further down, only once we know the charge didn't
      // fail outright — otherwise a declined card burns a limited-use code with
      // no registration to show for it.
      couponCodeToCredit = c.code
    }

    // Installment is full-payment-only, and bank/term must be validated server-side
    const installmentBank = d.installment_bank
    if (d.method === 'installment') {
      if (d.is_deposit) {
        return NextResponse.json({ error: 'ผ่อนชำระใช้ได้กับการจ่ายเต็มจำนวนเท่านั้น' }, { status: 400 })
      }
      if (!isInstallmentBank(installmentBank)) {
        return NextResponse.json({ error: 'ธนาคารผ่อนชำระไม่ถูกต้อง' }, { status: 400 })
      }
      if (!INSTALLMENT_TERMS[installmentBank].includes(Number(d.installment_term))) {
        return NextResponse.json({ error: 'จำนวนเดือนผ่อนชำระไม่ถูกต้อง' }, { status: 400 })
      }
      if (!d.token_or_source) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลบัตรเครดิตก่อน' }, { status: 400 })
      }
    }

    // 2. Server-side calculation — never trust client amounts
    const calc = calcG2G({
      coupon_discount,
      wht: !!d.wht,
      method: d.method,
      installment_bank: d.method === 'installment' ? d.installment_bank : undefined,
      is_deposit: !!d.is_deposit,
    })

    const chargeSatang = calc.charge_with_fee * 100

    // 3. Charge via Omise
    let chargeId: string | null = null
    let sourceId: string | null = null
    let chargeStatus = 'pending'
    let qrImage: string | null = null
    let chargeAuthorizeUri: string | null = null
    let failureMessage: string | null = null

    if ((d.method === 'card' || d.method === 'promptpay' || d.method === 'installment') && !isOmiseConfigured()) {
      return NextResponse.json({ error: 'Omise ยังไม่ได้ตั้งค่า — ไม่สามารถรับชำระเงินได้' }, { status: 503 })
    }

    await ensurePaymentLockColumn()
    const claim = await db.query(
      `UPDATE g2g_applications SET payment_processing=TRUE WHERE id=$1 AND payment_processing IS NOT TRUE RETURNING id`,
      [d.application_id]
    )
    if (!claim.rows.length) {
      const { rows: existing } = await db.query(`SELECT id FROM g2g_applications WHERE id=$1`, [d.application_id])
      if (!existing.length) return NextResponse.json({ error: 'ไม่พบใบสมัครนี้' }, { status: 404 })
      return NextResponse.json({ error: 'กำลังดำเนินการชำระเงินอยู่ กรุณารอสักครู่แล้วลองใหม่' }, { status: 409 })
    }

    try {
    if (d.method === 'card' || d.method === 'promptpay' || d.method === 'installment') {
      const omise = getOmise()
      const desc = `G2G รุ่น ${d.batch_number || '?'} — ${d.applicant_name || ''}${calc.is_deposit ? ' (มัดจำ)' : ''}`

      if (d.method === 'card') {
        const charge = await new Promise<any>((resolve, reject) =>
          omise.charges.create({
            amount: chargeSatang,
            currency: 'thb',
            card: d.token_or_source,
            description: desc,
            metadata: { application_id: d.application_id },
            capture: true,
          }, (err: any, res: any) => err ? reject(err) : resolve(res))
        )
        chargeId = charge.id
        chargeStatus = charge.status === 'successful' ? 'paid' : charge.status
        chargeAuthorizeUri = charge.authorize_uri || null
        failureMessage = charge.failure_message || null

      } else if (d.method === 'promptpay') {
        const source = await new Promise<any>((resolve, reject) =>
          omise.sources.create({
            amount: chargeSatang,
            currency: 'thb',
            type: 'promptpay',
          }, (err: any, res: any) => err ? reject(err) : resolve(res))
        )
        sourceId = source.id
        const charge = await new Promise<any>((resolve, reject) =>
          omise.charges.create({
            amount: chargeSatang,
            currency: 'thb',
            source: sourceId,
            description: desc,
            metadata: { application_id: d.application_id },
            return_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://todai-admin.vercel.app'}/payment/complete`,
          }, (err: any, res: any) => err ? reject(err) : resolve(res))
        )
        chargeId = charge.id
        chargeStatus = charge.status
        chargeAuthorizeUri = charge.authorize_uri || null

        const qrDownloadUri = charge.source?.scannable_code?.image?.download_uri || null
        if (qrDownloadUri) {
          try {
            const basicAuth = Buffer.from(`${process.env.OMISE_SECRET_KEY}:`).toString('base64')
            const imgRes = await fetch(qrDownloadUri, { headers: { Authorization: `Basic ${basicAuth}` } })
            const svgText = await imgRes.text()
            qrImage = `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`
          } catch { qrImage = null }
        }

      } else if (d.method === 'installment') {
        const source = await new Promise<any>((resolve, reject) =>
          omise.sources.create({
            amount: chargeSatang,
            currency: 'thb',
            type: installmentSourceType(d.installment_bank),
            installment_term: Number(d.installment_term),
          }, (err: any, res: any) => err ? reject(err) : resolve(res))
        )
        sourceId = source.id
        const charge = await new Promise<any>((resolve, reject) =>
          omise.charges.create({
            amount: chargeSatang,
            currency: 'thb',
            source: sourceId,
            card: d.token_or_source,
            description: desc,
            metadata: { application_id: d.application_id },
            return_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://todai-admin.vercel.app'}/payment/complete`,
          }, (err: any, res: any) => err ? reject(err) : resolve(res))
        )
        chargeId = charge.id
        chargeStatus = charge.status
        chargeAuthorizeUri = charge.authorize_uri || null
        failureMessage = charge.failure_message || null
      }
      // transfer: no Omise call, status stays 'pending'
    }

    // Only credit the coupon once we know the attempt didn't fail outright —
    // a pending (transfer/promptpay-awaiting-scan) or paid charge counts as used,
    // a declined/expired charge does not.
    if (couponCodeToCredit && chargeStatus !== 'failed' && chargeStatus !== 'expired') {
      await db.query(`UPDATE coupons SET used_count = used_count + 1 WHERE code=$1`, [couponCodeToCredit])
    }

    // 4. Persist payment with full breakdown
    await ensureAccessTokenColumn()
    // Generated for every payment, not just deposits — GET /api/g2g-payments/[id]
    // is polled by id alone for full payments too (promptpay QR status), and
    // without this anyone guessing an id could read another customer's coupon
    // code, amount, and payment method.
    const accessToken = crypto.randomBytes(24).toString('hex')
    const { rows } = await db.query(
      `INSERT INTO g2g_payments
       (application_id, base_amount, coupon_code, discount_amount,
        effective_base, vat_amount, gross_amount, wht, wht_amount,
        net_amount, fee_rate, charge_amount, final_amount,
        method, is_deposit, deposit_amount, remaining_amount,
        omise_charge_id, omise_source_id, status, installment_bank, installment_term, access_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [
        d.application_id,
        calc.base, d.coupon_code || null, coupon_discount,
        calc.effective_base, calc.vat, calc.gross, !!d.wht, calc.wht_amount,
        calc.net, calc.fee_rate, calc.charge_with_fee, calc.net,
        d.method, calc.is_deposit, calc.is_deposit ? calc.charge_now : null,
        calc.is_deposit ? calc.remaining : null,
        chargeId, sourceId, chargeStatus,
        d.method === 'installment' ? d.installment_bank : null,
        d.method === 'installment' ? Number(d.installment_term) : null,
        accessToken,
      ]
    )

    return NextResponse.json({
      payment: rows[0],
      calc,
      qr_image: qrImage,
      authorize_uri: chargeAuthorizeUri,
      charge_status: chargeStatus,
      failure_message: failureMessage,
    })
    } finally {
      await db.query(`UPDATE g2g_applications SET payment_processing=FALSE WHERE id=$1`, [d.application_id])
    }
  } catch (err: any) {
    console.error('[g2g-payments POST]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
