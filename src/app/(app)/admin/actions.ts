'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/types/database'

// ─── Guard: only admins can call these ───────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<Pick<Profile, 'role'>>()

  if (profile?.role !== 'admin') throw new Error('Forbidden')
}

// ─── Create user ─────────────────────────────────────────────────────────────

export async function createUser(formData: FormData) {
  await requireAdmin()
  const admin = createAdminClient()

  const full_name = formData.get('full_name') as string
  const email = formData.get('email') as string
  const role = formData.get('role') as UserRole
  const grade = (formData.get('grade') as string) || null
  const password = formData.get('password') as string

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (error) return { error: error.message }

  // Update the profile row created by the trigger to set grade
  if (data.user && grade) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('profiles') as any).update({ grade }).eq('id', data.user.id)
  }

  revalidatePath('/admin')
  return { success: true }
}

// ─── Deactivate / reactivate user ────────────────────────────────────────────

export async function setUserBanned(userId: string, banned: boolean) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? '876600h' : 'none',
  })

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ─── Update user role / grade ─────────────────────────────────────────────────

export async function updateUser(formData: FormData) {
  await requireAdmin()
  const admin = createAdminClient()

  const userId = formData.get('userId') as string
  const role = formData.get('role') as UserRole
  const grade = (formData.get('grade') as string) || null
  const full_name = formData.get('full_name') as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('profiles') as any)
    .update({ role, grade, full_name })
    .eq('id', userId)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ─── CSV student upload ───────────────────────────────────────────────────────

export async function upsertStudents(
  rows: { full_name: string; grade: string; year_group: string; student_id: string }[]
) {
  await requireAdmin()
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await admin.from('students').upsert(rows as any, {
    onConflict: 'student_id',
  })

  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/students')
  return { count: rows.length }
}
