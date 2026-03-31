import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewIncidentForm from '@/components/incidents/NewIncidentForm'
import type { Profile } from '@/types/database'

export default async function NewIncidentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Log new incident</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete all three steps to create an incident record.
        </p>
      </div>

      <NewIncidentForm
        userGrade={profile?.grade ?? null}
        userRole={profile?.role ?? 'glc'}
      />
    </div>
  )
}
