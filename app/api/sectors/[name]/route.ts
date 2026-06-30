import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { name } = await params
  await db.query(`DELETE FROM sectors WHERE name = $1`, [decodeURIComponent(name)])
  return NextResponse.json({ ok: true })
}
