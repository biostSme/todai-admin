import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { rows } = await db.query(`SELECT * FROM coupons ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const d = await req.json()
  const { rows } = await db.query(
    `INSERT INTO coupons (code, description, type, value, max_uses, expires_at, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [d.code.toUpperCase().trim(), d.description || null, d.type, d.value,
     d.max_uses || null, d.expires_at || null, d.active !== false]
  )
  return NextResponse.json(rows[0])
}
