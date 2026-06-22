export const dynamic = 'force-dynamic'
import pool from '@/lib/db'
import SessionsClient from './SessionsClient'

export default async function Page() {
  const { rows: sessions } = await pool.query(`
    SELECT cs.*,
      (SELECT COUNT(*) FROM enrollments e WHERE e.session_id = cs.id AND e.status='active') as enrolled_count
    FROM course_sessions cs ORDER BY cs.start_date DESC
  `)
  return <SessionsClient sessions={sessions} />
}
