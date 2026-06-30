import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  const d = await req.json()
  const courses = Array.isArray(d.courses) ? d.courses : (d.courses ? String(d.courses).split(',').map((s:string)=>s.trim()) : [])
  await db.query(
    `UPDATE alumni SET name_th=$1,name_en=$2,role_th=$3,role_en=$4,company_th=$5,company_en=$6,sector=$7,gen=$8,courses=$9,avatar_url=$10,sort_order=$11 WHERE id=$12`,
    [d.name_th,d.name_en,d.role_th,d.role_en,d.company_th,d.company_en,d.sector,d.gen||'',courses,d.avatar_url,d.sort_order??0,id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  await db.query(`DELETE FROM alumni WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
