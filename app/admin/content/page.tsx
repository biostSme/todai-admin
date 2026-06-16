export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import ContentClient from './ContentClient'

export default async function ContentPage() {
  const { rows } = await db.query(`SELECT key, value FROM content`)
  const content: Record<string, string> = {}
  rows.forEach((r: any) => { content[r.key] = r.value })
  return <ContentClient content={content} />
}
