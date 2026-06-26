import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { rows } = await db.query(`SELECT * FROM g2g_payments WHERE id=$1`, [id])
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

// Manual confirm (bank transfer)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await req.json()
  const { rows } = await db.query(
    `UPDATE g2g_payments SET status=$1, paid_at=NOW() WHERE id=$2 RETURNING *`,
    [d.status, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.query(`DELETE FROM g2g_payments WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
