import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getOmise, isOmiseConfigured } from '@/lib/omise'
import { redis, seatLockKey } from '@/lib/redis'
import { sendEnrollmentConfirmationEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// 'processing' is used as a transient claim state to prevent double-charging on
// concurrent requests (see claim below) — the original CHECK constraint didn't include it.
async function ensureProcessingStatus() {
  await pool.query(`
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check
  `).catch(() => {})
  await pool.query(`
    ALTER TABLE orders ADD CONSTRAINT orders_status_check
      CHECK (status IN ('pending','paid','failed','refunded','processing'))
  `).catch(() => {})
}

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

    if ((method === 'card' || method === 'promptpay') && !isOmiseConfigured()) {
      return NextResponse.json({ error: 'Omise ยังไม่ได้ตั้งค่า — ไม่สามารถรับชำระเงินได้' }, { status: 503 })
    }
    if ((method === 'card' || method === 'promptpay') && !token_or_source) {
      return NextResponse.json({ error: 'token_or_source required' }, { status: 400 })
    }

    // Atomically claim this order before charging — otherwise two concurrent
    // requests (double-click, two tabs, slow network + retry) would both pass the
    // status==='paid' check above and both charge the card for the same order.
    await ensureProcessingStatus()
    const claim = await pool.query(
      `UPDATE orders SET status='processing', updated_at=NOW()
       WHERE id=$1 AND status NOT IN ('paid','processing') RETURNING id`,
      [order_id]
    )
    if (!claim.rows.length) {
      return NextResponse.json({ error: 'รายการนี้กำลังดำเนินการอยู่ หรือชำระไปแล้ว' }, { status: 409 })
    }

    const amountSatang = Math.round(Number(order.total_amount) * 100)
    let chargeId: string | null = null
    let chargeStatus = 'pending'
    let qrImage: string | null = null
    let authorizeUri: string | null = null

    try {
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
    } catch (chargeErr: any) {
      // Release the claim — otherwise the customer is permanently stuck unable
      // to ever retry (every future attempt would hit the 'processing' guard above).
      await pool.query(`UPDATE orders SET status='pending' WHERE id=$1 AND status='processing'`, [order_id])
      throw chargeErr
    }

    // Update order
    const paidAt = chargeStatus === 'paid' ? new Date().toISOString() : null
    await pool.query(
      `UPDATE orders SET status=$1, omise_charge_id=$2, payment_method=$3, paid_at=$4, updated_at=NOW() WHERE id=$5`,
      [chargeStatus, chargeId, method, paidAt, order_id]
    )

    // Only credit the coupon once we know the attempt didn't fail outright —
    // a declined card shouldn't burn a limited-use code with no order to show for it.
    // Conditioned on used_count < max_uses so two concurrent orders racing for the
    // last use of a limited coupon can't both push it over max_uses.
    if (order.coupon_code && chargeStatus !== 'failed' && chargeStatus !== 'expired') {
      await pool.query(
        `UPDATE coupons SET used_count = used_count + 1
         WHERE code=$1 AND (max_uses IS NULL OR used_count < max_uses)`,
        [order.coupon_code]
      )
    }

    // If paid immediately → create enrollment
    let enrollmentId: number | null = null
    if (chargeStatus === 'paid') {
      // Atomically claim a seat before enrolling — otherwise two concurrent paid
      // orders for the same session's last seat would both get an enrollment
      // regardless of what seats_remaining said afterward (the old code created
      // the enrollment unconditionally, then merely clamped the counter at 0).
      const seatClaim = await pool.query(
        `UPDATE course_sessions SET seats_remaining = seats_remaining - 1, updated_at = NOW()
         WHERE id=$1 AND seats_remaining > 0 RETURNING id`,
        [order.session_id]
      )
      if (!seatClaim.rows.length) {
        // The customer already paid — refusing the enrollment would mean taking
        // their money for nothing, so still seat them and surface this loudly for
        // staff to manually reconcile (refund/reschedule), rather than silently
        // overbooking with no record of it ever happening.
        console.error(`[payments] order ${order_id} paid but session ${order.session_id} is full — needs manual reconciliation`)
      }

      const qr_token = crypto.randomBytes(32).toString('hex')
      const { rows: enrRows } = await pool.query(
        `INSERT INTO enrollments (user_id, session_id, order_id, qr_token)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
        [order.user_id, order.session_id, order_id, qr_token]
      )
      enrollmentId = enrRows[0]?.id || null

      if (enrollmentId) {
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
