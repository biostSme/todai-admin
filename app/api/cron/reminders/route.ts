import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

// GET /api/cron/reminders — Called by Vercel Cron daily
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: true,
    auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASS },
  })

  const now = new Date()
  const d7 = new Date(now); d7.setDate(d7.getDate() + 7)
  const d1 = new Date(now); d1.setDate(d1.getDate() + 1)

  // Fetch pending emails due now
  const { rows: pending } = await pool.query(
    `SELECT eq.*, cs.title as session_title, cs.start_date, cs.location
     FROM email_queue eq
     LEFT JOIN course_sessions cs ON (eq.template_data->>'session_id')::int = cs.id
     WHERE eq.status = 'pending' AND eq.send_at <= NOW()
     LIMIT 50`
  )

  let sent = 0, failed = 0
  for (const job of pending) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: job.to_email,
        subject: job.subject,
        html: buildEmailHtml(job.template, job.template_data, job),
      })
      await pool.query('UPDATE email_queue SET status=$1, sent_at=NOW() WHERE id=$2', ['sent', job.id])
      sent++
    } catch (err: any) {
      await pool.query('UPDATE email_queue SET status=$1, error=$2 WHERE id=$3', ['failed', err.message, job.id])
      failed++
    }
  }

  // Queue upcoming reminders (7d and 1d before session)
  const { rows: upcoming } = await pool.query(
    `SELECT e.id as enrollment_id, e.user_id, u.email, u.name, e.session_id, cs.title, cs.start_date, cs.location
     FROM enrollments e
     JOIN users u ON e.user_id = u.id
     JOIN course_sessions cs ON e.session_id = cs.id
     WHERE e.status = 'active' AND cs.start_date IN ($1::date, $2::date)`,
    [d7.toISOString().split('T')[0], d1.toISOString().split('T')[0]]
  )

  for (const row of upcoming) {
    const daysUntil = Math.round((new Date(row.start_date).getTime() - now.getTime()) / 86400000)
    const template = daysUntil >= 6 ? 'reminder_7d' : 'reminder_1d'
    const send_at = new Date(now); send_at.setHours(8, 0, 0, 0)

    await pool.query(
      `INSERT INTO email_queue (to_email, subject, template, template_data, send_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT DO NOTHING`,
      [row.email, `เตือนความจำ: ${row.title} ใน ${daysUntil} วัน`, template, JSON.stringify({ session_id: row.session_id, enrollment_id: row.enrollment_id, name: row.name }), send_at]
    )
  }

  return NextResponse.json({ sent, failed, queued: upcoming.length })
}

function buildEmailHtml(template: string, data: any, job: any): string {
  const title = job.session_title || ''
  const date = job.start_date ? new Date(job.start_date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''
  const name = data?.name || 'คุณ'

  if (template === 'reminder_7d') {
    return `<p>สวัสดีคุณ${name},</p><p>อีก 7 วันจะถึงวันอบรม <strong>${title}</strong><br>วันที่: ${date}<br>สถานที่: ${job.location || '-'}</p><p>โปรดเตรียมตัวให้พร้อม!</p>`
  }
  if (template === 'reminder_1d') {
    return `<p>สวัสดีคุณ${name},</p><p>พรุ่งนี้แล้ว! <strong>${title}</strong><br>วันที่: ${date}<br>สถานที่: ${job.location || '-'}</p><p>พบกันพรุ่งนี้นะคะ</p>`
  }
  return `<p>${job.subject}</p>`
}
