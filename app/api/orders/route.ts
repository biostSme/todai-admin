import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST /api/orders — Create an order (before payment)
export async function POST(req: NextRequest) {
  try {
    const { user_id, session_id, amount, vat_amount = 0, wht_amount = 0, total_amount, coupon_code, discount_amount = 0, payment_method } = await req.json()

    const idempotency_key = crypto.randomBytes(16).toString('hex')

    const { rows } = await pool.query(
      `INSERT INTO orders (user_id, session_id, amount, vat_amount, wht_amount, total_amount, coupon_code, discount_amount, payment_method, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [user_id, session_id, amount, vat_amount, wht_amount, total_amount, coupon_code || null, discount_amount, payment_method || null, idempotency_key]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/orders?user_id=X or ?session_id=X
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get('user_id')
  const session_id = searchParams.get('session_id')

  let query = `SELECT o.*, u.name, u.email, cs.title as session_title
               FROM orders o
               LEFT JOIN users u ON o.user_id = u.id
               LEFT JOIN course_sessions cs ON o.session_id = cs.id`
  const params: any[] = []

  if (user_id) { query += ' WHERE o.user_id = $1'; params.push(user_id) }
  else if (session_id) { query += ' WHERE o.session_id = $1'; params.push(session_id) }
  query += ' ORDER BY o.created_at DESC'

  const { rows } = await pool.query(query, params)
  return NextResponse.json(rows)
}
