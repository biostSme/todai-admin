import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { sendPaymentConfirmationEmail } from '@/lib/email'
import { getOmise, isOmiseConfigured } from '@/lib/omise'

// Omise webhook — event: charge.complete
//
// This endpoint has no signature verification, and the customer's own browser
// already receives their own omise_charge_id in the payment-creation response —
// so blindly trusting body.data.status would let anyone self-forge a webhook
// call claiming their own pending/declined payment succeeded, with zero special
// knowledge required. Instead, treat the webhook purely as a "go check charge X"
// trigger and re-fetch the authoritative status directly from Omise's API using
// our secret key, which an attacker cannot forge.
export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.key !== 'charge.complete') {
    return NextResponse.json({ ok: true })
  }

  const chargeId = body.data?.id
  if (!chargeId || !isOmiseConfigured()) return NextResponse.json({ error: 'no charge' }, { status: 400 })

  const charge = await new Promise<any>((resolve, reject) =>
    getOmise().charges.retrieve(chargeId, (e: any, r: any) => e ? reject(e) : resolve(r))
  ).catch(() => null)
  if (!charge) return NextResponse.json({ error: 'charge not found' }, { status: 400 })

  const status = charge.status === 'successful' ? 'paid' : 'failed'
  const paidAt = status === 'paid' ? new Date().toISOString() : null

  const { rows } = await db.query(
    `UPDATE g2g_payments SET status=$1, paid_at=$2
     WHERE omise_charge_id=$3 AND status='pending'
     RETURNING *`,
    [status, paidAt, charge.id]
  )

  if (!rows.length) {
    // Not the initial payment — check whether this charge belongs to a
    // deposit's remaining-balance payment instead (separate charge id column).
    // Without this, PromptPay/installment/3DS-card remaining payments would
    // get charged successfully but stay stuck showing "unpaid" forever, since
    // nothing else ever confirms them asynchronously.
    await db.query(
      `UPDATE g2g_payments SET remaining_status=$1, remaining_paid_at=$2
       WHERE remaining_omise_charge_id=$3 AND remaining_status='pending'`,
      [status, paidAt, charge.id]
    )
    return NextResponse.json({ ok: true })
  }

  const payment = rows[0]

  // Only send email on successful payment
  if (status !== 'paid' || payment.email_sent) return NextResponse.json({ ok: true })

  // Fetch application + g2g settings
  const [{ rows: apps }, { rows: settings }] = await Promise.all([
    db.query(`SELECT * FROM g2g_applications WHERE id=$1`, [payment.application_id]),
    db.query(`SELECT key, value FROM g2g_settings`),
  ])

  if (!apps.length || !apps[0].email) return NextResponse.json({ ok: true })

  const app = apps[0]
  const cfg: Record<string, string> = {}
  settings.forEach((r: any) => { cfg[r.key] = r.value })

  const paidAtFormatted = new Date(paidAt!).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  try {
    await sendPaymentConfirmationEmail({
      to: app.email,
      applicantName: `${app.prefix || ''}${app.firstname} ${app.lastname}`,
      businessName: app.business_name || '',
      batchNumber: cfg.batch_number || '11',
      baseAmount: Number(payment.base_amount),
      discountAmount: Number(payment.discount_amount),
      wht: payment.wht,
      whtAmount: Number(payment.wht_amount),
      finalAmount: Number(payment.final_amount),
      couponCode: payment.coupon_code || undefined,
      method: payment.method,
      installmentBank: payment.installment_bank || undefined,
      installmentTerm: payment.installment_term || undefined,
      paymentId: payment.id,
      paidAt: paidAtFormatted,
    })
    await db.query(`UPDATE g2g_payments SET email_sent=TRUE WHERE id=$1`, [payment.id])
  } catch (e) {
    console.error('Email send failed:', e)
  }

  return NextResponse.json({ ok: true })
}
