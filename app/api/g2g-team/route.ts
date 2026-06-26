import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS g2g_team (
      id SERIAL PRIMARY KEY,
      name_th TEXT,
      name_en TEXT,
      role_th TEXT,
      role_en TEXT,
      bio_th TEXT,
      bio_en TEXT,
      avatar_url TEXT,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

export async function GET() {
  await ensureTable()
  const { rows } = await db.query(`SELECT * FROM g2g_team ORDER BY sort_order, id`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const d = await req.json()
  const { rows } = await db.query(
    `INSERT INTO g2g_team (name_th,name_en,role_th,role_en,bio_th,bio_en,avatar_url,sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [d.name_th,d.name_en,d.role_th,d.role_en,d.bio_th,d.bio_en,d.avatar_url,d.sort_order??0]
  )
  return NextResponse.json(rows[0])
}
