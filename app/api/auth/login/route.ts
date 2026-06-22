import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createUserToken, COOKIE_NAME, TTL } from '@/lib/userauth'
import { signToken, COOKIE_NAME as ADMIN_COOKIE } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Admin login (username + password)
    if (body.username) {
      const validUser = body.username === process.env.ADMIN_USER
      const validPass = body.password === process.env.ADMIN_PASSWORD
      if (!validUser || !validPass) {
        return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })
      }
      const token = await signToken()
      const res = NextResponse.json({ ok: true })
      res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 8, path: '/' })
      return res
    }

    // User login (email + password)
    const { email, password } = body
    if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    const user = rows[0]
    if (!user || !user.password_hash) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })
    const token = await createUserToken({ id: user.id, email: user.email, name: user.name, role: user.role })
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
    res.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: TTL, path: '/' })
    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
