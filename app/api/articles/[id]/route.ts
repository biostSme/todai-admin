import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  const d = await req.json()
  const isPublished = d.status === 'published'
  await db.query(
    `UPDATE articles SET title_th=$1,title_en=$2,category_th=$3,category_en=$4,desc_th=$5,desc_en=$6,
     body_th=$7,body_en=$8,gradient=$9,cover_url=$10,status=$11,published_at=$12 WHERE id=$13`,
    [d.title_th,d.title_en,d.category_th,d.category_en,d.desc_th,d.desc_en,
     JSON.stringify(d.body_th||[]),JSON.stringify(d.body_en||[]),
     d.gradient,d.cover_url,d.status,isPublished?new Date().toISOString():null,id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  await db.query(`DELETE FROM articles WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
