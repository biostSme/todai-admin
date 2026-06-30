import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST /api/waitlist — Join waitlist
export async function POST(req: NextRequest) {
  try {
    const { session_id, user_id, email, name } = await req.json()
    if (!session_id || !email) return NextResponse.json({ error: 'session_id and email required' }, { status: 400 })

    const { rows } = await pool.query(
      `INSERT INTO waitlist (session_id, user_id, email, name)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [session_id, user_id || null, email, name || null]
    )
    return NextResponse.json(rows[0] || { message: 'already on waitlist' }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/waitlist?session_id=X — Admin: view waitlist
export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const session_id = new URL(req.url).searchParams.get('session_id')
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  const { rows } = await pool.query(
    'SELECT * FROM waitlist WHERE session_id = $1 ORDER BY created_at ASC',
    [session_id]
  )
  return NextResponse.json(rows)
}
