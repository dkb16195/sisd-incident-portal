'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { IncidentType, IncidentSeverity, StudentRole } from '@/types/database'

export interface NewIncidentData {
  title: string
  incident_type: IncidentType
  severity: IncidentSeverity
  incident_date: string
  incident_time?: string
  location: string
  grade: string
  description: string
  students: { student_id: string; role: StudentRole }[]
}

export async function createIncident(data: NewIncidentData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Insert incident
  const { data: incident, error } = await supabase
    .from('incidents')
    .insert({
      title: data.title,
      incident_type: data.incident_type,
      severity: data.severity,
      incident_date: data.incident_date,
      incident_time: data.incident_time || null,
      location: data.location,
      grade: data.grade,
      description: data.description,
      logged_by: user.id,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Link students
  if (data.students.length > 0) {
    const { error: studentsError } = await supabase
      .from('incident_students')
      .insert(
        data.students.map((s) => ({
          incident_id: incident.id,
          student_id: s.student_id,
          role: s.role,
        }))
      )
    if (studentsError) return { error: studentsError.message }
  }

  revalidatePath('/incidents')
  revalidatePath('/dashboard')
  redirect(`/incidents/${incident.id}`)
}
