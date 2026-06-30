import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const { rows } = await db.query(`SELECT * FROM g2g_entrepreneurs ORDER BY sort_order, id`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const d = await req.json()
  const { rows } = await db.query(
    `INSERT INTO g2g_entrepreneurs (name_th, name_en, role_th, role_en, company_th, company_en, bio_th, bio_en, avatar_url, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [d.name_th, d.name_en || null, d.role_th || null, d.role_en || null,
     d.company_th || null, d.company_en || null, d.bio_th || null, d.bio_en || null,
     d.avatar_url || null, d.sort_order ?? 0]
  )
  return NextResponse.json(rows[0])
}
