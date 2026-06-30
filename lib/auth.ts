const SECRET = process.env.AUTH_SECRET || 'changeme-set-in-env'
const COOKIE_NAME = 'todai_admin_session'

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function signToken(): Promise<string> {
  return hmac('authenticated')
}

export async function verifyToken(token: string): Promise<boolean> {
  const expected = await signToken()
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export { COOKIE_NAME }

// proxy.ts only protects /admin/:path* page routes — API routes are never
// covered by it, so each admin-only API route must call this itself or it's
// reachable by anyone on the internet with no login at all.
import { NextRequest, NextResponse } from 'next/server'

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
