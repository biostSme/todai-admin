import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  await db.query(`DELETE FROM sectors WHERE name = $1`, [decodeURIComponent(name)])
  return NextResponse.json({ ok: true })
}
