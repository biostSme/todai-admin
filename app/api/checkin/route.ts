import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/checkin — Staff scans QR token to check in
export async function POST(req: NextRequest) {
  try {
    const { qr_token, staff_id } = await req.json()
    if (!qr_token) return NextResponse.json({ error: 'qr_token required' }, { status: 400 })

    const { rows } = await pool.query(
      `SELECT e.*, u.name, u.email, cs.title as session_title
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       JOIN course_sessions cs ON e.session_id = cs.id
       WHERE e.qr_token = $1`,
      [qr_token]
    )
    const enrollment = rows[0]
    if (!enrollment) return NextResponse.json({ error: 'invalid QR token' }, { status: 404 })
    if (enrollment.checked_in_at) {
      return NextResponse.json({ warning: 'already checked in', enrollment }, { status: 200 })
    }

    const updated = await pool.query(
      'UPDATE enrollments SET checked_in_at = NOW(), checked_in_by = $1 WHERE qr_token = $2 RETURNING *',
      [staff_id || null, qr_token]
    )
    return NextResponse.json({ ok: true, enrollment: updated.rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/checkin?session_id=X — Attendance list
export async function GET(req: NextRequest) {
  const session_id = new URL(req.url).searchParams.get('session_id')
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const { rows } = await pool.query(
    `SELECT e.id, u.name, u.email, u.phone, e.qr_token, e.checked_in_at, e.status
     FROM enrollments e JOIN users u ON e.user_id = u.id
     WHERE e.session_id = $1 ORDER BY u.name ASC`,
    [session_id]
  )
  return NextResponse.json(rows)
}
