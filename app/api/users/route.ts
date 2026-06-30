import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// POST /api/users — Register new user
export async function POST(req: NextRequest) {
  try {
    let { email, password, name, phone } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 })
    }
    // Normalize so "John@Email.com" and "john@email.com" are the same account —
    // otherwise both the duplicate check below and login (which does an exact-match
    // lookup) treat them as different users, and a customer who registers with one
    // casing then logs in with another gets locked out of their own account.
    email = String(email).trim().toLowerCase()

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
export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, phone, role, email_verified, created_at FROM users ORDER BY created_at DESC`
    )
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
