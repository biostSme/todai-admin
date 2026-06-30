import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/invoices — Generate invoice for an order
export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  try {
    const { order_id, company_name, tax_id, address } = await req.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id])
    const order = orderRes.rows[0]
    if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 })

    // Get next invoice number
    const seqRes = await pool.query("SELECT nextval('invoice_seq') AS n")
    const n = String(seqRes.rows[0].n).padStart(5, '0')
    const year = new Date().getFullYear() + 543 // Buddhist era
    const invoice_number = `INV-${year}-${n}`

    const subtotal = Number(order.amount)
    const vat = Number(order.vat_amount)
    const wht = Number(order.wht_amount)
    const total = Number(order.total_amount)

    const { rows } = await pool.query(
      `INSERT INTO invoices (invoice_number, order_id, user_id, company_name, tax_id, address, subtotal, vat, wht, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [invoice_number, order_id, order.user_id, company_name || null, tax_id || null, address || null, subtotal, vat, wht, total]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/invoices?order_id=X or ?user_id=X
export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const order_id = searchParams.get('order_id')
  const user_id = searchParams.get('user_id')

  let query = 'SELECT * FROM invoices'
  const params: any[] = []
  if (order_id) { query += ' WHERE order_id = $1'; params.push(order_id) }
  else if (user_id) { query += ' WHERE user_id = $1'; params.push(user_id) }
  query += ' ORDER BY issued_at DESC'

  const { rows } = await pool.query(query, params)
  return NextResponse.json(rows)
}
