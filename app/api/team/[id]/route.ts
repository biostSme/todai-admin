import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  const d = await req.json()
  await db.query(
    `UPDATE team SET name_th=$1,name_en=$2,role_th=$3,role_en=$4,bio_th=$5,bio_en=$6,avatar_url=$7,sort_order=$8 WHERE id=$9`,
    [d.name_th,d.name_en,d.role_th,d.role_en,d.bio_th,d.bio_en,d.avatar_url,d.sort_order??0,id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  await db.query(`DELETE FROM team WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
