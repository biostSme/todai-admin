import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { redis, SEAT_LOCK_TTL, seatLockKey } from '@/lib/redis'

export const dynamic = 'force-dynamic'

// POST /api/seats/lock — Lock a seat for 15 minutes
export async function POST(req: NextRequest) {
  try {
    const { session_id, user_id, lock_token } = await req.json()
    if (!session_id || !user_id || !lock_token) {
      return NextResponse.json({ error: 'session_id, user_id, lock_token required' }, { status: 400 })
    }

    // Check seats available
    const { rows } = await pool.query(
      'SELECT seats_remaining FROM course_sessions WHERE id = $1 AND status = $2',
      [session_id, 'open']
    )
    if (!rows[0]) return NextResponse.json({ error: 'session not found or not open' }, { status: 404 })
    if (rows[0].seats_remaining <= 0) return NextResponse.json({ error: 'session is full' }, { status: 409 })

    // Set Redis lock (NX = only if not exists)
    const key = seatLockKey(session_id, user_id)
    const set = await redis.set(key, lock_token, { ex: SEAT_LOCK_TTL, nx: true })
    if (!set) return NextResponse.json({ error: 'seat already locked by this user' }, { status: 409 })

    return NextResponse.json({ ok: true, expires_in: SEAT_LOCK_TTL, lock_token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
