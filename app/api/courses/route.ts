import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const { rows } = await db.query(`SELECT * FROM courses ORDER BY sort_order`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const d = await req.json()
  const mode_th = Array.isArray(d.mode_th) ? d.mode_th : (d.mode_th ? String(d.mode_th).split(',').map((s:string)=>s.trim()) : [])
  const { rows } = await db.query(
    `INSERT INTO courses
      (title_th,title_en,tagline_th,tagline_en,desc_th,desc_en,price_th,price_en,
       duration_th,duration_en,mode_th,format_th,capacity,open_date,
       gradient,cover_url,brochure_url,status,sort_order,
       outcomes_detail,modules_th,system_5c)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
     RETURNING *`,
    [d.title_th,d.title_en,d.tagline_th,d.tagline_en,d.desc_th,d.desc_en,d.price_th,d.price_en,
     d.duration_th,d.duration_en,mode_th,d.format_th,d.capacity,d.open_date,
     d.gradient,d.cover_url,d.brochure_url,d.status||'open',d.sort_order??0,
     JSON.stringify(d.outcomes_detail||[]),JSON.stringify(d.modules_th||[]),JSON.stringify(d.system_5c||[])]
  )
  return NextResponse.json(rows[0])
}
