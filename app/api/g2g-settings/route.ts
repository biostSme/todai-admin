import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const { rows } = await db.query(`SELECT key, value FROM g2g_settings`)
  const obj: Record<string, string> = {}
  rows.forEach(r => { obj[r.key] = r.value })
  return NextResponse.json(obj)
}

export async function PUT(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const d = await req.json()
  const entries = Object.entries(d) as [string, string][]
  for (const [key, value] of entries) {
    await db.query(
      `INSERT INTO g2g_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value ?? '']
    )
  }
  return NextResponse.json({ ok: true })
}
