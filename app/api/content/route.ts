import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const { rows } = await db.query(`SELECT key, value FROM content`)
  const result: Record<string, string> = {}
  rows.forEach(r => { result[r.key] = r.value })
  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const updates: Record<string, string> = await req.json()
  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      db.query(
        `INSERT INTO content (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
      )
    )
  )
  return NextResponse.json({ ok: true })
}
