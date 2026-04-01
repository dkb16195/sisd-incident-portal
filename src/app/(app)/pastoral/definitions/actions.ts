'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export async function updateFlagDefinition(
  id: string,
  updates: {
    title?: string
    what_it_means?: string
    why_it_matters?: string
    suggested_action?: string
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<Pick<Profile, 'role'>>()

  if (profile?.role !== 'admin') return { error: 'Admin access required' }

  const { error } = await supabase
    .from('pastoral_flag_definitions')
    .update({ ...updates, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/pastoral/definitions')
  return {}
}
