import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createUserToken, COOKIE_NAME, TTL } from '@/lib/userauth'
import { signToken, COOKIE_NAME as ADMIN_COOKIE } from '@/lib/auth'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

const LOGIN_RATE_LIMIT = 10
const LOGIN_RATE_WINDOW = 15 * 60 // 15 minutes

// Nothing here previously throttled login attempts — both the admin login
// and the per-user login were brute-forceable with unlimited attempts.
async function isRateLimited(ip: string): Promise<boolean> {
  const key = `login_attempts:${ip}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, LOGIN_RATE_WINDOW)
  return count > LOGIN_RATE_LIMIT
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
    if (await isRateLimited(ip)) {
      return NextResponse.json({ error: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง' }, { status: 429 })
    }

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
    const { password } = body
    let { email } = body
    if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    // Must match the normalization done at registration (app/api/users/route.ts)
    // or a user who registered as "John@Email.com" can never log back in by
    // typing "john@email.com" — the exact-match lookup would just miss the row.
    email = String(email).trim().toLowerCase()
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
