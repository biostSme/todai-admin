import { NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  const res = NextResponse.redirect('/login')
  res.cookies.delete(COOKIE_NAME)
  return res
}
