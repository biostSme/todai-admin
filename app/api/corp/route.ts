import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const { rows } = await db.query(`SELECT * FROM corp_courses ORDER BY sort_order`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const d = await req.json()
  const { rows } = await db.query(
    `INSERT INTO corp_courses (name_th,name_en,tag_th,tag_en,desc_th,desc_en,icon_letter,gradient,cover_url,status,sort_order,frameworks,topics)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [d.name_th,d.name_en,d.tag_th,d.tag_en,d.desc_th,d.desc_en,d.icon_letter,d.gradient,d.cover_url,d.status||'draft',d.sort_order??0,
     JSON.stringify(d.frameworks||[]),JSON.stringify(d.topics||[])]
  )
  return NextResponse.json(rows[0])
}
