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
