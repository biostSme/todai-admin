export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import G2GTeamClient from './G2GTeamClient'

export default async function G2GTeamPage() {
  let rows: any[] = []
  try {
    const res = await db.query(`SELECT * FROM g2g_team ORDER BY sort_order, id`)
    rows = res.rows
  } catch {
    // table not yet created — first GET /api/g2g-team will create it
  }
  return <G2GTeamClient initial={rows} />
}
