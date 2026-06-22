import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getOmise, isOmiseConfigured } from '@/lib/omise'
import { redis, seatLockKey } from '@/lib/redis'
import { sendEnrollmentConfirmationEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments
 * Body: { order_id, method: 'card'|'promptpay', token_or_source, user_name, user_email }
 *
 * Flow:
 * 1. Validate order exists + pending
 * 2. Create Omise charge
 * 3. Mark order as paid
 * 4. Create enrollment + decrement seats
 * 5. Release Redis seat lock
 * 6. Send confirmation email
 * 7. Return { ok, enrollment_id, qr_url (PromptPay), redirect_uri (3DS) }
 */
export async function POST(req: NextRequest) {
  try {
    const { order_id, method, token_or_source, user_name, user_email } = await req.json()
    if (!order_id || !method) {
      return NextResponse.json({ error: 'order_id and method required' }, { status: 400 })
    }

    // Fetch order + session info
    const { rows: orderRows } = await pool.query(
      `SELECT o.*, u.name, u.email, u.phone,
              cs.title as session_title, cs.start_date, cs.end_date, cs.location, cs.seats_remaining
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN course_sessions cs ON o.session_id = cs.id
       WHERE o.id = $1`,
      [order_id]
    )
    const order = orderRows[0]
    if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 })
    if (order.status === 'paid') return NextResponse.json({ error: 'already paid' }, { status: 409 })
    if (order.seats_remaining <= 0) return NextResponse.json({ error: 'session is full' }, { status: 409 })

    const amountSatang = Math.round(Number(order.total_amount) * 100)
    let chargeId: string | null = null
    let chargeStatus = 'paid'
    let qrImage: string | null = null
    let authorizeUri: string | null = null

    if (isOmiseConfigured() && token_or_source) {
      const omise = getOmise()

      if (method === 'card') {
        const charge = await new Promise<any>((resolve, reject) =>
          omise.charges.create({
            amount: amountSatang,
            currency: 'thb',
            card: token_or_source,
            description: `${order.session_title} — ${order.name}`,
            metadata: { order_id, user_id: order.user_id },
            capture: true,
            return_uri: `${process.env.NEXTAUTH_URL}/user/dashboard?payment=done`,
          }, (e: any, r: any) => e ? reject(e) : resolve(r))
        )
        chargeId = charge.id
        chargeStatus = charge.status === 'successful' ? 'paid' : charge.status
        if (charge.authorize_uri) authorizeUri = charge.authorize_uri

      } else if (method === 'promptpay') {
        const source = await new Promise<any>((resolve, reject) =>
          omise.sources.create({
            amount: amountSatang, currency: 'thb', type: 'promptpay',
          }, (e: any, r: any) => e ? reject(e) : resolve(r))
        )
        const charge = await new Promise<any>((resolve, reject) =>
          omise.charges.create({
            amount: amountSatang, currency: 'thb',
            source: source.id,
            description: `${order.session_title} — ${order.name}`,
            metadata: { order_id, user_id: order.user_id },
            return_uri: `${process.env.NEXTAUTH_URL}/user/dashboard?payment=done`,
          }, (e: any, r: any) => e ? reject(e) : resolve(r))
        )
        chargeId = charge.id
        chargeStatus = 'pending'
        qrImage = charge.source?.scannable_code?.image?.download_uri || null
      }
    }

    // Update order
    const paidAt = chargeStatus === 'paid' ? new Date().toISOString() : null
    await pool.query(
      `UPDATE orders SET status=$1, omise_charge_id=$2, payment_method=$3, paid_at=$4, updated_at=NOW() WHERE id=$5`,
      [chargeStatus, chargeId, method, paidAt, order_id]
    )

    // If paid immediately → create enrollment
    let enrollmentId: number | null = null
    if (chargeStatus === 'paid') {
      const qr_token = crypto.randomBytes(32).toString('hex')
      const { rows: enrRows } = await pool.query(
        `INSERT INTO enrollments (user_id, session_id, order_id, qr_token)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
        [order.user_id, order.session_id, order_id, qr_token]
      )
      enrollmentId = enrRows[0]?.id || null

      if (enrollmentId) {
        await pool.query(
          'UPDATE course_sessions SET seats_remaining = GREATEST(seats_remaining-1,0), updated_at=NOW() WHERE id=$1',
          [order.session_id]
        )
        await redis.del(seatLockKey(order.session_id, String(order.user_id)))

        // Send confirmation email
        try {
          await sendEnrollmentConfirmationEmail({
            to: user_email || order.email,
            name: user_name || order.name,
            sessionTitle: order.session_title,
            startDate: order.start_date,
            endDate: order.end_date,
            location: order.location,
            amount: Number(order.total_amount),
            method,
            orderId: order_id,
            qrToken: qr_token,
          })
        } catch (e) {
          console.error('Email failed:', e)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: chargeStatus,
      charge_id: chargeId,
      enrollment_id: enrollmentId,
      qr_image: qrImage,
      authorize_uri: authorizeUri,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
