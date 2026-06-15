import { createClient } from '@/lib/supabase/server'
import AlumniClient from './AlumniClient'

export default async function AlumniPage() {
  const supabase = await createClient()
  const [{ data: people }, { data: companies }] = await Promise.all([
    supabase.from('alumni').select('*').order('sort_order'),
    supabase.from('alumni_companies').select('*').order('sort_order'),
  ])
  return <AlumniClient people={people ?? []} companies={companies ?? []} />
}
