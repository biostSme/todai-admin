export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import AlumniClient from './AlumniClient'

export default async function AlumniPage() {
  const [{ rows: people }, { rows: companies }, { rows: sectors }, { rows: courses }] = await Promise.all([
    db.query(`SELECT * FROM alumni ORDER BY sort_order`),
    db.query(`SELECT * FROM alumni_companies ORDER BY sort_order`),
    db.query(`SELECT name FROM sectors ORDER BY name`),
    db.query(`SELECT title_th FROM courses WHERE status IN ('open','upcoming') ORDER BY sort_order`),
  ])
  return (
    <AlumniClient
      people={people}
      companies={companies}
      sectors={sectors.map(s => s.name)}
      courses={courses.map(c => c.title_th)}
    />
  )
}
