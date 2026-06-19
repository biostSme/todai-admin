import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { sendPaymentConfirmationEmail } from '@/lib/email'

// Omise webhook — event: charge.complete
export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.key !== 'charge.complete') {
    return NextResponse.json({ ok: true })
  }

  const charge = body.data
  if (!charge?.id) return NextResponse.json({ error: 'no charge' }, { status: 400 })

  const status = charge.status === 'successful' ? 'paid' : 'failed'
  const paidAt = status === 'paid' ? new Date().toISOString() : null

  const { rows } = await db.query(
    `UPDATE g2g_payments SET status=$1, paid_at=$2
     WHERE omise_charge_id=$3 AND status='pending'
     RETURNING *`,
    [status, paidAt, charge.id]
  )

  if (!rows.length) return NextResponse.json({ ok: true })

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
      paymentId: payment.id,
      paidAt: paidAtFormatted,
    })
    await db.query(`UPDATE g2g_payments SET email_sent=TRUE WHERE id=$1`, [payment.id])
  } catch (e) {
    console.error('Email send failed:', e)
  }

  return NextResponse.json({ ok: true })
}
