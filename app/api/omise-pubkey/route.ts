import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ public_key: process.env.OMISE_PUBLIC_KEY || '' })
}
