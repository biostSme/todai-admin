export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const { rows } = await db.query(`SELECT key, value FROM settings`)
  const settings: Record<string, string> = {}
  rows.forEach((r: any) => { settings[r.key] = r.value })
  return <SettingsClient settings={settings} />
}
