export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import G2GClient from '../G2GClient'

export default async function EntrepreneursPage() {
  const { rows: entrepreneurs } = await db.query(`SELECT * FROM g2g_entrepreneurs ORDER BY sort_order, id`)
  return (
    <G2GClient
      settings={{}} speakers={[]} entrepreneurs={entrepreneurs}
      applications={[]} alumni={[]} team={[]} payments={[]}
      initialTab={2}
    />
  )
}
