import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { redis, seatLockKey } from '@/lib/redis'
import { sendEnrollmentConfirmationEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST /api/payments/webhook — Omise webhook for async charges (PromptPay)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.key !== 'charge.complete') return NextResponse.json({ ok: true })

    const charge = body.data
    if (charge.status !== 'successful') return NextResponse.json({ ok: true })

    const orderId = charge.metadata?.order_id
    if (!orderId) return NextResponse.json({ ok: true })

    const { rows: orderRows } = await pool.query(
      `SELECT o.*, u.name, u.email,
              cs.title as session_title, cs.start_date, cs.end_date, cs.location
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN course_sessions cs ON o.session_id = cs.id
       WHERE o.id = $1 AND o.status = 'pending'`,
      [orderId]
    )
    const order = orderRows[0]
    if (!order) return NextResponse.json({ ok: true })

    // Mark paid
    await pool.query(
      `UPDATE orders SET status='paid', paid_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [orderId]
    )

    // Create enrollment
    const qr_token = crypto.randomBytes(32).toString('hex')
    const { rows: enrRows } = await pool.query(
      `INSERT INTO enrollments (user_id, session_id, order_id, qr_token)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
      [order.user_id, order.session_id, orderId, qr_token]
    )

    if (enrRows[0]) {
      await pool.query(
        'UPDATE course_sessions SET seats_remaining=GREATEST(seats_remaining-1,0),updated_at=NOW() WHERE id=$1',
        [order.session_id]
      )
      await redis.del(seatLockKey(order.session_id, String(order.user_id)))

      try {
        await sendEnrollmentConfirmationEmail({
          to: order.email, name: order.name,
          sessionTitle: order.session_title,
          startDate: order.start_date, endDate: order.end_date,
          location: order.location, amount: Number(order.total_amount),
          method: order.payment_method, orderId, qrToken: qr_token,
        })
      } catch (e) { console.error('Email failed:', e) }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
