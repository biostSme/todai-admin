import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// POST /api/users — Register new user
export async function POST(req: NextRequest) {
  try {
    const { email, password, name, phone } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 })

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) return NextResponse.json({ error: 'email already registered' }, { status: 409 })

    const password_hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role`,
      [email, password_hash, name || null, phone || null]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/users — Admin: list users
export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, phone, role, email_verified, created_at FROM users ORDER BY created_at DESC`
    )
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
