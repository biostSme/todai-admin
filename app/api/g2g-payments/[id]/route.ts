import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { sendPaymentConfirmationEmail } from '@/lib/email'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { rows } = await db.query(`SELECT * FROM g2g_payments WHERE id=$1`, [id])
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

// Manual confirm (bank transfer) — transfer never goes through Omise, so it never
// hits the charge.complete webhook; send the confirmation email here instead.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await req.json()
  const { rows } = await db.query(
    `UPDATE g2g_payments SET status=$1, paid_at=NOW() WHERE id=$2 RETURNING *`,
    [d.status, id]
  )
  const payment = rows[0]

  if (payment && d.status === 'paid' && !payment.email_sent) {
    try {
      const [{ rows: apps }, { rows: settings }] = await Promise.all([
        db.query(`SELECT * FROM g2g_applications WHERE id=$1`, [payment.application_id]),
        db.query(`SELECT key, value FROM g2g_settings`),
      ])
      if (apps.length && apps[0].email) {
        const app = apps[0]
        const cfg: Record<string, string> = {}
        settings.forEach((r: any) => { cfg[r.key] = r.value })
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
          paidAt: new Date(payment.paid_at).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          }),
        })
        await db.query(`UPDATE g2g_payments SET email_sent=TRUE WHERE id=$1`, [payment.id])
      }
    } catch (e) {
      console.error('[g2g-payments PUT] email send failed:', e)
    }
  }

  return NextResponse.json(payment)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.query(`DELETE FROM g2g_payments WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
