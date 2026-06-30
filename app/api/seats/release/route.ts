import { NextRequest, NextResponse } from 'next/server'
import { redis, seatLockKey } from '@/lib/redis'

export const dynamic = 'force-dynamic'

// POST /api/seats/release — Release a seat lock
export async function POST(req: NextRequest) {
  try {
    const { session_id, user_id, lock_token } = await req.json()
    if (!session_id || !user_id) {
      return NextResponse.json({ error: 'session_id and user_id required' }, { status: 400 })
    }
    const key = seatLockKey(session_id, user_id)
    // Without checking ownership, anyone could release a stranger's seat lock by
    // guessing/knowing their user_id, prematurely freeing a seat they thought was
    // held while they're still mid-checkout.
    if (lock_token) {
      const current = await redis.get(key)
      if (current !== null && current !== lock_token) {
        return NextResponse.json({ error: 'lock_token mismatch' }, { status: 403 })
      }
    }
    await redis.del(key)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
