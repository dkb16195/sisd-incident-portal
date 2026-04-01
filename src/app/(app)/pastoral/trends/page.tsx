import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveDateRange, movingAverage, PASTORAL_GRADES } from '@/lib/pastoral/utils'
import GlobalFilters from '@/components/pastoral/GlobalFilters'
import TrendsChart from '@/components/pastoral/TrendsChart'
import ExportButton from '@/components/pastoral/ExportButton'
import type { Profile } from '@/types/database'
import type { PastoralEvent, PastoralFilters, FilterOptions, TrendPoint, GroupByRow } from '@/types/pastoral'
import { fetchAllRows } from '@/lib/supabase/fetchAll'

interface SearchParams extends PastoralFilters {
  groupBy?: string
  showMA?: string
  inverseView?: string
}

export default async function TrendsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  const params = await searchParams
  const { from, to } = resolveDateRange(params)
  const groupBy = params.groupBy ?? 'student'
  const showMA = params.showMA === '1'
  const inverseView = params.inverseView === '1'

  // Fetch filtered events — paginated to bypass PostgREST max-rows limit
  type EventRow = Pick<PastoralEvent, 'student' | 'grade_code' | 'form' | 'subject' | 'teacher' | 'event_type' | 'event_date'>
  const events = await fetchAllRows<EventRow>((rangeFrom, rangeTo) => {
    let q = supabase
      .from('pastoral_events')
      .select('student, grade_code, form, subject, teacher, event_type, event_date')
      .gte('event_date', from)
      .lte('event_date', to)
    if (params.grade) q = q.eq('grade_code', params.grade)
    if (params.form) q = q.eq('form', params.form)
    if (params.subject) q = q.eq('subject', params.subject)
    if (params.teacher) q = q.eq('teacher', params.teacher)
    if (params.student) q = q.ilike('student', `%${params.student}%`)
    return q.range(rangeFrom, rangeTo).returns<EventRow[]>()
  })

  // Build daily buckets
  const dayMap = new Map<string, { interventions: number; housePoints: number; lates: number }>()
  // Populate all days in range
  const fromDate = new Date(from)
  const toDate = new Date(to)
  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0]
    dayMap.set(key, { interventions: 0, housePoints: 0, lates: 0 })
  }

  for (const ev of events) {
    const day = ev.event_date
    if (!dayMap.has(day)) continue
    const bucket = dayMap.get(day)!
    if (ev.event_type === 'Intervention') bucket.interventions++
    if (ev.event_type === 'HousePoint') bucket.housePoints++
    if (ev.event_type === 'Late') bucket.lates++
  }

  const sortedDays = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b))
  const intervSeries = sortedDays.map(([, v]) => v.interventions)
  const hpSeries = sortedDays.map(([, v]) => v.housePoints)
  const ma7Interv = movingAverage(intervSeries)
  const ma7HP = movingAverage(hpSeries)

  const trendData: TrendPoint[] = sortedDays.map(([date, v], i) => ({
    date,
    interventions: v.interventions,
    housePoints: v.housePoints,
    lates: v.lates,
    ma7_interventions: ma7Interv[i] ?? undefined,
    ma7_housePoints: ma7HP[i] ?? undefined,
  }))

  // Group-by aggregation
  const groupByKey = (ev: EventRow): string => {
    switch (groupBy) {
      case 'grade': return ev.grade_code
      case 'form': return ev.form
      case 'subject': return ev.subject || '(none)'
      case 'teacher': return ev.teacher || '(none)'
      default: return ev.student
    }
  }

  const groupMap = new Map<string, GroupByRow>()
  for (const ev of events) {
    const key = groupByKey(ev)
    if (!groupMap.has(key)) groupMap.set(key, { label: key, interventions: 0, housePoints: 0, lates: 0, total: 0 })
    const row = groupMap.get(key)!
    if (ev.event_type === 'Intervention') { row.interventions++; row.total++ }
    if (ev.event_type === 'HousePoint') { row.housePoints++; row.total++ }
    if (ev.event_type === 'Late') { row.lates++; row.total++ }
  }

  const groupByData = Array.from(groupMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 100) // cap for performance

  // Filter options — derive from already-fetched events to avoid a second round-trip
  const options: FilterOptions = {
    grades: [...PASTORAL_GRADES],
    forms: [...new Set(events.map((r) => r.form))].sort(),
    subjects: [...new Set(events.map((r) => r.subject).filter(Boolean))].sort(),
    teachers: [...new Set(events.map((r) => r.teacher).filter(Boolean))].sort(),
  }

  const currentFilters: PastoralFilters = {
    preset: params.preset,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    grade: params.grade,
    form: params.form,
    subject: params.subject,
    teacher: params.teacher,
    student: params.student,
  }

  const exportHeaders = ['Group', 'Interventions', 'House Points', 'Lates', 'Total']
  const exportRows = groupByData.map((r) => [r.label, String(r.interventions), String(r.housePoints), String(r.lates), String(r.total)])

  const GROUP_BY_OPTIONS = ['student', 'grade', 'form', 'subject', 'teacher']
  const groupByLabels: Record<string, string> = { student: 'Student', grade: 'Grade', form: 'Form', subject: 'Subject', teacher: 'Teacher' }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A6B]">Trends</h1>
          <p className="text-sm text-gray-500 mt-0.5">{from} to {to} · {events.length.toLocaleString()} events</p>
        </div>
      </div>

      <GlobalFilters current={currentFilters} options={options} />

      {/* Toggle controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <ToggleLink href={buildUrl(params, { showMA: showMA ? '' : '1' })} active={showMA} label="7-day moving average" />
        <ToggleLink href={buildUrl(params, { inverseView: inverseView ? '' : '1' })} active={inverseView} label="Inverse view (interventions)" />
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-gray-500">Group by:</span>
          {GROUP_BY_OPTIONS.map((g) => (
            <a key={g} href={buildUrl(params, { groupBy: g })}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${groupBy === g ? 'bg-[#1B3A6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {groupByLabels[g]}
            </a>
          ))}
        </div>
        <div className="ml-auto">
          <ExportButton headers={exportHeaders} rows={exportRows} filename={`trends-by-${groupBy}.csv`} label="Export table" />
        </div>
      </div>

      {trendData.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">No data for this date range and filters.</p>
        </div>
      ) : (
        <TrendsChart
          data={trendData}
          groupByData={groupByData}
          groupByLabel={groupByLabels[groupBy] ?? groupBy}
          showMA={showMA}
          inverseView={inverseView}
        />
      )}
    </div>
  )
}

function ToggleLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${active ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
      {label}
    </a>
  )
}

function buildUrl(params: SearchParams, overrides: Record<string, string | undefined>): string {
  const merged = { ...(params as Record<string, string | undefined>), ...overrides }
  const search = new URLSearchParams()
  Object.entries(merged).forEach(([k, v]) => { if (v) search.set(k, v) })
  return `/pastoral/trends?${search.toString()}`
}
