export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import G2GClient from './G2GClient'

export default async function G2GPage() {
  const [
    { rows: settingsRows },
    { rows: speakers },
    { rows: entrepreneurs },
    { rows: applications },
    { rows: alumni },
    { rows: team },
  ] = await Promise.all([
    db.query(`SELECT key, value FROM g2g_settings`),
    db.query(`SELECT * FROM g2g_speakers ORDER BY sort_order, id`),
    db.query(`SELECT * FROM g2g_entrepreneurs ORDER BY sort_order, id`),
    db.query(`SELECT * FROM g2g_applications ORDER BY created_at DESC`),
    db.query(`SELECT id, name_th, name_en, role_th, company_th, avatar_url, gen, courses FROM alumni ORDER BY sort_order, id`),
    db.query(`SELECT id, name_th, role_th, avatar_url FROM team ORDER BY sort_order, id`),
  ])

  const settings: Record<string, string> = {}
  settingsRows.forEach(r => { settings[r.key] = r.value })

  return (
    <G2GClient
      settings={settings}
      speakers={speakers}
      entrepreneurs={entrepreneurs}
      applications={applications}
      alumni={alumni}
      team={team}
    />
  )
}
