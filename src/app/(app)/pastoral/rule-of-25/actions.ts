'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markStageSent(
  student: string,
  gradeCode: string,
  academicYear: string,
  eventType: 'Intervention' | 'Late',
  stageSent: string,
  notes?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('pastoral_rule25_sent_log')
    .insert({
      student,
      grade_code: gradeCode,
      academic_year: academicYear,
      event_type: eventType,
      stage_sent: stageSent,
      sent_by: user.id,
      notes: notes ?? null,
    })

  if (error) return { error: error.message }

  revalidatePath('/pastoral/rule-of-25')
  revalidatePath('/pastoral/weekly-changes')
  return {}
}
