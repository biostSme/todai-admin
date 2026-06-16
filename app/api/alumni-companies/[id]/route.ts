import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await req.json()
  await db.query(
    `UPDATE alumni_companies SET name_th=$1,name_en=$2,sector=$3,gen=$4,logo_url=$5,sort_order=$6 WHERE id=$7`,
    [d.name_th||d.name,d.name_en,d.sector,d.gen||d.generation,d.logo_url,d.sort_order??0,id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.query(`DELETE FROM alumni_companies WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
