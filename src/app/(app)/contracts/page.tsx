import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContractsDashboard from '@/components/contracts/ContractsDashboard'
import type { Profile, Student, Incident, IncidentStudent } from '@/types/database'

type ContractRow = {
  id: string
  sanctions_applied_date: string | null
  incident: (Incident & {
    incident_students: (IncidentStudent & { student: Student })[]
  }) | null
}

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  const isGLC = profile?.role === 'glc' && !!profile.grade

  let clQuery = supabase
    .from('investigation_checklist')
    .select(`
      id,
      sanctions_applied_date,
      incident: incidents!investigation_checklist_incident_id_fkey (
        id, title, incident_type, custom_incident_type, grade, status, incident_date, archived_at,
        incident_students (
          student_id, role,
          student: students (id, full_name, grade, year_group, student_id)
        )
      )
    `)
    .eq('sanctions_applied_type', 'behaviour_contract')
    .order('sanctions_applied_date', { ascending: false })

  const { data: rawRows } = await clQuery.returns<ContractRow[]>()

  const rows = (rawRows ?? []).filter((row) => {
    if (!row.incident) return false
    if (row.incident.archived_at) return false
    if (isGLC && row.incident.grade !== profile!.grade) return false
    return true
  })

  type ContractEntry = {
    contractId: string
    startDate: string | null
    incident: NonNullable<ContractRow['incident']>
    student: Student | null
    studentRole: string | null
  }

  const entries: ContractEntry[] = []
  for (const row of rows) {
    if (!row.incident) continue
    if (row.incident.incident_students.length === 0) {
      entries.push({
        contractId: row.id,
        startDate: row.sanctions_applied_date,
        incident: row.incident,
        student: null,
        studentRole: null,
      })
    } else {
      for (const is of row.incident.incident_students) {
        entries.push({
          contractId: row.id,
          startDate: row.sanctions_applied_date,
          incident: row.incident,
          student: is.student,
          studentRole: is.role,
        })
      }
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Behaviour Contracts</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isGLC ? `${profile!.grade} · ` : ''}Maximum 3 per student in any 12-month period
        </p>
      </div>

      <ContractsDashboard
        entries={entries}
        canChooseGrade={!isGLC}
      />
    </div>
  )
}
