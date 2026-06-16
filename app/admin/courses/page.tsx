export const dynamic = 'force-dynamic'
import db from '@/lib/db'
import CoursesClient from './CoursesClient'

export default async function Page() {
  const { rows: courses } = await db.query(`SELECT * FROM courses ORDER BY sort_order`)
  return <CoursesClient courses={courses} />
}
