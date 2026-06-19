import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(req: NextRequest) {
  const { code, base_amount } = await req.json()
  if (!code) return NextResponse.json({ error: 'No code' }, { status: 400 })

  const { rows } = await db.query(
    `SELECT * FROM coupons WHERE code=$1 AND active=TRUE`,
    [code.toUpperCase().trim()]
  )
  if (!rows.length) return NextResponse.json({ error: 'ไม่พบโค้ดนี้' }, { status: 404 })

  const c = rows[0]

  if (c.expires_at && new Date(c.expires_at) < new Date()) {
    return NextResponse.json({ error: 'โค้ดหมดอายุแล้ว' }, { status: 400 })
  }
  if (c.max_uses !== null && c.used_count >= c.max_uses) {
    return NextResponse.json({ error: 'โค้ดถูกใช้ครบแล้ว' }, { status: 400 })
  }

  const base = Number(base_amount) || 0
  const discount = c.type === 'percent'
    ? Math.round(base * (Number(c.value) / 100))
    : Number(c.value)

  return NextResponse.json({
    code: c.code,
    type: c.type,
    value: Number(c.value),
    discount_amount: Math.min(discount, base),
    description: c.description,
  })
}
