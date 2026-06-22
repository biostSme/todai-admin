import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendReminderEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// GET /api/cron/reminders — Called by Vercel Cron daily at 08:00
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const d7date = new Date(now); d7date.setDate(d7date.getDate() + 7)
  const d1date = new Date(now); d1date.setDate(d1date.getDate() + 1)

  // Find enrollments where session is in 7 or 1 days
  const { rows } = await pool.query(
    `SELECT e.id, u.email, u.name,
            cs.title, cs.start_date, cs.location,
            cs.start_date::date AS session_date
     FROM enrollments e
     JOIN users u ON e.user_id = u.id
     JOIN course_sessions cs ON e.session_id = cs.id
     WHERE e.status = 'active'
       AND cs.start_date::date IN ($1::date, $2::date)`,
    [d7date.toISOString().split('T')[0], d1date.toISOString().split('T')[0]]
  )

  let sent = 0, failed = 0

  for (const row of rows) {
    const daysUntil = Math.round(
      (new Date(row.session_date).setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000
    )
    try {
      await sendReminderEmail({
        to: row.email,
        name: row.name,
        sessionTitle: row.title,
        startDate: row.start_date,
        location: row.location,
        daysUntil,
      })
      sent++
    } catch (err: any) {
      console.error(`Reminder email failed for ${row.email}:`, err.message)
      failed++
    }
  }

  return NextResponse.json({ sent, failed, total: rows.length })
}
