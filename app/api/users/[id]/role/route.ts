import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  const { role } = await req.json()
  if (!['user', 'staff', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 })
  }
  const { rows } = await pool.query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role',
    [role, id]
  )
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}
