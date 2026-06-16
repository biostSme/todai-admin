export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import LeadsClient from './LeadsClient'

export default async function LeadsPage() {
  const { rows: leads } = await db.query(`SELECT * FROM leads ORDER BY created_at DESC`)
  return <LeadsClient leads={leads} />
}
