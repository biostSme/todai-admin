export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import G2GClient from '../G2GClient'

export default async function ApplicationsPage() {
  const [{ rows: applications }, { rows: alumni }, { rows: team }] = await Promise.all([
    db.query(`SELECT * FROM g2g_applications ORDER BY created_at DESC`),
    db.query(`SELECT id, name_th, role_th, company_th, avatar_url, gen, courses FROM alumni ORDER BY sort_order, id`),
    db.query(`SELECT id, name_th, role_th, avatar_url FROM team ORDER BY sort_order, id`),
  ])
  return (
    <G2GClient
      settings={{}} speakers={[]} entrepreneurs={[]}
      applications={applications} alumni={alumni} team={team} payments={[]}
      initialTab={3}
    />
  )
}
