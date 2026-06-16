export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import ArticlesClient from './ArticlesClient'

export default async function Page() {
  const { rows: articles } = await db.query(`SELECT * FROM articles ORDER BY sort_order`)
  return <ArticlesClient articles={articles} />
}
