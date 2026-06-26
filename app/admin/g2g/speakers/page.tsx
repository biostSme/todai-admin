export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import G2GClient from '../G2GClient'

export default async function SpeakersPage() {
  const { rows: speakers } = await db.query(`SELECT * FROM g2g_speakers ORDER BY sort_order, id`)
  return (
    <G2GClient
      settings={{}} speakers={speakers} entrepreneurs={[]}
      applications={[]} alumni={[]} team={[]} payments={[]}
      initialTab={1}
    />
  )
}
