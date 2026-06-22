import { getUserSession } from '@/lib/userauth'
import { redirect } from 'next/navigation'
import pool from '@/lib/db'
import UserDashboardClient from './UserDashboardClient'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getUserSession()
  if (!session) redirect('/user/login')

  const userId = session.id

  const { rows: enrollments } = await pool.query(
    `SELECT e.id, e.qr_token, e.checked_in_at, e.certificate_url, e.created_at,
            cs.title, cs.start_date, cs.end_date, cs.location,
            o.total_amount, o.payment_method, o.status as order_status
     FROM enrollments e
     JOIN course_sessions cs ON e.session_id = cs.id
     LEFT JOIN orders o ON e.order_id = o.id
     WHERE e.user_id = $1 AND e.status = 'active'
     ORDER BY cs.start_date DESC`,
    [userId]
  )

  return <UserDashboardClient user={session} enrollments={enrollments} />
}
