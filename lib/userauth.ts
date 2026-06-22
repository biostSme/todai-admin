import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'todai-user-secret-fallback-2025'
)
const COOKIE_NAME = 'todai_user_session'
const TTL = 60 * 60 * 24 * 7 // 7 days

export type UserSession = {
  id: number
  email: string
  name: string
  role: string
}

export async function createUserToken(user: UserSession): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyUserToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as UserSession
  } catch {
    return null
  }
}

export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyUserToken(token)
}

export async function getUserSessionFromRequest(req: NextRequest): Promise<UserSession | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyUserToken(token)
}

export { COOKIE_NAME, TTL }
