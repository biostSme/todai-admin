export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import G2GClient from '../G2GClient'

export default async function PaymentsPage() {
  const { rows: payments } = await db.query(
    `SELECT p.*, a.firstname, a.lastname, a.business_name, a.email
     FROM g2g_payments p
     LEFT JOIN g2g_applications a ON a.id=p.application_id
     ORDER BY p.created_at DESC`
  )
  return (
    <G2GClient
      settings={{}} speakers={[]} entrepreneurs={[]}
      applications={[]} alumni={[]} team={[]} payments={payments}
      initialTab={4}
    />
  )
}
