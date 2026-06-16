import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const { rows } = await db.query(`SELECT * FROM team ORDER BY sort_order`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const d = await req.json()
  const { rows } = await db.query(
    `INSERT INTO team (name_th,name_en,role_th,role_en,bio_th,bio_en,avatar_url,sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [d.name_th,d.name_en,d.role_th,d.role_en,d.bio_th,d.bio_en,d.avatar_url,d.sort_order??0]
  )
  return NextResponse.json(rows[0])
}
