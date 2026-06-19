import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const { rows } = await db.query(`SELECT * FROM g2g_applications ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const d = await req.json()
  const { rows } = await db.query(
    `INSERT INTO g2g_applications
     (prefix, firstname, lastname, nickname, birth_day, birth_month, birth_year, id_card,
      phone, email, facebook, line_id, business_name, business_type, business_age,
      revenue, employees, website, challenges, referral, reason, expectation, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
     RETURNING *`,
    [d.prefix||null, d.firstname, d.lastname, d.nickname||null,
     d.birth_day||null, d.birth_month||null, d.birth_year||null, d.id_card||null,
     d.phone||null, d.email||null, d.facebook||null, d.line_id||null,
     d.business_name||null, d.business_type||null, d.business_age||null,
     d.revenue||null, d.employees||null, d.website||null, d.challenges||null,
     d.referral||null, d.reason||null, d.expectation||null, d.note||null]
  )
  return NextResponse.json(rows[0])
}
