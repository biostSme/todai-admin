import { createClient } from '@/lib/supabase/server'
import CoursesClient from './CoursesClient'

export default async function CoursesPage() {
  const supabase = await createClient()
  const { data: courses } = await supabase.from('courses').select('*').order('sort_order')
  return <CoursesClient courses={courses ?? []} />
}
