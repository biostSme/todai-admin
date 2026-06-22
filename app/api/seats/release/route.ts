import { NextRequest, NextResponse } from 'next/server'
import { redis, seatLockKey } from '@/lib/redis'

export const dynamic = 'force-dynamic'

// POST /api/seats/release — Release a seat lock
export async function POST(req: NextRequest) {
  try {
    const { session_id, user_id } = await req.json()
    if (!session_id || !user_id) {
      return NextResponse.json({ error: 'session_id and user_id required' }, { status: 400 })
    }
    const key = seatLockKey(session_id, user_id)
    await redis.del(key)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
