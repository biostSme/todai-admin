import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/sessions — List open course sessions
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'g2g'
  const all = searchParams.get('all') === '1'

  const whereClause = all ? 'WHERE course_type = $1' : "WHERE course_type = $1 AND status = 'open'"
  const { rows } = await pool.query(
    `SELECT * FROM course_sessions ${whereClause} ORDER BY start_date ASC`,
    [type]
  )
  return NextResponse.json(rows)
}

// POST /api/sessions — Admin: create session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      course_type = 'g2g', title, description, start_date, end_date,
      location, capacity = 30, price = 0, early_bird_price, early_bird_ends, status = 'draft'
    } = body

    const { rows } = await pool.query(
      `INSERT INTO course_sessions
        (course_type, title, description, start_date, end_date, location, capacity, seats_remaining, price, early_bird_price, early_bird_ends, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11)
       RETURNING *`,
      [course_type, title, description, start_date, end_date, location, capacity, price, early_bird_price || null, early_bird_ends || null, status]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
