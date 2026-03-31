import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import IncidentStatusSelect from '@/components/incidents/IncidentStatusSelect'
import InvestigationChecklist from '@/components/incidents/InvestigationChecklist'
import CommentThread from '@/components/incidents/CommentThread'
import StudentRoleList from '@/components/incidents/StudentRoleList'
import IncidentAdminActions from '@/components/incidents/IncidentAdminActions'
import { formatDate, getIncidentTypeLabel } from '@/lib/utils'
import type { Profile, IncidentWithStudents, CommentWithAuthor } from '@/types/database'

export default async function IncidentDetailPage({
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

  const { data: incident } = await supabase
    .from('incidents')
    .select(`
      *,
      incident_students (
        *,
        student: students (*)
      ),
      logged_by_profile: profiles!incidents_logged_by_fkey (*),
      assigned_to_profile: profiles!incidents_assigned_to_fkey (*),
      investigation_checklist (*)
    `)
    .eq('id', id)
    .single<IncidentWithStudents>()

  if (!incident) notFound()

  // GLCs can only view incidents for their own grade
  if (profile?.role === 'glc' && profile.grade && incident.grade !== profile.grade) {
    redirect('/incidents')
  }

  const { data: comments } = await supabase
    .from('comments')
    .select('*, author: profiles!comments_author_id_fkey (*)')
    .eq('incident_id', id)
    .order('created_at', { ascending: true })
    .returns<CommentWithAuthor[]>()

  const loggedBy = incident.logged_by_profile
  const isAdmin = profile?.role === 'admin'
  const isArchived = !!incident.archived_at

  return (
    <div className="p-8 max-w-4xl">
      {/* Back nav */}
      <Link
        href="/incidents"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        All incidents
      </Link>

      {/* Archived banner */}
      {isArchived && (
        <div className="mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
          <span className="font-medium">Archived</span>
          <span className="text-amber-600">— this incident has been archived and is hidden from the main list.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A6B] leading-tight mb-2">
            {incident.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            <span className="text-xs text-gray-400">
              {getIncidentTypeLabel(incident.incident_type, incident.custom_incident_type)} · {incident.grade}
            </span>
          </div>
        </div>

        {/* Status control */}
        <div className="shrink-0">
          <IncidentStatusSelect
            incidentId={incident.id}
            currentStatus={incident.status}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content — left 2 cols */}
        <div className="col-span-2 space-y-6">

          {/* Incident details */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#1B3A6B] mb-4">
              Incident details
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-gray-400">Date</dt>
                <dd className="col-span-2 text-gray-800">
                  {formatDate(incident.incident_date)}
                  {incident.incident_time ? ` at ${incident.incident_time}` : ''}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-gray-400">Location</dt>
                <dd className="col-span-2 text-gray-800">{incident.location}</dd>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-gray-400">Grade</dt>
                <dd className="col-span-2 text-gray-800">{incident.grade}</dd>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-gray-400">Logged by</dt>
                <dd className="col-span-2 text-gray-800">
                  {loggedBy?.full_name ?? '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1.5">Description</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {incident.description}
              </p>
            </div>
          </section>

          {/* Investigation checklist */}
          <InvestigationChecklist
            incidentId={incident.id}
            checklist={incident.investigation_checklist ?? null}
          />

          {/* Comments */}
          <CommentThread
            incidentId={incident.id}
            comments={comments ?? []}
            currentUserId={user.id}
          />
        </div>

        {/* Sidebar — right col */}
        <div className="space-y-4">

          {/* Students involved */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#1B3A6B] mb-3">
              Students ({incident.incident_students?.length ?? 0})
            </h2>
            <StudentRoleList
              incidentId={incident.id}
              incidentStudents={incident.incident_students ?? []}
            />
          </section>

          {/* Meta */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 text-xs text-gray-400 space-y-1.5">
            <p>
              <span className="font-medium text-gray-500">Created</span>{' '}
              {formatDate(incident.created_at)}
            </p>
            <p>
              <span className="font-medium text-gray-500">Updated</span>{' '}
              {formatDate(incident.updated_at)}
            </p>
            <p className="font-mono text-gray-300 break-all">{incident.id}</p>
          </section>

          {/* Admin actions */}
          {isAdmin && (
            <IncidentAdminActions
              incidentId={incident.id}
              isArchived={isArchived}
            />
          )}
        </div>
      </div>
    </div>
  )
}
