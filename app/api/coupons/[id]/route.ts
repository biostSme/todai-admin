import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  const d = await req.json()
  const { rows } = await db.query(
    `UPDATE coupons SET code=$1, description=$2, type=$3, value=$4,
     max_uses=$5, expires_at=$6, active=$7 WHERE id=$8 RETURNING *`,
    [d.code.toUpperCase().trim(), d.description || null, d.type, d.value,
     d.max_uses || null, d.expires_at || null, d.active !== false, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  await db.query(`DELETE FROM coupons WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
