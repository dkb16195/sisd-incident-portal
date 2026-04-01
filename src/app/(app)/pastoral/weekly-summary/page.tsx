import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isoDate, daysAgoDate, PASTORAL_GRADES } from '@/lib/pastoral/utils'
import ExportButton from '@/components/pastoral/ExportButton'
import type { Profile } from '@/types/database'
import type { PastoralEvent } from '@/types/pastoral'
import { fetchAllRows } from '@/lib/supabase/fetchAll'

interface SearchParams {
  grade?: string
  weekEnding?: string
}

export default async function WeeklySummaryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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

  // Week ending date
  const { data: latestRow } = await supabase
    .from('pastoral_events')
    .select('event_date')
    .order('event_date', { ascending: false })
    .limit(1)
    .returns<{ event_date: string }[]>()

  const weekEndingDate = params.weekEnding ?? (latestRow?.[0]?.event_date ?? isoDate(new Date()))
  const weekStartDate = daysAgoDate(7, new Date(weekEndingDate))

  // Fetch all events in the 7-day window
  type WeekEvent = Pick<PastoralEvent, 'student' | 'grade_code' | 'form' | 'event_type' | 'event_date'>
  const events = await fetchAllRows<WeekEvent>((rangeFrom, rangeTo) => {
    let q = supabase
      .from('pastoral_events')
      .select('student, grade_code, form, event_type, event_date')
      .gte('event_date', weekStartDate)
      .lte('event_date', weekEndingDate)
    if (selectedGrade) q = q.eq('grade_code', selectedGrade)
    return q.range(rangeFrom, rangeTo).returns<WeekEvent[]>()
  })

  const hasLatesData = events.some((e) => e.event_type === 'Late')

  // Per-student counts by grade
  type StudentCounts = { student: string; form: string; grade_code: string; interventions: number; housePoints: number; lates: number }
  const studentData = new Map<string, StudentCounts>()

  for (const ev of events) {
    const key = `${ev.student}|${ev.grade_code}`
    if (!studentData.has(key)) {
      studentData.set(key, { student: ev.student, form: ev.form, grade_code: ev.grade_code, interventions: 0, housePoints: 0, lates: 0 })
    }
    const d = studentData.get(key)!
    if (ev.event_type === 'Intervention') d.interventions++
    if (ev.event_type === 'HousePoint') d.housePoints++
    if (ev.event_type === 'Late') d.lates++
  }

  const allStudents = Array.from(studentData.values())

  const grades = selectedGrade ? [selectedGrade] : PASTORAL_GRADES.filter((g) =>
    allStudents.some((s) => s.grade_code === g)
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A6B]">Weekly summary</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            7 days ending <span className="font-medium">{weekEndingDate}</span> (from {weekStartDate})
          </p>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-500">Week ending:</label>
        <a href={`/pastoral/weekly-summary?weekEnding=${daysAgoDate(7, new Date(weekEndingDate))}${selectedGrade ? `&grade=${selectedGrade}` : ''}`}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">← Prev week</a>
        <span className="text-sm font-medium text-gray-700">{weekEndingDate}</span>
        <a href={`/pastoral/weekly-summary?weekEnding=${isoDate(new Date(new Date(weekEndingDate).getTime() + 7 * 86400000))}${selectedGrade ? `&grade=${selectedGrade}` : ''}`}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Next week →</a>
      </div>

      {/* Grade filter */}
      <div className="flex items-center gap-2 mb-6">
        {[{ value: '', label: 'All grades' }, ...PASTORAL_GRADES.map((g) => ({ value: g, label: g }))].map(({ value, label }) => (
          <a key={value}
            href={`/pastoral/weekly-summary?weekEnding=${weekEndingDate}${value ? `&grade=${value}` : ''}`}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${selectedGrade === value ? 'bg-[#1B3A6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </a>
        ))}
      </div>

      {grades.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">No data for this week. Try uploading data or selecting a different week.</p>
        </div>
      )}

      {grades.map((grade) => {
        const gradeStudents = allStudents.filter((s) => s.grade_code === grade)
        if (gradeStudents.length === 0) return null

        // Top 10 house point earners
        const top10HP = [...gradeStudents]
          .sort((a, b) => b.housePoints - a.housePoints)
          .filter((s) => s.housePoints > 0)
          .slice(0, 10)

        // Reflection list: ≥3 interventions
        const reflectionList = gradeStudents
          .filter((s) => s.interventions >= 3)
          .sort((a, b) => b.interventions - a.interventions)

        // Reflection list lates: ≥3 lates
        const reflectionLates = gradeStudents
          .filter((s) => s.lates >= 3)
          .sort((a, b) => b.lates - a.lates)

        // Combined
        const combinedKeys = new Set([
          ...reflectionList.map((s) => s.student),
          ...reflectionLates.map((s) => s.student),
        ])
        const combinedList = gradeStudents
          .filter((s) => combinedKeys.has(s.student))
          .sort((a, b) => (b.interventions + b.lates) - (a.interventions + a.lates))

        return (
          <div key={grade} className="mb-10">
            <h2 className="text-base font-bold text-[#1B3A6B] mb-4">{grade}</h2>
            <div className="grid grid-cols-2 gap-6 mb-6">

              {/* Top 10 House Points */}
              <SummaryCard
                title="Top 10 house point earners"
                subtitle={`${top10HP.length} students`}
                exportHeaders={['Student', 'Form', 'House Points']}
                exportRows={top10HP.map((s) => [s.student, s.form, String(s.housePoints)])}
                exportFilename={`hp-top10-${grade}.csv`}
              >
                {top10HP.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No house points logged this week.</p>
                ) : (
                  <ol className="space-y-1.5">
                    {top10HP.map((s, i) => (
                      <li key={s.student} className="flex items-center gap-3 text-sm">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          i === 0 ? 'bg-yellow-400 text-white' :
                          i === 1 ? 'bg-gray-300 text-gray-700' :
                          i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</span>
                        <span className="flex-1 font-medium text-gray-900">{s.student}</span>
                        <span className="text-xs text-gray-400">{s.form}</span>
                        <span className="font-bold text-[#1B3A6B]">{s.housePoints}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </SummaryCard>

              {/* After-school Reflection — Interventions */}
              <SummaryCard
                title="After-school reflection — interventions"
                subtitle={`${reflectionList.length} student${reflectionList.length !== 1 ? 's' : ''} (≥3 interventions)`}
                highlight={reflectionList.length > 0}
                exportHeaders={['Student', 'Form', 'Interventions']}
                exportRows={reflectionList.map((s) => [s.student, s.form, String(s.interventions)])}
                exportFilename={`reflection-interventions-${grade}.csv`}
              >
                {reflectionList.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No students with ≥3 interventions this week.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {reflectionList.map((s) => (
                      <li key={s.student} className="flex items-center gap-3 text-sm">
                        <span className="flex-1 font-medium text-gray-900">{s.student}</span>
                        <span className="text-xs text-gray-400">{s.form}</span>
                        <span className="font-bold text-amber-600">{s.interventions}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SummaryCard>

              {/* After-school Reflection — Lates */}
              <SummaryCard
                title="After-school reflection — lates"
                subtitle={hasLatesData ? `${reflectionLates.length} student${reflectionLates.length !== 1 ? 's' : ''} (≥3 lates)` : 'No lates data'}
                highlight={reflectionLates.length > 0}
                exportHeaders={['Student', 'Form', 'Lates']}
                exportRows={reflectionLates.map((s) => [s.student, s.form, String(s.lates)])}
                exportFilename={`reflection-lates-${grade}.csv`}
              >
                {!hasLatesData ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No lates data currently available.</p>
                ) : reflectionLates.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No students with ≥3 lates this week.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {reflectionLates.map((s) => (
                      <li key={s.student} className="flex items-center gap-3 text-sm">
                        <span className="flex-1 font-medium text-gray-900">{s.student}</span>
                        <span className="text-xs text-gray-400">{s.form}</span>
                        <span className="font-bold text-red-500">{s.lates}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SummaryCard>

              {/* Combined reflection list */}
              <SummaryCard
                title="Combined reflection list"
                subtitle={`${combinedList.length} student${combinedList.length !== 1 ? 's' : ''}`}
                highlight={combinedList.length > 0}
                exportHeaders={['Student', 'Form', 'Interventions', 'Lates']}
                exportRows={combinedList.map((s) => [s.student, s.form, String(s.interventions), String(s.lates)])}
                exportFilename={`reflection-combined-${grade}.csv`}
              >
                {combinedList.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No students meeting reflection criteria.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {combinedList.map((s) => (
                      <li key={s.student} className="flex items-center gap-3 text-sm">
                        <span className="flex-1 font-medium text-gray-900">{s.student}</span>
                        <span className="text-xs text-gray-400">{s.form}</span>
                        {s.interventions > 0 && <span className="text-xs text-amber-600 font-medium">{s.interventions} int</span>}
                        {s.lates > 0 && <span className="text-xs text-red-500 font-medium">{s.lates} late</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </SummaryCard>

            </div>
          </div>
        )
      })}
    </div>
  )
}

function SummaryCard({
  title, subtitle, children, highlight, exportHeaders, exportRows, exportFilename,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  highlight?: boolean
  exportHeaders: string[]
  exportRows: string[][]
  exportFilename: string
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${highlight ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <ExportButton headers={exportHeaders} rows={exportRows} filename={exportFilename} label="Export" />
      </div>
      {children}
    </div>
  )
}
