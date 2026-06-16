import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const { rows } = await db.query(`SELECT * FROM leads ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}
