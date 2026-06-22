import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { session_id, user_id, rating, comment } = await req.json()
    if (!session_id || !rating) return NextResponse.json({ error: 'session_id and rating required' }, { status: 400 })

    const { rows } = await pool.query(
      `INSERT INTO feedback (session_id, user_id, rating, comment)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [session_id, user_id || null, rating, comment || null]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session_id = new URL(req.url).searchParams.get('session_id')
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const { rows } = await pool.query(
    `SELECT f.*, u.name FROM feedback f LEFT JOIN users u ON f.user_id = u.id
     WHERE f.session_id = $1 ORDER BY f.created_at DESC`,
    [session_id]
  )
  const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : null
  return NextResponse.json({ average: avg, count: rows.length, items: rows })
}
