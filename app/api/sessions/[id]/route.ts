import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { rows } = await pool.query('SELECT * FROM course_sessions WHERE id = $1', [id])
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { title, description, start_date, end_date, location, capacity, price, early_bird_price, early_bird_ends, status } = body
  const { rows } = await pool.query(
    `UPDATE course_sessions SET title=$1, description=$2, start_date=$3, end_date=$4,
     location=$5, capacity=$6, price=$7, early_bird_price=$8, early_bird_ends=$9, status=$10, updated_at=NOW()
     WHERE id=$11 RETURNING *`,
    [title, description, start_date, end_date, location, capacity, price, early_bird_price || null, early_bird_ends || null, status, id]
  )
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await pool.query('DELETE FROM course_sessions WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
