import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { redis, seatLockKey } from '@/lib/redis'
import { sendEnrollmentConfirmationEmail } from '@/lib/email'
import { getOmise, isOmiseConfigured } from '@/lib/omise'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST /api/payments/webhook — Omise webhook for async charges (PromptPay)
//
// No signature verification here, and the customer's own browser already
// receives their own charge id from the payment-creation response — so trusting
// body.data.status (and even body.data.metadata.order_id) directly would let
// anyone self-forge a webhook claiming their own unpaid order succeeded. Treat
// the webhook purely as a "go check charge X" trigger and re-fetch the
// authoritative charge (status + metadata) from Omise's API with our secret key.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.key !== 'charge.complete') return NextResponse.json({ ok: true })

    const chargeId = body.data?.id
    if (!chargeId || !isOmiseConfigured()) return NextResponse.json({ ok: true })

    const charge = await new Promise<any>((resolve, reject) =>
      getOmise().charges.retrieve(chargeId, (e: any, r: any) => e ? reject(e) : resolve(r))
    ).catch(() => null)
    if (!charge || charge.status !== 'successful') return NextResponse.json({ ok: true })

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

    // Atomically claim a seat before enrolling — same overbooking gap as the
    // synchronous /api/payments path: the old code created the enrollment first
    // and only afterward clamped the seat counter, so it never actually blocked
    // a second enrollment once the session was full.
    const seatClaim = await pool.query(
      `UPDATE course_sessions SET seats_remaining = seats_remaining - 1, updated_at = NOW()
       WHERE id=$1 AND seats_remaining > 0 RETURNING id`,
      [order.session_id]
    )
    if (!seatClaim.rows.length) {
      console.error(`[payments/webhook] order ${orderId} paid but session ${order.session_id} is full — needs manual reconciliation`)
    }

    // Create enrollment
    const qr_token = crypto.randomBytes(32).toString('hex')
    const { rows: enrRows } = await pool.query(
      `INSERT INTO enrollments (user_id, session_id, order_id, qr_token)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
      [order.user_id, order.session_id, orderId, qr_token]
    )

    if (enrRows[0]) {
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
