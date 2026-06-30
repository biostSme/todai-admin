import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { redis, seatLockKey } from '@/lib/redis'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST /api/enrollments — Create enrollment after payment confirmed
export async function POST(req: NextRequest) {
  try {
    const { user_id, session_id, order_id } = await req.json()
    if (!user_id || !session_id || !order_id) {
      return NextResponse.json({ error: 'user_id, session_id, order_id required' }, { status: 400 })
    }

    // Verify order is paid
    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1 AND status = $2', [order_id, 'paid'])
    if (!orderRes.rows[0]) return NextResponse.json({ error: 'order not paid' }, { status: 400 })

    // Generate QR token
    const qr_token = crypto.randomBytes(32).toString('hex')

    const { rows } = await pool.query(
      `INSERT INTO enrollments (user_id, session_id, order_id, qr_token)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [user_id, session_id, order_id, qr_token]
    )

    if (rows[0]) {
      // Atomically claim a seat — see app/api/payments/route.ts for why this must
      // happen as a conditional claim rather than an unconditional GREATEST clamp:
      // the enrollment above is already created regardless, so without this check
      // two concurrent enrollments for the same session's last seat would both succeed.
      const seatClaim = await pool.query(
        `UPDATE course_sessions SET seats_remaining = seats_remaining - 1, updated_at = NOW()
         WHERE id=$1 AND seats_remaining > 0 RETURNING id`,
        [session_id]
      )
      if (!seatClaim.rows.length) {
        console.error(`[enrollments] order ${order_id} enrolled but session ${session_id} is full — needs manual reconciliation`)
      }
      // Release Redis lock
      await redis.del(seatLockKey(session_id, String(user_id)))
    }

    return NextResponse.json(rows[0] || { error: 'already enrolled' }, { status: rows[0] ? 201 : 409 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/enrollments?user_id=X or ?session_id=X
export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get('user_id')
  const session_id = searchParams.get('session_id')

  let query = `SELECT e.*, u.name, u.email, cs.title as session_title
               FROM enrollments e
               JOIN users u ON e.user_id = u.id
               JOIN course_sessions cs ON e.session_id = cs.id`
  const params: any[] = []

  if (user_id) { query += ' WHERE e.user_id = $1'; params.push(user_id) }
  else if (session_id) { query += ' WHERE e.session_id = $1'; params.push(session_id) }
  query += ' ORDER BY e.created_at DESC'

  const { rows } = await pool.query(query, params)
  return NextResponse.json(rows)
}
