export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const { rows: team } = await db.query(`SELECT * FROM team ORDER BY sort_order`)
  return <TeamClient team={team} />
}
