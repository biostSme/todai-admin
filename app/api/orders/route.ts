import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST /api/orders — Create an order (before payment)
// Price is always computed server-side from the session row — never trust a
// client-supplied amount/total_amount, or anyone could order any course for ฿1
// and pay that forged total through /api/payments.
export async function POST(req: NextRequest) {
  try {
    const { user_id, session_id, coupon_code, payment_method } = await req.json()
    if (!user_id || !session_id) {
      return NextResponse.json({ error: 'user_id and session_id required' }, { status: 400 })
    }

    const { rows: sessionRows } = await pool.query(
      `SELECT price, early_bird_price, early_bird_ends FROM course_sessions WHERE id=$1`,
      [session_id]
    )
    const session = sessionRows[0]
    if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 })

    const useEarlyBird = session.early_bird_price != null
      && session.early_bird_ends && new Date(session.early_bird_ends) > new Date()
    const amount = Number(useEarlyBird ? session.early_bird_price : session.price)

    let discount_amount = 0
    if (coupon_code) {
      const { rows: couponRows } = await pool.query(
        `SELECT * FROM coupons WHERE code=$1 AND active=TRUE`,
        [String(coupon_code).toUpperCase().trim()]
      )
      if (!couponRows.length) return NextResponse.json({ error: 'ไม่พบโค้ดนี้' }, { status: 400 })
      const c = couponRows[0]
      if (c.expires_at && new Date(c.expires_at) < new Date()) {
        return NextResponse.json({ error: 'โค้ดหมดอายุแล้ว' }, { status: 400 })
      }
      if (c.max_uses !== null && c.used_count >= c.max_uses) {
        return NextResponse.json({ error: 'โค้ดถูกใช้ครบแล้ว' }, { status: 400 })
      }
      const rawDiscount = c.type === 'percent'
        ? Math.round(amount * (Number(c.value) / 100))
        : Number(c.value)
      discount_amount = Math.min(rawDiscount, amount)
    }

    const vat_amount = 0
    const wht_amount = 0
    const total_amount = amount - discount_amount + vat_amount - wht_amount

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
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

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
