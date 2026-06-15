export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ContentClient from './ContentClient'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('site_content').select('*')
  const content: Record<string, string> = {}
  data?.forEach(row => { content[row.key] = row.value })
  return <ContentClient content={content} />
}
