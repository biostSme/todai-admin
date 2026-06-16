export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import CorpClient from './CorpClient'

export default async function Page() {
  const { rows: courses } = await db.query(`SELECT * FROM corp_courses ORDER BY sort_order`)
  return <CorpClient courses={courses} />
}
