'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { IncidentStatus, StudentRole, Profile } from '@/types/database'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

async function requireAdmin() {
  const { supabase, user } = await getUser()
  if (!user) return { error: 'Not authenticated' as string, supabase, user }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single<Pick<Profile, 'role'>>()
  if (profile?.role !== 'admin') return { error: 'Admin access required' as string, supabase, user }
  return { error: null, supabase, user }
}

// ── Update incident status ─────────────────────────────────────────────────
export async function updateIncidentStatus(incidentId: string, status: IncidentStatus) {
  const { supabase, user } = await getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('incidents')
    .update({ status })
    .eq('id', incidentId)

  if (error) return { error: error.message }
  revalidatePath(`/incidents/${incidentId}`)
  revalidatePath('/incidents')
  revalidatePath('/dashboard')
  return {}
}

// ── Upsert investigation checklist ────────────────────────────────────────
export interface ChecklistData {
  statements_taken: boolean
  statements_taken_date: string | null
  statements_taken_notes: string | null
  parents_contacted: boolean
  parents_contacted_date: string | null
  parents_contacted_notes: string | null
  referred_to_deputy: boolean
  referred_to_deputy_date: string | null
  referred_to_deputy_notes: string | null
  sanctions_applied: boolean
  sanctions_applied_date: string | null
  sanctions_applied_type: string | null
  sanctions_applied_notes: string | null
  follow_up_scheduled: boolean
  follow_up_scheduled_date: string | null
  follow_up_scheduled_notes: string | null
}

export async function saveChecklist(incidentId: string, data: ChecklistData) {
  const { supabase, user } = await getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('investigation_checklist')
    .upsert({ incident_id: incidentId, ...data }, { onConflict: 'incident_id' })

  if (error) return { error: error.message }
  revalidatePath(`/incidents/${incidentId}`)
  return {}
}

// ── Archive / unarchive incident ──────────────────────────────────────────
export async function archiveIncident(incidentId: string, archive: boolean) {
  const { error: authError, supabase } = await requireAdmin()
  if (authError) return { error: authError }

  const { error } = await supabase
    .from('incidents')
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq('id', incidentId)

  if (error) return { error: error.message }
  revalidatePath(`/incidents/${incidentId}`)
  revalidatePath('/incidents')
  revalidatePath('/dashboard')
  return {}
}

// ── Delete incident (admin only, permanent) ────────────────────────────────
export async function deleteIncident(incidentId: string) {
  const { error: authError, supabase } = await requireAdmin()
  if (authError) return { error: authError }

  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', incidentId)

  if (error) return { error: error.message }
  revalidatePath('/incidents')
  revalidatePath('/dashboard')
  redirect('/incidents')
}

// ── Add comment ────────────────────────────────────────────────────────────
export async function addComment(incidentId: string, body: string) {
  const { supabase, user } = await getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = body.trim()
  if (!trimmed) return { error: 'Comment cannot be empty' }

  const { error } = await supabase
    .from('comments')
    .insert({ incident_id: incidentId, author_id: user.id, body: trimmed })

  if (error) return { error: error.message }
  revalidatePath(`/incidents/${incidentId}`)
  return {}
}

// ── Update student role ────────────────────────────────────────────────────
export async function updateStudentRole(
  incidentStudentId: string,
  role: StudentRole,
  incidentId: string
) {
  const { supabase, user } = await getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('incident_students')
    .update({ role })
    .eq('id', incidentStudentId)

  if (error) return { error: error.message }
  revalidatePath(`/incidents/${incidentId}`)
  return {}
}

// ── Delete comment ─────────────────────────────────────────────────────────
export async function deleteComment(commentId: string, incidentId: string) {
  const { supabase, user } = await getUser()
  if (!user) return { error: 'Not authenticated' }

  // RLS will block deleting others' comments; this is just belt-and-braces
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/incidents/${incidentId}`)
  return {}
}
