import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRequiredStage, currentAcademicYear, isoDate, daysAgoDate, PASTORAL_GRADES } from '@/lib/pastoral/utils'
import ExportButton from '@/components/pastoral/ExportButton'
import type { Profile } from '@/types/database'
import type { PastoralEvent, Rule25SentLog, WeeklyChangeRow } from '@/types/pastoral'

interface SearchParams {
  grade?: string
  weekEnding?: string
}

export default async function WeeklyChangesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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

  // Determine week ending date (use latest date in dataset or today)
  const { data: latestRow } = await supabase
    .from('pastoral_events')
    .select('event_date')
    .order('event_date', { ascending: false })
    .limit(1)
    .returns<{ event_date: string }[]>()

  const weekEndingDate = params.weekEnding ?? (latestRow?.[0]?.event_date ?? isoDate(new Date()))
  const weekStartDate = daysAgoDate(7, new Date(weekEndingDate))
  const prevWeekEndDate = daysAgoDate(7, new Date(weekEndingDate))
  const prevWeekStartDate = daysAgoDate(14, new Date(weekEndingDate))

  const ayLabel = currentAcademicYear()

  // Get all intervention events since academic year start, up to weekEndingDate
  const ayStart = isoDate(new Date(parseInt(ayLabel.split('-')[0]), 7, 1))

  let evQuery = supabase
    .from('pastoral_events')
    .select('student, grade_code, form, event_date')
    .eq('event_type', 'Intervention')
    .eq('academic_year', ayLabel)
    .lte('event_date', weekEndingDate)

  if (selectedGrade) evQuery = evQuery.eq('grade_code', selectedGrade)
  const { data: events } = await evQuery.returns<Pick<PastoralEvent, 'student' | 'grade_code' | 'form' | 'event_date'>[]>()

  // Count cumulative totals per student up to weekEnding and up to prevWeekEnd
  const countNow = new Map<string, { student: string; grade_code: string; form: string; count: number }>()
  const countPrev = new Map<string, number>()

  for (const ev of events ?? []) {
    const key = ev.student
    if (!countNow.has(key)) countNow.set(key, { student: ev.student, grade_code: ev.grade_code, form: ev.form, count: 0 })
    countNow.get(key)!.count++
    // Count for prev week (up to prevWeekEndDate)
    if (ev.event_date <= prevWeekEndDate) {
      countPrev.set(key, (countPrev.get(key) ?? 0) + 1)
    }
  }

  // Build change rows
  const changeRows: WeeklyChangeRow[] = []
  for (const [student, data] of countNow) {
    const totalNow = data.count
    const totalPrev = countPrev.get(student) ?? 0
    const stageNow = getRequiredStage(totalNow)
    const stagePrev = getRequiredStage(totalPrev)
    if (stageNow !== stagePrev && stageNow !== null) {
      changeRows.push({
        student,
        grade_code: data.grade_code,
        form: data.form,
        totalNow,
        stagePrev,
        stageNow,
        stageSent: null,
        status: 'SEND EMAIL',
      })
    }
  }

  // Fetch sent log
  const { data: sentLog } = await supabase
    .from('pastoral_rule25_sent_log')
    .select('student, stage_sent, sent_at')
    .eq('academic_year', ayLabel)
    .eq('event_type', 'Intervention')
    .order('sent_at', { ascending: false })
    .returns<Pick<Rule25SentLog, 'student' | 'stage_sent' | 'sent_at'>[]>()

  const sentByStudent = new Map<string, string>()
  for (const s of sentLog ?? []) {
    if (!sentByStudent.has(s.student)) sentByStudent.set(s.student, s.stage_sent)
  }

  // Attach sent info and status
  for (const row of changeRows) {
    row.stageSent = sentByStudent.get(row.student) ?? null
    row.status = row.stageSent === row.stageNow ? 'OK' : 'SEND EMAIL'
  }

  // Sort by stageNow severity desc
  changeRows.sort((a, b) => {
    const aN = a.stageNow?.startsWith('Contract') ? 4 : a.stageNow?.startsWith('3rd') ? 3 : a.stageNow?.startsWith('2nd') ? 2 : 1
    const bN = b.stageNow?.startsWith('Contract') ? 4 : b.stageNow?.startsWith('3rd') ? 3 : b.stageNow?.startsWith('2nd') ? 2 : 1
    return bN - aN || b.totalNow - a.totalNow
  })

  // Summary counts
  const newFirst = changeRows.filter((r) => r.stageNow?.startsWith('1st') && !r.stagePrev).length
  const newSecond = changeRows.filter((r) => r.stageNow?.startsWith('2nd')).length
  const newThird = changeRows.filter((r) => r.stageNow?.startsWith('3rd')).length
  const newContract = changeRows.filter((r) => r.stageNow?.startsWith('Contract')).length

  const exportHeaders = ['Student', 'Grade', 'Form', 'Total', 'Previous Stage', 'New Stage', 'Stage Sent', 'Status']
  const exportRows = changeRows.map((r) => [r.student, r.grade_code, r.form, String(r.totalNow), r.stagePrev ?? '—', r.stageNow ?? '', r.stageSent ?? '—', r.status])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A6B]">Weekly changes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Stage changes comparing week ending <span className="font-medium">{weekEndingDate}</span> vs prior week
          </p>
        </div>
        {changeRows.length > 0 && (
          <ExportButton headers={exportHeaders} rows={exportRows} filename="weekly-changes.csv" />
        )}
      </div>

      {/* Week selector */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-500">Week ending:</label>
        <a href={`/pastoral/weekly-changes?weekEnding=${daysAgoDate(7, new Date(weekEndingDate))}${selectedGrade ? `&grade=${selectedGrade}` : ''}`}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">← Prev week</a>
        <WeekEndingInput current={weekEndingDate} grade={selectedGrade} />
        <a href={`/pastoral/weekly-changes?weekEnding=${isoDate(new Date(new Date(weekEndingDate).getTime() + 7 * 86400000))}${selectedGrade ? `&grade=${selectedGrade}` : ''}`}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Next week →</a>
      </div>

      {/* Grade filter */}
      <div className="flex items-center gap-2 mb-6">
        {[{ value: '', label: 'All grades' }, ...PASTORAL_GRADES.map((g) => ({ value: g, label: g }))].map(({ value, label }) => (
          <a key={value}
            href={`/pastoral/weekly-changes?weekEnding=${weekEndingDate}${value ? `&grade=${value}` : ''}`}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${selectedGrade === value ? 'bg-[#1B3A6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </a>
        ))}
      </div>

      {/* Summary */}
      {changeRows.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'New contracts', count: newContract, colour: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Escalated to 3rd', count: newThird, colour: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Escalated to 2nd', count: newSecond, colour: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'New 1st warnings', count: newFirst, colour: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(({ label, count, colour, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4`}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${colour}`}>{count}</p>
            </div>
          ))}
        </div>
      )}

      {changeRows.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">No stage changes this week.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Student</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Grade · Form</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Previous stage</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">New stage</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Stage sent</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {changeRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{row.student}</td>
                  <td className="px-5 py-3 text-gray-500">{row.grade_code} · {row.form}</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-700">{row.totalNow}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{row.stagePrev ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold ${
                      row.stageNow?.startsWith('Contract') ? 'text-red-600' :
                      row.stageNow?.startsWith('3rd') ? 'text-amber-600' :
                      row.stageNow?.startsWith('2nd') ? 'text-yellow-600' : 'text-blue-600'
                    }`}>{row.stageNow}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">{row.stageSent ?? '—'}</td>
                  <td className="px-5 py-3">
                    {row.status === 'SEND EMAIL' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">SEND EMAIL</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// inline client component for week picker
function WeekEndingInput({ current, grade }: { current: string; grade: string }) {
  // Navigation handled by server-side link navigation; render a plain date display
  return <span className="text-sm font-medium text-gray-700">{current}</span>
}
