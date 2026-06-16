import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.query(`DELETE FROM leads WHERE id = $1`, [id])
  return NextResponse.json({ ok: true })
}
