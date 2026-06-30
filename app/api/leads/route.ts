import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { rows } = await db.query(`SELECT * FROM leads ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const d = await req.json()
  const { rows } = await db.query(
    `INSERT INTO leads (name, business, industry, size, contact, email, phone, interest, interest_other)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [d.name, d.business || null, d.industry || null, d.size || null, d.contact || null,
     d.email || null, d.phone || null, d.interest || null, d.interest_other || null]
  )
  return NextResponse.json(rows[0])
}
