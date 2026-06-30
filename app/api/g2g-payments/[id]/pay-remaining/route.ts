import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getOmise, isOmiseConfigured } from '@/lib/omise'
import { FEE_RATES } from '@/lib/g2g-calc'
import { isInstallmentBank, installmentSourceType, installmentFeeRate, INSTALLMENT_TERMS } from '@/lib/installment-config'

export const dynamic = 'force-dynamic'

async function ensureAccessTokenColumn() {
  await db.query(`ALTER TABLE g2g_payments ADD COLUMN IF NOT EXISTS access_token TEXT`).catch(() => {})
}

// Pay remaining balance for a deposit payment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { method, token_or_source, confirm_manual, installment_bank, installment_term, access_token } = await req.json()

    // This route is otherwise public/unauthenticated by design (customers reach
    // it without logging in), so without this check anyone who guesses a payment
    // id could attempt charges or uploads against a stranger's record. Admin
    // staff (confirm_manual) bypass this via their own requireAdmin check below.
    if (!confirm_manual) {
      await ensureAccessTokenColumn()
      const { rows: tokenRows } = await db.query(`SELECT access_token FROM g2g_payments WHERE id=$1`, [id])
      if (!tokenRows.length) return NextResponse.json({ error: 'not found' }, { status: 404 })
      if (!tokenRows[0].access_token || access_token !== tokenRows[0].access_token) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
      }
    }

    if (method === 'installment') {
      if (!isInstallmentBank(installment_bank)) {
        return NextResponse.json({ error: 'ธนาคารผ่อนชำระไม่ถูกต้อง' }, { status: 400 })
      }
      if (!INSTALLMENT_TERMS[installment_bank].includes(Number(installment_term))) {
        return NextResponse.json({ error: 'จำนวนเดือนผ่อนชำระไม่ถูกต้อง' }, { status: 400 })
      }
      if (!token_or_source) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลบัตรเครดิตก่อน' }, { status: 400 })
      }
    }

    // Admin manual confirm for bank transfer remaining — this whole route is
    // otherwise public/unauthenticated for customer use, but this branch marks a
    // balance as paid with no real charge, so it must require an admin session or
    // anyone could mark any payment "paid" for free just by guessing its id.
    if (confirm_manual && method === 'transfer') {
      const unauth = await requireAdmin(req)
      if (unauth) return unauth
      await db.query(
        `UPDATE g2g_payments SET remaining_status='paid', remaining_paid_at=NOW(), remaining_method='transfer' WHERE id=$1`,
        [id]
      )
      return NextResponse.json({ ok: true, charge_status: 'paid' })
    }

    // Atomically claim this row before charging — without this, two concurrent
    // requests (double-click, two tabs, slow network + retry) would both pass a
    // separate SELECT-then-check and both charge the card for the remaining balance.
    const claim = await db.query(
      `UPDATE g2g_payments SET remaining_status='processing'
       WHERE id=$1 AND is_deposit=TRUE AND (remaining_status IS NULL OR remaining_status NOT IN ('paid','processing'))
       RETURNING *`,
      [id]
    )
    if (!claim.rows.length) {
      const { rows: existing } = await db.query(`SELECT is_deposit, remaining_status FROM g2g_payments WHERE id=$1`, [id])
      if (!existing.length) return NextResponse.json({ error: 'not found' }, { status: 404 })
      if (!existing[0].is_deposit) return NextResponse.json({ error: 'not a deposit payment' }, { status: 400 })
      return NextResponse.json({ error: 'รายการนี้กำลังดำเนินการอยู่ หรือชำระไปแล้ว' }, { status: 409 })
    }
    const p = claim.rows[0]

    const remaining = Number(p.remaining_amount)
    const fee_rate = method === 'installment' ? installmentFeeRate(installment_bank) : (FEE_RATES[method] ?? 0)
    const charge_with_fee = Math.ceil(remaining * (1 + fee_rate))
    const chargeSatang = charge_with_fee * 100

    let chargeId: string | null = null
    let chargeStatus = 'pending'
    let qrImage: string | null = null
    let chargeAuthorizeUri: string | null = null
    let failureMessage: string | null = null

    try {
      if ((method === 'card' || method === 'promptpay' || method === 'installment') && !isOmiseConfigured()) {
        throw new Error('Omise ยังไม่ได้ตั้งค่า — ไม่สามารถรับชำระเงินได้')
      }

      if (method === 'card' || method === 'promptpay' || method === 'installment') {
        const omise = getOmise()
        const desc = `G2G — ยอดคงเหลือ payment #${id}`

        if (method === 'card') {
          const charge = await new Promise<any>((resolve, reject) =>
            omise.charges.create({
              amount: chargeSatang, currency: 'thb',
              card: token_or_source, description: desc, capture: true,
              metadata: { g2g_payment_id: id, type: 'remaining' },
            }, (e: any, r: any) => e ? reject(e) : resolve(r))
          )
          chargeId = charge.id
          chargeStatus = charge.status === 'successful' ? 'paid' : charge.status
          chargeAuthorizeUri = charge.authorize_uri || null
          failureMessage = charge.failure_message || null

        } else if (method === 'promptpay') {
          const source = await new Promise<any>((resolve, reject) =>
            omise.sources.create({ amount: chargeSatang, currency: 'thb', type: 'promptpay' },
              (e: any, r: any) => e ? reject(e) : resolve(r))
          )
          const charge = await new Promise<any>((resolve, reject) =>
            omise.charges.create({
              amount: chargeSatang, currency: 'thb', source: source.id, description: desc,
              return_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://todai-admin.vercel.app'}/payment/complete`,
            }, (e: any, r: any) => e ? reject(e) : resolve(r))
          )
          chargeId = charge.id
          chargeStatus = charge.status
          const qrUri = charge.source?.scannable_code?.image?.download_uri || null
          if (qrUri) {
            try {
              const basicAuth = Buffer.from(`${process.env.OMISE_SECRET_KEY}:`).toString('base64')
              const res = await fetch(qrUri, { headers: { Authorization: `Basic ${basicAuth}` } })
              qrImage = `data:image/svg+xml;base64,${Buffer.from(await res.text()).toString('base64')}`
            } catch { qrImage = null }
          }

        } else if (method === 'installment') {
          const source = await new Promise<any>((resolve, reject) =>
            omise.sources.create({
              amount: chargeSatang, currency: 'thb',
              type: installmentSourceType(installment_bank),
              installment_term: Number(installment_term),
            }, (e: any, r: any) => e ? reject(e) : resolve(r))
          )
          const charge = await new Promise<any>((resolve, reject) =>
            omise.charges.create({
              amount: chargeSatang, currency: 'thb', source: source.id, card: token_or_source, description: desc,
              metadata: { g2g_payment_id: id, type: 'remaining' },
              return_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://todai-admin.vercel.app'}/payment/complete`,
            }, (e: any, r: any) => e ? reject(e) : resolve(r))
          )
          chargeId = charge.id
          chargeStatus = charge.status
          chargeAuthorizeUri = charge.authorize_uri || null
          failureMessage = charge.failure_message || null
        }
        // transfer: no Omise call
      }

      const paid = chargeStatus === 'paid'
      await db.query(
        `UPDATE g2g_payments SET
           remaining_status=$1, remaining_paid_at=$2,
           remaining_omise_charge_id=$3, remaining_method=$4,
           remaining_charge_amount=$5, remaining_installment_bank=$6, remaining_installment_term=$7
         WHERE id=$8`,
        [
          chargeStatus, paid ? new Date() : null, chargeId, method, charge_with_fee,
          method === 'installment' ? installment_bank : null,
          method === 'installment' ? Number(installment_term) : null,
          id,
        ]
      )

      return NextResponse.json({
        ok: true, charge_status: chargeStatus, charge_amount: charge_with_fee,
        qr_image: qrImage, authorize_uri: chargeAuthorizeUri, failure_message: failureMessage,
      })
    } catch (chargeErr: any) {
      // Release the claim — otherwise the customer is permanently stuck unable
      // to ever retry (every future attempt would hit the 'processing' guard above).
      await db.query(`UPDATE g2g_payments SET remaining_status=NULL WHERE id=$1 AND remaining_status='processing'`, [id])
      throw chargeErr
    }
  } catch (err: any) {
    console.error('[pay-remaining]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
