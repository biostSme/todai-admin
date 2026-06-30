import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  const d = await req.json()
  const { rows } = await db.query(
    `UPDATE g2g_applications SET status=$1 WHERE id=$2 RETURNING *`,
    [d.status, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  await db.query(`DELETE FROM g2g_applications WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
