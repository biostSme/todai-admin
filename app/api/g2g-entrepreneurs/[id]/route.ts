import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  const d = await req.json()
  const { rows } = await db.query(
    `UPDATE g2g_entrepreneurs SET name_th=$1, name_en=$2, role_th=$3, role_en=$4,
     company_th=$5, company_en=$6, bio_th=$7, bio_en=$8, avatar_url=$9, sort_order=$10
     WHERE id=$11 RETURNING *`,
    [d.name_th, d.name_en || null, d.role_th || null, d.role_en || null,
     d.company_th || null, d.company_en || null, d.bio_th || null, d.bio_en || null,
     d.avatar_url || null, d.sort_order ?? 0, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  await db.query(`DELETE FROM g2g_entrepreneurs WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
