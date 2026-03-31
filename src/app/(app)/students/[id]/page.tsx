import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import ISAMSExportButton from '@/components/students/ISAMSExportButton'
import { formatDate, INCIDENT_TYPE_LABELS, STUDENT_ROLE_LABELS } from '@/lib/utils'
import type { Profile, Student, IncidentStudent, Incident } from '@/types/database'

type IncidentStudentWithIncident = IncidentStudent & { incident: Incident }

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { id } = await params

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single<Student>()

  if (!student) notFound()

  // GLCs only see students in their grade
  if (profile?.role === 'glc' && profile.grade && student.grade !== profile.grade) {
    redirect('/students')
  }

  const { data: involvements } = await supabase
    .from('incident_students')
    .select('*, incident: incidents (*)')
    .eq('student_id', id)
    .order('created_at', { foreignTable: 'incidents', ascending: false })
    .returns<IncidentStudentWithIncident[]>()

  // Stats
  const total = involvements?.length ?? 0
  const roleCounts: Record<string, number> = {}
  for (const inv of involvements ?? []) {
    roleCounts[inv.role] = (roleCounts[inv.role] ?? 0) + 1
  }
  const open = involvements?.filter(
    (inv) => inv.incident.status === 'open' || inv.incident.status === 'in_progress'
  ).length ?? 0

  const initials = student.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/students"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        All students
      </Link>

      {/* Student header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0">
            <span className="text-[#1B3A6B] text-xl font-semibold">{initials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1B3A6B]">{student.full_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {student.grade} · {student.year_group} · <span className="font-mono">{student.student_id}</span>
            </p>
          </div>
        </div>
        <ISAMSExportButton student={student} involvements={involvements ?? []} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-[#1B3A6B]">{total}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total incidents</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{open}</p>
          <p className="text-xs text-gray-400 mt-0.5">Open / in progress</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-[#1B3A6B]">
            {roleCounts['perpetrator'] ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">As perpetrator</p>
        </div>
      </div>

      {/* Role breakdown */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#1B3A6B] mb-3">
            Role breakdown
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(roleCounts).map(([role, count]) => (
              <div key={role} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">{STUDENT_ROLE_LABELS[role] ?? role}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incident history */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Incident history ({total})
        </h2>

        {total === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">No incidents recorded for this student.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Incident</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Severity</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {involvements!.map(({ incident, role, id: invId }) => (
                  <tr key={invId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="font-medium text-gray-900 hover:text-[#1B3A6B] transition-colors"
                      >
                        {incident.title}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {INCIDENT_TYPE_LABELS[incident.incident_type]}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {STUDENT_ROLE_LABELS[role] ?? role}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={incident.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(incident.incident_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
