import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const { rows } = await db.query(`SELECT * FROM articles ORDER BY sort_order ASC, created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const d = await req.json()
  const isPublished = d.status === 'published'
  const { rows } = await db.query(
    `INSERT INTO articles (title_th,title_en,category_th,category_en,desc_th,desc_en,body_th,body_en,gradient,cover_url,status,published_at,sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [d.title_th,d.title_en,d.category_th,d.category_en,d.desc_th,d.desc_en,
     JSON.stringify(d.body_th||[]),JSON.stringify(d.body_en||[]),
     d.gradient,d.cover_url||null,d.status,isPublished?new Date().toISOString():null,
     d.sort_order||0]
  )
  return NextResponse.json(rows[0])
}
