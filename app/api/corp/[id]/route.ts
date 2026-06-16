import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await req.json()
  await db.query(
    `UPDATE corp_courses SET name_th=$1,name_en=$2,tag_th=$3,tag_en=$4,desc_th=$5,desc_en=$6,
     icon_letter=$7,gradient=$8,cover_url=$9,status=$10,sort_order=$11,frameworks=$12,topics=$13 WHERE id=$14`,
    [d.name_th,d.name_en,d.tag_th,d.tag_en,d.desc_th,d.desc_en,d.icon_letter,d.gradient,d.cover_url,
     d.status,d.sort_order??0,JSON.stringify(d.frameworks||[]),JSON.stringify(d.topics||[]),id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.query(`DELETE FROM corp_courses WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
