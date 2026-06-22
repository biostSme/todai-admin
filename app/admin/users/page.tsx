export const dynamic = 'force-dynamic'
import pool from '@/lib/db'
import UsersClient from './UsersClient'

export default async function Page() {
  const { rows: users } = await pool.query(
    `SELECT id, email, name, phone, role, email_verified, created_at FROM users ORDER BY created_at DESC`
  )
  return <UsersClient users={users} />
}
