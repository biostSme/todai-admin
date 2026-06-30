import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const { rows } = await db.query(`SELECT name FROM sectors ORDER BY name`)
  return NextResponse.json(rows.map(r => r.name))
}

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { name } = await req.json()
  await db.query(`INSERT INTO sectors (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name])
  return NextResponse.json({ ok: true })
}
