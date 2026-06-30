import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const { rows } = await db.query(`SELECT * FROM alumni_companies ORDER BY sort_order`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const d = await req.json()
  const { rows } = await db.query(
    `INSERT INTO alumni_companies (name_th,name_en,sector,gen,logo_url,sort_order)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [d.name_th||d.name,d.name_en,d.sector,d.gen||d.generation,d.logo_url,d.sort_order??0]
  )
  return NextResponse.json(rows[0])
}
