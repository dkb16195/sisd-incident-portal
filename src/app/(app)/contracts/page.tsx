import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ExternalLink, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate, getIncidentTypeLabel } from '@/lib/utils'
import type { Profile, Student, Incident, IncidentStudent } from '@/types/database'

type ContractRow = {
  id: string
  sanctions_applied_date: string | null
  incident: (Incident & {
    incident_students: (IncidentStudent & { student: Student })[]
  }) | null
}

function reviewDate(startDate: string): Date {
  const d = new Date(startDate)
  d.setFullYear(d.getFullYear() + 1)
  return d
}

function contractStatus(startDate: string | null): 'no-date' | 'active' | 'due-soon' | 'expired' {
  if (!startDate) return 'no-date'
  const review = reviewDate(startDate)
  const now = new Date()
  const daysUntilReview = Math.floor((review.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilReview < 0) return 'expired'
  if (daysUntilReview <= 30) return 'due-soon'
  return 'active'
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

  // Query all checklists where sanction = behaviour_contract
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

  // Filter out archived incidents and apply GLC grade filter
  const rows = (rawRows ?? []).filter((row) => {
    if (!row.incident) return false
    if (row.incident.archived_at) return false
    if (isGLC && row.incident.grade !== profile!.grade) return false
    return true
  })

  // Expand to per-student rows
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
      // No students linked — still show the incident
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

  // Count active contracts per student (within 12 months of start date)
  const studentContractCount: Record<string, number> = {}
  for (const entry of entries) {
    if (!entry.student) continue
    const status = contractStatus(entry.startDate)
    if (status === 'active' || status === 'due-soon' || status === 'no-date') {
      studentContractCount[entry.student.id] = (studentContractCount[entry.student.id] ?? 0) + 1
    }
  }

  const activeCount = entries.filter((e) => {
    const s = contractStatus(e.startDate)
    return s === 'active' || s === 'due-soon'
  }).length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Behaviour Contracts</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {activeCount} active contract{activeCount !== 1 ? 's' : ''}
          {isGLC ? ` · ${profile!.grade}` : ''}
          {' '}· Maximum 3 per student in any 12-month period
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No behaviour contracts on record.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Student</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Incident</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Start date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">12-month review</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contracts (active)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry, idx) => {
                const status = contractStatus(entry.startDate)
                const review = entry.startDate ? reviewDate(entry.startDate) : null
                const now = new Date()
                const daysRemaining = review
                  ? Math.floor((review.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  : null
                const activeContracts = entry.student
                  ? (studentContractCount[entry.student.id] ?? 0)
                  : null

                return (
                  <tr key={`${entry.contractId}-${entry.student?.id ?? idx}`} className="hover:bg-gray-50 transition-colors">
                    {/* Student */}
                    <td className="px-5 py-4">
                      {entry.student ? (
                        <Link
                          href={`/students/${entry.student.id}`}
                          className="group flex items-start gap-1"
                        >
                          <div>
                            <p className="font-medium text-gray-900 group-hover:text-[#1B3A6B] transition-colors">
                              {entry.student.full_name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {entry.student.grade} · {entry.student.year_group}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <span className="text-gray-400 italic">No student linked</span>
                      )}
                    </td>

                    {/* Incident */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/incidents/${entry.incident.id}`}
                        className="group flex items-start gap-1"
                      >
                        <div>
                          <p className="text-gray-800 group-hover:text-[#1B3A6B] transition-colors leading-snug">
                            {entry.incident.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {getIncidentTypeLabel(entry.incident.incident_type, entry.incident.custom_incident_type)}
                            {' '}· {entry.incident.grade}
                            {' '}· {formatDate(entry.incident.incident_date)}
                          </p>
                        </div>
                        <ExternalLink size={11} className="text-gray-300 group-hover:text-[#1B3A6B] mt-0.5 shrink-0 transition-colors" />
                      </Link>
                    </td>

                    {/* Start date */}
                    <td className="px-5 py-4 text-gray-700">
                      {entry.startDate ? formatDate(entry.startDate) : (
                        <span className="text-amber-600 text-xs font-medium">Not recorded</span>
                      )}
                    </td>

                    {/* Review date */}
                    <td className="px-5 py-4">
                      {review ? (
                        <div>
                          <p className={status === 'expired' ? 'text-gray-400 line-through' : 'text-gray-700'}>
                            {formatDate(review.toISOString())}
                          </p>
                          {status !== 'expired' && daysRemaining !== null && (
                            <p className={`text-xs mt-0.5 ${status === 'due-soon' ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      {status === 'active' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          Active
                        </span>
                      )}
                      {status === 'due-soon' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle size={10} />
                          Review due
                        </span>
                      )}
                      {status === 'expired' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                          Expired
                        </span>
                      )}
                      {status === 'no-date' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                          Date needed
                        </span>
                      )}
                    </td>

                    {/* Contract count */}
                    <td className="px-5 py-4">
                      {activeContracts !== null ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map((n) => (
                              <div
                                key={n}
                                className={`w-3 h-3 rounded-sm ${
                                  n <= activeContracts
                                    ? activeContracts >= 3
                                      ? 'bg-red-500'
                                      : activeContracts === 2
                                      ? 'bg-amber-400'
                                      : 'bg-[#1B3A6B]'
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-xs font-medium ${
                            activeContracts >= 3 ? 'text-red-600' : activeContracts === 2 ? 'text-amber-600' : 'text-gray-500'
                          }`}>
                            {activeContracts}/3
                            {activeContracts >= 3 && ' — limit reached'}
                            {activeContracts === 2 && ' — one remaining'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
