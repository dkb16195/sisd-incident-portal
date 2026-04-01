import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isoDate, daysAgoDate, computeFlags, PASTORAL_GRADES } from '@/lib/pastoral/utils'
import GlobalFilters from '@/components/pastoral/GlobalFilters'
import ExportButton from '@/components/pastoral/ExportButton'
import type { Profile } from '@/types/database'
import type { PastoralEvent, PastoralFilters, FilterOptions, StudentMetrics } from '@/types/pastoral'

interface SearchParams extends PastoralFilters {
  weekEnding?: string
}

export default async function WeeklyReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  const params = await searchParams
  const selectedGrade = params.grade ?? ''

  const { data: latestRow } = await supabase
    .from('pastoral_events')
    .select('event_date')
    .order('event_date', { ascending: false })
    .limit(1)
    .returns<{ event_date: string }[]>()

  const weekEndingDate = params.weekEnding ?? (latestRow?.[0]?.event_date ?? isoDate(new Date()))
  const d14Ago = daysAgoDate(14, new Date(weekEndingDate))
  const d10Ago = daysAgoDate(10, new Date(weekEndingDate))
  const d7Ago = daysAgoDate(7, new Date(weekEndingDate))
  const d28Ago = daysAgoDate(28, new Date(weekEndingDate))
  const prevWeekEnd = daysAgoDate(7, new Date(weekEndingDate))
  const prevWeekStart = daysAgoDate(14, new Date(weekEndingDate))

  // Fetch 28 days of events (enough for all metrics)
  let query = supabase
    .from('pastoral_events')
    .select('student, grade_code, form, subject, event_type, event_date')
    .gte('event_date', d28Ago)
    .lte('event_date', weekEndingDate)

  if (selectedGrade) query = query.eq('grade_code', selectedGrade)
  if (params.form) query = query.eq('form', params.form)
  if (params.student) query = query.ilike('student', `%${params.student}%`)

  const { data: events } = await query.returns<Pick<PastoralEvent, 'student' | 'grade_code' | 'form' | 'subject' | 'event_type' | 'event_date'>[]>()

  // Build per-student metrics
  type EventItem = NonNullable<typeof events>[number]
  const studentMap = new Map<string, { grade_code: string; form: string; events: EventItem[] }>()
  for (const ev of events ?? []) {
    if (!studentMap.has(ev.student)) studentMap.set(ev.student, { grade_code: ev.grade_code, form: ev.form, events: [] })
    studentMap.get(ev.student)!.events.push(ev)
  }

  function countInWindow(evs: EventItem[], type: string, from: string, to: string): number {
    return evs.filter((e) => e.event_type === type && e.event_date >= from && e.event_date <= to).length
  }

  function topSubject(evs: EventItem[], from: string, to: string): { subject: string; count: number } | null {
    const counts: Record<string, number> = {}
    for (const e of evs) {
      if (e.event_type === 'Intervention' && e.event_date >= from && e.event_date <= to) {
        counts[e.subject || '(none)'] = (counts[e.subject || '(none)'] ?? 0) + 1
      }
    }
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
    if (!sorted.length) return null
    return { subject: sorted[0][0], count: sorted[0][1] }
  }

  const allMetrics: (StudentMetrics & { topSubject: string | null; topSubjectCount: number })[] = []

  for (const [student, { grade_code, form, events: evs }] of studentMap) {
    const rewards_7 = countInWindow(evs, 'HousePoint', d7Ago, weekEndingDate)
    const rewards_prev7 = countInWindow(evs, 'HousePoint', prevWeekStart, prevWeekEnd)
    const rewards_14 = countInWindow(evs, 'HousePoint', d14Ago, weekEndingDate)
    const interv_7 = countInWindow(evs, 'Intervention', d7Ago, weekEndingDate)
    const interv_prev7 = countInWindow(evs, 'Intervention', prevWeekStart, prevWeekEnd)
    const interv_10 = countInWindow(evs, 'Intervention', d10Ago, weekEndingDate)
    const interv_14 = countInWindow(evs, 'Intervention', d14Ago, weekEndingDate)
    const late_7 = countInWindow(evs, 'Late', d7Ago, weekEndingDate)
    const balance14 = rewards_14 / (interv_14 + 1)
    const ts = topSubject(evs, d28Ago, weekEndingDate)

    allMetrics.push({
      student, grade_code, form,
      rewards_7, rewards_prev7, rewards_14,
      interv_7, interv_prev7, interv_10, interv_14, late_7,
      balance14,
      topSubject: ts?.subject ?? null,
      topSubjectCount: ts?.count ?? 0,
    })
  }

  const config = { strongBalanceThreshold: 3 }

  // PosA — Quiet Wins (no rewards, no interventions in last 14 days)
  const posA = allMetrics.filter((m) => m.rewards_14 === 0 && m.interv_14 === 0)
    .sort((a, b) => a.student.localeCompare(b.student))

  // PosB — Momentum: top 10 by weekly improvement
  const posB = allMetrics
    .filter((m) => m.rewards_7 - m.rewards_prev7 >= 1)
    .sort((a, b) => (b.rewards_7 - b.rewards_prev7) - (a.rewards_7 - a.rewards_prev7))
    .slice(0, 10)

  // PosC — Strong Balance: top 10
  const posC = allMetrics
    .filter((m) => m.balance14 >= config.strongBalanceThreshold)
    .sort((a, b) => b.balance14 - a.balance14)
    .slice(0, 10)

  // Early Support: compute flags and risk score
  const withFlags = allMetrics.map((m) => {
    const flags = computeFlags(m, { strongBalanceThreshold: 3 })
    return { ...m, ...flags }
  })

  const earlySupport = withFlags
    .filter((m) => m.negA || m.negC || m.negD)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 15)

  // Export
  const esSupportHeaders = ['Student', 'Grade', 'Form', 'Risk Score', 'Interv (7d)', 'Rewards (14d)', 'NegA', 'NegC', 'NegD', 'Top Subject']
  const esSupportRows = earlySupport.map((m) => [
    m.student, m.grade_code, m.form,
    String(m.riskScore), String(m.interv_7), String(m.rewards_14),
    m.negA ? 'Yes' : '', m.negC ? 'Yes' : '', m.negD ? 'Yes' : '',
    m.topSubject ?? '',
  ])

  const currentFilters: PastoralFilters = {
    grade: params.grade, form: params.form, student: params.student,
  }

  const options: FilterOptions = {
    grades: [...PASTORAL_GRADES],
    forms: [...new Set((events ?? []).map((e) => e.form))].sort(),
    subjects: [], teachers: [],
  }

  const flag = (val: boolean) => val ? (
    <span className="inline-block w-4 h-4 rounded-sm bg-[#1B3A6B]" />
  ) : null

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A6B]">Weekly report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Week ending {weekEndingDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Week ending:</label>
          <a href={`/pastoral/weekly-report?weekEnding=${daysAgoDate(7, new Date(weekEndingDate))}${selectedGrade ? `&grade=${selectedGrade}` : ''}`}
            className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">← Prev</a>
          <span className="text-sm font-medium">{weekEndingDate}</span>
          <a href={`/pastoral/weekly-report?weekEnding=${isoDate(new Date(new Date(weekEndingDate).getTime() + 7 * 86400000))}${selectedGrade ? `&grade=${selectedGrade}` : ''}`}
            className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Next →</a>
        </div>
      </div>

      <GlobalFilters current={currentFilters} options={options} hide={['date', 'subject', 'teacher']} />

      {allMetrics.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">No data for this week. Upload data or adjust filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Positives section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Positives</h2>
            <div className="grid grid-cols-3 gap-5">

              {/* PosA Quiet Wins */}
              <ReportCard
                title="Quiet Wins"
                badge="PosA"
                badgeColour="bg-green-50 text-green-700 border-green-200"
                count={posA.length}
                exportHeaders={['Student', 'Grade', 'Form']}
                exportRows={posA.map((m) => [m.student, m.grade_code, m.form])}
                exportFilename="pos-a-quiet-wins.csv"
              >
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {posA.slice(0, 20).map((m) => (
                    <li key={m.student} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-gray-800">{m.student}</span>
                      <span className="text-gray-400">{m.grade_code} · {m.form}</span>
                    </li>
                  ))}
                  {posA.length > 20 && <li className="text-xs text-gray-400 pt-1">+{posA.length - 20} more — export to see all</li>}
                </ul>
              </ReportCard>

              {/* PosB Momentum */}
              <ReportCard
                title="Momentum"
                badge="PosB"
                badgeColour="bg-blue-50 text-blue-700 border-blue-200"
                count={posB.length}
                subtitle="Top 10 by weekly improvement"
                exportHeaders={['Student', 'Grade', 'Form', 'HP This Week', 'HP Last Week', 'Improvement']}
                exportRows={posB.map((m) => [m.student, m.grade_code, m.form, String(m.rewards_7), String(m.rewards_prev7), String(m.rewards_7 - m.rewards_prev7)])}
                exportFilename="pos-b-momentum.csv"
              >
                <ul className="space-y-1.5">
                  {posB.map((m) => (
                    <li key={m.student} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-gray-800 font-medium">{m.student}</span>
                      <span className="text-gray-400">{m.form}</span>
                      <span className="text-green-600 font-bold">+{m.rewards_7 - m.rewards_prev7}</span>
                    </li>
                  ))}
                </ul>
              </ReportCard>

              {/* PosC Strong Balance */}
              <ReportCard
                title="Strong Balance"
                badge="PosC"
                badgeColour="bg-purple-50 text-purple-700 border-purple-200"
                count={posC.length}
                subtitle="Top 10 by rewards:interventions ratio"
                exportHeaders={['Student', 'Grade', 'Form', 'Balance', 'Rewards (14d)', 'Interventions (14d)']}
                exportRows={posC.map((m) => [m.student, m.grade_code, m.form, m.balance14.toFixed(1), String(m.rewards_14), String(m.interv_14)])}
                exportFilename="pos-c-strong-balance.csv"
              >
                <ul className="space-y-1.5">
                  {posC.map((m) => (
                    <li key={m.student} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-gray-800 font-medium">{m.student}</span>
                      <span className="text-gray-400">{m.form}</span>
                      <span className="text-purple-600 font-bold">{m.balance14.toFixed(1)}×</span>
                    </li>
                  ))}
                </ul>
              </ReportCard>
            </div>
          </div>

          {/* Early Support */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Early support — top 15 by risk score</h2>
                <p className="text-xs text-gray-400 mt-0.5">{earlySupport.length} student{earlySupport.length !== 1 ? 's' : ''} flagged</p>
              </div>
              <ExportButton headers={esSupportHeaders} rows={esSupportRows} filename="early-support.csv" />
            </div>

            {earlySupport.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-gray-400 text-sm">No students flagged for early support this week.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Student</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Grade · Form</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Risk</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Interv (7d)</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">HP (14d)</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">NegA</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">NegC</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">NegD</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Top subject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {earlySupport.map((m) => (
                      <tr key={m.student} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{m.student}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{m.grade_code} · {m.form}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold text-sm ${m.riskScore >= 5 ? 'text-red-600' : m.riskScore >= 3 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {m.riskScore}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">{m.interv_7}</td>
                        <td className="px-4 py-3 text-right font-medium text-[#1B3A6B]">{m.rewards_14}</td>
                        <td className="px-3 py-3 text-center">{m.negA && <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />}</td>
                        <td className="px-3 py-3 text-center">{m.negC && <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />}</td>
                        <td className="px-3 py-3 text-center">{m.negD && <span className="w-3 h-3 rounded-sm bg-red-600 inline-block" />}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {m.topSubject && <span>{m.topSubject} ({m.topSubjectCount})</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReportCard({
  title, badge, badgeColour, count, subtitle, children, exportHeaders, exportRows, exportFilename,
}: {
  title: string
  badge: string
  badgeColour: string
  count: number
  subtitle?: string
  children: React.ReactNode
  exportHeaders: string[]
  exportRows: string[][]
  exportFilename: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${badgeColour}`}>{badge}</span>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          </div>
          <p className="text-xs text-gray-400">{subtitle ?? `${count} student${count !== 1 ? 's' : ''}`}</p>
        </div>
        <ExportButton headers={exportHeaders} rows={exportRows} filename={exportFilename} label="Export" />
      </div>
      {count === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">No students this week.</p>
      ) : children}
    </div>
  )
}
