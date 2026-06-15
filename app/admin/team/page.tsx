export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: team } = await supabase.from('team').select('*').order('sort_order')
  return <TeamClient team={team ?? []} />
}
