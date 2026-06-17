import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const { rows } = await db.query(`SELECT * FROM alumni ORDER BY sort_order`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const d = await req.json()
  const courses = Array.isArray(d.courses) ? d.courses : (d.courses ? String(d.courses).split(',').map((s:string)=>s.trim()) : [])
  const { rows } = await db.query(
    `INSERT INTO alumni (name_th,name_en,role_th,role_en,company_th,company_en,sector,gen,courses,avatar_url,sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [d.name_th,d.name_en,d.role_th,d.role_en,d.company_th,d.company_en,d.sector,d.gen||'',courses,d.avatar_url,d.sort_order??0]
  )
  return NextResponse.json(rows[0])
}
