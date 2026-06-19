import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await req.json()
  const { rows } = await db.query(
    `UPDATE g2g_applications SET status=$1 WHERE id=$2 RETURNING *`,
    [d.status, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.query(`DELETE FROM g2g_applications WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
