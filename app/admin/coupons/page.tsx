export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import CouponsClient from './CouponsClient'

export default async function CouponsPage() {
  const { rows: coupons } = await db.query(`SELECT * FROM coupons ORDER BY created_at DESC`)
  return <CouponsClient coupons={coupons} />
}
