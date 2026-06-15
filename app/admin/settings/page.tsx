export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('site_settings').select('*')
  const settings: Record<string, string> = {}
  data?.forEach(row => { settings[row.key] = row.value })
  return <SettingsClient settings={settings} />
}
