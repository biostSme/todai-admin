import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  const d = await req.json()
  const mode_th = Array.isArray(d.mode_th) ? d.mode_th : (d.mode_th ? String(d.mode_th).split(',').map((s:string)=>s.trim()) : [])
  await db.query(
    `UPDATE courses SET
      title_th=$1,title_en=$2,tagline_th=$3,tagline_en=$4,desc_th=$5,desc_en=$6,
      price_th=$7,price_en=$8,duration_th=$9,duration_en=$10,mode_th=$11,format_th=$12,
      capacity=$13,open_date=$14,gradient=$15,cover_url=$16,brochure_url=$17,status=$18,
      sort_order=$19,outcomes_detail=$20,modules_th=$21,system_5c=$22
     WHERE id=$23`,
    [d.title_th,d.title_en,d.tagline_th,d.tagline_en,d.desc_th,d.desc_en,
     d.price_th,d.price_en,d.duration_th,d.duration_en,mode_th,d.format_th,
     d.capacity,d.open_date,d.gradient,d.cover_url,d.brochure_url,d.status,
     d.sort_order??0,JSON.stringify(d.outcomes_detail||[]),JSON.stringify(d.modules_th||[]),JSON.stringify(d.system_5c||[]),id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  await db.query(`DELETE FROM courses WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
