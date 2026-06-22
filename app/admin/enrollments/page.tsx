export const dynamic = 'force-dynamic'
import pool from '@/lib/db'
import EnrollmentsClient from './EnrollmentsClient'

export default async function Page() {
  const { rows: sessions } = await pool.query(
    `SELECT id, title, start_date FROM course_sessions ORDER BY start_date DESC`
  )
  const { rows: enrollments } = await pool.query(`
    SELECT e.id, e.qr_token, e.checked_in_at, e.status, e.created_at,
           u.name, u.email, u.phone,
           cs.title as session_title, cs.start_date,
           o.total_amount, o.payment_method, o.status as order_status
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN course_sessions cs ON e.session_id = cs.id
    LEFT JOIN orders o ON e.order_id = o.id
    ORDER BY e.created_at DESC
    LIMIT 200
  `)
  return <EnrollmentsClient enrollments={enrollments} sessions={sessions} />
}
