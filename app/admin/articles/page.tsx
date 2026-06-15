import { createClient } from '@/lib/supabase/server'
import ArticlesClient from './ArticlesClient'

export default async function ArticlesPage() {
  const supabase = await createClient()
  const { data: articles } = await supabase.from('articles').select('*').order('sort_order')
  return <ArticlesClient articles={articles ?? []} />
}
