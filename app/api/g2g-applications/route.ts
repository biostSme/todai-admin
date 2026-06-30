import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

async function ensureColumns() {
  await db.query(`
    ALTER TABLE g2g_applications
      ADD COLUMN IF NOT EXISTS prefix_en TEXT,
      ADD COLUMN IF NOT EXISTS firstname_en TEXT,
      ADD COLUMN IF NOT EXISTS lastname_en TEXT,
      ADD COLUMN IF NOT EXISTS nickname_en TEXT,
      ADD COLUMN IF NOT EXISTS p2_prefix TEXT,
      ADD COLUMN IF NOT EXISTS p2_firstname TEXT,
      ADD COLUMN IF NOT EXISTS p2_lastname TEXT,
      ADD COLUMN IF NOT EXISTS p2_nickname TEXT,
      ADD COLUMN IF NOT EXISTS p2_prefix_en TEXT,
      ADD COLUMN IF NOT EXISTS p2_firstname_en TEXT,
      ADD COLUMN IF NOT EXISTS p2_lastname_en TEXT,
      ADD COLUMN IF NOT EXISTS p2_nickname_en TEXT,
      ADD COLUMN IF NOT EXISTS p2_birth_day TEXT,
      ADD COLUMN IF NOT EXISTS p2_birth_month TEXT,
      ADD COLUMN IF NOT EXISTS p2_birth_year TEXT,
      ADD COLUMN IF NOT EXISTS p2_id_card TEXT,
      ADD COLUMN IF NOT EXISTS p2_phone TEXT,
      ADD COLUMN IF NOT EXISTS p2_email TEXT,
      ADD COLUMN IF NOT EXISTS p2_facebook TEXT,
      ADD COLUMN IF NOT EXISTS p2_line_id TEXT,
      ADD COLUMN IF NOT EXISTS business_company TEXT,
      ADD COLUMN IF NOT EXISTS business_branch TEXT,
      ADD COLUMN IF NOT EXISTS business_address TEXT,
      ADD COLUMN IF NOT EXISTS business_taxid TEXT,
      ADD COLUMN IF NOT EXISTS business_phone TEXT,
      ADD COLUMN IF NOT EXISTS doc_delivery TEXT,
      ADD COLUMN IF NOT EXISTS doc_alt_address TEXT,
      ADD COLUMN IF NOT EXISTS batch_number TEXT
  `).catch(() => {})
}

export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { rows } = await db.query(`SELECT * FROM g2g_applications ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await ensureColumns()
  const d = await req.json()

  // Every field was previously optional (d.x || null) — a completely empty
  // submission would create a valid application that could then immediately be
  // paid for, leaving a "paid" registration with no name/email/phone to ever
  // contact. These are the fields the payment confirmation email and any
  // follow-up depend on.
  const required = ['firstname', 'lastname', 'phone', 'email', 'id_card']
  const missing = required.filter(k => !String(d[k] || '').trim())
  if (missing.length) {
    return NextResponse.json({ error: `กรุณากรอกข้อมูลให้ครบ: ${missing.join(', ')}` }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email).trim())) {
    return NextResponse.json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 })
  }
  // Mirrors the frontend's own pattern="[0-9]{13}" — already enforced client-side,
  // this just closes the gap for anyone calling the API directly.
  if (!/^[0-9]{13}$/.test(String(d.id_card).trim())) {
    return NextResponse.json({ error: 'เลขบัตรประจำตัวประชาชนต้องเป็นตัวเลข 13 หลัก' }, { status: 400 })
  }

  const { rows } = await db.query(
    `INSERT INTO g2g_applications
     (prefix, firstname, lastname, nickname,
      prefix_en, firstname_en, lastname_en, nickname_en,
      birth_day, birth_month, birth_year, id_card, phone, email, facebook, line_id,
      p2_prefix, p2_firstname, p2_lastname, p2_nickname,
      p2_prefix_en, p2_firstname_en, p2_lastname_en, p2_nickname_en,
      p2_birth_day, p2_birth_month, p2_birth_year, p2_id_card,
      p2_phone, p2_email, p2_facebook, p2_line_id,
      business_name, business_company, business_branch, business_address,
      business_taxid, business_phone, business_type, business_age,
      revenue, employees, website, challenges,
      doc_delivery, doc_alt_address,
      referral, reason, expectation, note, batch_number)
     VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
      $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,
      $33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51
     ) RETURNING *`,
    [
      d.prefix||null, d.firstname||null, d.lastname||null, d.nickname||null,
      d.prefix_en||null, d.firstname_en||null, d.lastname_en||null, d.nickname_en||null,
      d.birth_day||null, d.birth_month||null, d.birth_year||null, d.id_card||null,
      d.phone||null, d.email||null, d.facebook||null, d.line_id||null,
      d.p2_prefix||null, d.p2_firstname||null, d.p2_lastname||null, d.p2_nickname||null,
      d.p2_prefix_en||null, d.p2_firstname_en||null, d.p2_lastname_en||null, d.p2_nickname_en||null,
      d.p2_birth_day||null, d.p2_birth_month||null, d.p2_birth_year||null, d.p2_id_card||null,
      d.p2_phone||null, d.p2_email||null, d.p2_facebook||null, d.p2_line_id||null,
      d.business_name||null, d.business_company||null, d.business_branch||null, d.business_address||null,
      d.business_taxid||null, d.business_phone||null, d.business_type||null, d.business_age||null,
      d.revenue||null, d.employees||null, d.website||null, d.challenges||null,
      d.doc_delivery||null, d.doc_alt_address||null,
      d.referral||null, d.reason||null, d.expectation||null, d.note||null, d.batch_number||null,
    ]
  )
  return NextResponse.json(rows[0])
}
