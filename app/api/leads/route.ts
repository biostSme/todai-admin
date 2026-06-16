import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const { rows } = await db.query(`SELECT * FROM leads ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const d = await req.json()
  const { rows } = await db.query(
    `INSERT INTO leads (name, business, industry, size, contact) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [d.name, d.business || null, d.industry || null, d.size || null, d.contact]
  )
  return NextResponse.json(rows[0])
}
