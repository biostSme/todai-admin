import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getOmise, isOmiseConfigured } from '@/lib/omise'
import { FEE_RATES } from '@/lib/g2g-calc'
import { isInstallmentBank, installmentSourceType, installmentFeeRate, INSTALLMENT_TERMS } from '@/lib/installment-config'

export const dynamic = 'force-dynamic'

// Pay remaining balance for a deposit payment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { method, token_or_source, confirm_manual, installment_bank, installment_term } = await req.json()

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

    // Admin manual confirm for bank transfer remaining
    if (confirm_manual && method === 'transfer') {
      await db.query(
        `UPDATE g2g_payments SET remaining_status='paid', remaining_paid_at=NOW(), remaining_method='transfer' WHERE id=$1`,
        [id]
      )
      return NextResponse.json({ ok: true, charge_status: 'paid' })
    }

    const { rows } = await db.query(`SELECT * FROM g2g_payments WHERE id=$1`, [id])
    if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const p = rows[0]
    if (!p.is_deposit) return NextResponse.json({ error: 'not a deposit payment' }, { status: 400 })
    if (p.remaining_status === 'paid') return NextResponse.json({ error: 'remaining already paid' }, { status: 400 })

    const remaining = Number(p.remaining_amount)
    const fee_rate = method === 'installment' ? installmentFeeRate(installment_bank) : (FEE_RATES[method] ?? 0)
    const charge_with_fee = Math.ceil(remaining * (1 + fee_rate))
    const chargeSatang = charge_with_fee * 100

    let chargeId: string | null = null
    let chargeStatus = 'pending'
    let qrImage: string | null = null
    let chargeAuthorizeUri: string | null = null
    let failureMessage: string | null = null

    if ((method === 'card' || method === 'promptpay' || method === 'installment') && !isOmiseConfigured()) {
      return NextResponse.json({ error: 'Omise ยังไม่ได้ตั้งค่า — ไม่สามารถรับชำระเงินได้' }, { status: 503 })
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
  } catch (err: any) {
    console.error('[pay-remaining]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
