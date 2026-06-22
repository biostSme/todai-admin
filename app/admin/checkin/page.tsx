export const dynamic = 'force-dynamic'
import pool from '@/lib/db'
import CheckinClient from './CheckinClient'

export default async function Page() {
  const { rows: sessions } = await pool.query(
    `SELECT id, title, start_date FROM course_sessions WHERE status IN ('open','full','closed') ORDER BY start_date DESC`
  )
  return <CheckinClient sessions={sessions} />
}
