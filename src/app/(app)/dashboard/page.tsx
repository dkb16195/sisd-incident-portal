import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import IncidentsByTypeChart from '@/components/dashboard/IncidentsByTypeChart'
import IncidentsTrendChart from '@/components/dashboard/IncidentsTrendChart'
import SeverityBreakdown from '@/components/dashboard/SeverityBreakdown'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { formatDate, isOverdue, INCIDENT_TYPE_LABELS } from '@/lib/utils'
import type { Profile, Incident } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  // Date helpers
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const isGLC = profile?.role === 'glc' && !!profile.grade
  const glcGrade = profile?.grade ?? ''

  // Stat queries in parallel
  const [
    { count: openCount },
    { count: thisWeekCount },
    { count: resolvedMonthCount },
    { data: allRecentIncidents },
    { data: thirtyDayIncidents },
  ] = await Promise.all([
    (isGLC
      ? supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('grade', glcGrade)
      : supabase.from('incidents').select('*', { count: 'exact', head: true })
    ).in('status', ['open', 'in_progress']),

    (isGLC
      ? supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('grade', glcGrade)
      : supabase.from('incidents').select('*', { count: 'exact', head: true })
    ).gte('created_at', startOfWeek.toISOString()),

    (isGLC
      ? supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('grade', glcGrade)
      : supabase.from('incidents').select('*', { count: 'exact', head: true })
    ).eq('status', 'resolved').gte('updated_at', startOfMonth.toISOString()),

    (isGLC
      ? supabase.from('incidents')
          .select('id, title, severity, status, incident_type, incident_date, created_at, grade')
          .eq('grade', glcGrade)
      : supabase.from('incidents')
          .select('id, title, severity, status, incident_type, incident_date, created_at, grade')
    ).in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<Incident[]>(),

    (isGLC
      ? supabase.from('incidents')
          .select('id, incident_type, severity, created_at, incident_date')
          .eq('grade', glcGrade)
      : supabase.from('incidents')
          .select('id, incident_type, severity, created_at, incident_date')
    ).gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })
      .returns<Incident[]>(),
  ])

  const overdueCount = allRecentIncidents?.filter(
    (i) => isOverdue(i.created_at, i.status)
  ).length ?? 0

  // Build trend data — incidents per day for last 30 days
  const trendMap: Record<string, number> = {}
  for (let d = 0; d < 30; d++) {
    const date = new Date(thirtyDaysAgo)
    date.setDate(thirtyDaysAgo.getDate() + d)
    trendMap[date.toISOString().split('T')[0]] = 0
  }
  for (const inc of thirtyDayIncidents ?? []) {
    const day = inc.created_at.split('T')[0]
    if (day in trendMap) trendMap[day] = (trendMap[day] ?? 0) + 1
  }
  const trendData = Object.entries(trendMap).map(([date, count]) => ({
    date,
    count,
  }))

  // Incidents by type
  const typeMap: Record<string, number> = {}
  for (const inc of thirtyDayIncidents ?? []) {
    typeMap[inc.incident_type] = (typeMap[inc.incident_type] ?? 0) + 1
  }
  const typeData = Object.entries(typeMap)
    .map(([type, count]) => ({ type: INCIDENT_TYPE_LABELS[type] ?? type, count }))
    .sort((a, b) => b.count - a.count)

  // Severity breakdown (last 30 days)
  const severityMap: Record<string, number> = {}
  for (const inc of thirtyDayIncidents ?? []) {
    severityMap[inc.severity] = (severityMap[inc.severity] ?? 0) + 1
  }
  const severityData = [
    { severity: 'critical', count: severityMap['critical'] ?? 0 },
    { severity: 'high', count: severityMap['high'] ?? 0 },
    { severity: 'medium', count: severityMap['medium'] ?? 0 },
    { severity: 'low', count: severityMap['low'] ?? 0 },
  ]

  const statCards = [
    {
      label: 'Open incidents',
      value: openCount ?? 0,
      icon: Clock,
      colour: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Opened this week',
      value: thisWeekCount ?? 0,
      icon: TrendingUp,
      colour: 'text-[#1B3A6B]',
      bg: 'bg-[#1B3A6B]/5',
    },
    {
      label: 'Overdue (>14 days)',
      value: overdueCount,
      icon: AlertTriangle,
      colour: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Resolved this month',
      value: resolvedMonthCount ?? 0,
      icon: CheckCircle,
      colour: 'text-green-600',
      bg: 'bg-green-50',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Welcome back, {profile?.full_name}
          {profile?.role === 'glc' && profile.grade ? ` · ${profile.grade}` : ''}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, colour, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${colour}`}>{value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={18} className={colour} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Incidents logged — last 30 days
          </h2>
          <IncidentsTrendChart data={trendData} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Severity breakdown
          </h2>
          <SeverityBreakdown data={severityData} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* By type chart */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
            By incident type — last 30 days
          </h2>
          {typeData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No incidents in this period.</p>
          ) : (
            <IncidentsByTypeChart data={typeData} />
          )}
        </div>

        {/* Open incidents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Needs attention
            </h2>
            <Link href="/incidents?status=open" className="text-xs text-[#1B3A6B] hover:underline">
              View all
            </Link>
          </div>

          {!allRecentIncidents?.length ? (
            <p className="text-sm text-gray-400 text-center py-6">No open incidents.</p>
          ) : (
            <ul className="space-y-3">
              {allRecentIncidents.map((incident) => (
                <li key={incident.id}>
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="block group"
                  >
                    <div className="flex items-start gap-2">
                      {isOverdue(incident.created_at, incident.status) && (
                        <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm font-medium text-gray-800 group-hover:text-[#1B3A6B] transition-colors leading-snug truncate">
                        {incident.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                      <span className="text-xs text-gray-400">{formatDate(incident.incident_date)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
