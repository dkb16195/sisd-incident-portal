import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import IncidentFilters from '@/components/incidents/IncidentFilters'
import IncidentTable from '@/components/incidents/IncidentTable'
import Button from '@/components/ui/Button'
import type { Profile, IncidentWithStudents } from '@/types/database'

interface SearchParams {
  status?: string
  severity?: string
  grade?: string
  type?: string
  q?: string
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  const params = await searchParams

  // Build query
  let query = supabase
    .from('incidents')
    .select(`
      *,
      incident_students (
        *,
        student: students (*)
      ),
      logged_by_profile: profiles!incidents_logged_by_fkey (*),
      investigation_checklist (*)
    `)
    .order('created_at', { ascending: false })

  // GLCs only see their own grade
  if (profile?.role === 'glc' && profile.grade) {
    query = query.eq('grade', profile.grade)
  }

  if (params.status) query = query.eq('status', params.status as any)
  if (params.severity) query = query.eq('severity', params.severity as any)
  if (params.grade && profile?.role !== 'glc') query = query.eq('grade', params.grade)
  if (params.type) query = query.eq('incident_type', params.type as any)
  if (params.q) query = query.ilike('title', `%${params.q}%`)

  const { data: incidents } = await query.returns<IncidentWithStudents[]>()

  const canChooseGrade = profile?.role !== 'glc'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A6B]">Incidents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {incidents?.length ?? 0} record{incidents?.length !== 1 ? 's' : ''}
            {profile?.role === 'glc' && profile.grade ? ` · ${profile.grade}` : ''}
          </p>
        </div>
        <Link href="/incidents/new">
          <Button>
            <Plus size={16} />
            Log incident
          </Button>
        </Link>
      </div>

      <IncidentFilters
        canChooseGrade={canChooseGrade}
        currentParams={params}
      />

      <IncidentTable
        incidents={incidents ?? []}
        currentUserId={user.id}
        userRole={profile?.role ?? 'glc'}
      />
    </div>
  )
}
