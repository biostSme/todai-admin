import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getOmise, isOmiseConfigured } from '@/lib/omise'
import { calcG2G } from '@/lib/g2g-calc'

export const dynamic = 'force-dynamic'

export async function GET() {
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
      // Increment usage
      await db.query(`UPDATE coupons SET used_count = used_count + 1 WHERE code=$1`, [c.code])
    }

    // 2. Server-side calculation — never trust client amounts
    const calc = calcG2G({
      coupon_discount,
      wht: !!d.wht,
      method: d.method,
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

    if ((d.method === 'card' || d.method === 'promptpay') && !isOmiseConfigured()) {
      return NextResponse.json({ error: 'Omise ยังไม่ได้ตั้งค่า — ไม่สามารถรับชำระเงินได้' }, { status: 503 })
    }

    if (d.method === 'card' || d.method === 'promptpay') {
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
      }
      // transfer: no Omise call, status stays 'pending'
    }

    // 4. Persist payment with full breakdown
    const { rows } = await db.query(
      `INSERT INTO g2g_payments
       (application_id, base_amount, coupon_code, discount_amount,
        effective_base, vat_amount, gross_amount, wht, wht_amount,
        net_amount, fee_rate, charge_amount, final_amount,
        method, is_deposit, deposit_amount, remaining_amount,
        omise_charge_id, omise_source_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        d.application_id,
        calc.base, d.coupon_code || null, coupon_discount,
        calc.effective_base, calc.vat, calc.gross, !!d.wht, calc.wht_amount,
        calc.net, calc.fee_rate, calc.charge_with_fee, calc.net,
        d.method, calc.is_deposit, calc.is_deposit ? 50_000 : null,
        calc.is_deposit ? calc.remaining : null,
        chargeId, sourceId, chargeStatus,
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
  } catch (err: any) {
    console.error('[g2g-payments POST]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
