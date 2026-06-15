export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import CorpClient from './CorpClient'

export default async function CorpPage() {
  const supabase = await createClient()
  const { data: courses } = await supabase.from('corp_courses').select('*').order('sort_order')
  return <CorpClient courses={courses ?? []} />
}
