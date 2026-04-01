import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRequiredStage, stageSortOrder, currentAcademicYear, academicYearStart, isoDate, PASTORAL_GRADES } from '@/lib/pastoral/utils'
import MarkSentButton from '@/components/pastoral/MarkSentButton'
import ExportButton from '@/components/pastoral/ExportButton'
import type { Profile } from '@/types/database'
import type { PastoralEvent, Rule25SentLog, Rule25Row } from '@/types/pastoral'

const STAGES_INTERVENTIONS = [
  '1st warning – Interventions',
  '2nd warning – Interventions',
  '3rd warning – Interventions',
  'Contract – Interventions',
]

const STAGES_LATES = [
  '1st warning – Lates',
  '2nd warning – Lates',
  '3rd warning – Lates',
  'Contract – Lates',
]

interface SearchParams {
  grade?: string
  tab?: string
}

export default async function Rule25Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
  const tab = params.tab ?? 'interventions'

  const ayLabel = currentAcademicYear()
  const ayStart = isoDate(academicYearStart(ayLabel))
  const eventType = tab === 'lates' ? 'Late' : 'Intervention'

  // Fetch all relevant events from academic year start
  let evQuery = supabase
    .from('pastoral_events')
    .select('student, grade_code, form, event_type')
    .eq('event_type', eventType)
    .eq('academic_year', ayLabel)

  if (selectedGrade) evQuery = evQuery.eq('grade_code', selectedGrade)

  const { data: events } = await evQuery.returns<Pick<PastoralEvent, 'student' | 'grade_code' | 'form' | 'event_type'>[]>()

  // Aggregate counts per student
  const studentMap = new Map<string, { student: string; grade_code: string; form: string; count: number }>()
  for (const ev of events ?? []) {
    const key = ev.student
    if (!studentMap.has(key)) {
      studentMap.set(key, { student: ev.student, grade_code: ev.grade_code, form: ev.form, count: 0 })
    }
    studentMap.get(key)!.count++
  }

  // Only show students at a threshold
  const atThreshold = Array.from(studentMap.values()).filter((s) => s.count >= 10)

  // Fetch sent log for these students
  const { data: sentLog } = await supabase
    .from('pastoral_rule25_sent_log')
    .select('student, stage_sent, sent_at, event_type')
    .eq('academic_year', ayLabel)
    .eq('event_type', eventType)
    .order('sent_at', { ascending: false })
    .returns<Pick<Rule25SentLog, 'student' | 'stage_sent' | 'sent_at' | 'event_type'>[]>()

  // Latest stage sent per student
  const sentByStudent = new Map<string, { stage_sent: string; sent_at: string }>()
  for (const s of sentLog ?? []) {
    if (!sentByStudent.has(s.student)) {
      sentByStudent.set(s.student, { stage_sent: s.stage_sent, sent_at: s.sent_at })
    }
  }

  // Build Rule25Row[]
  const rows: Rule25Row[] = atThreshold.map((s) => {
    const required = getRequiredStage(s.count, eventType === 'Late' ? 'Late' : 'Intervention')
    const sent = sentByStudent.get(s.student)
    const stageSent = sent?.stage_sent ?? null
    const status = !required ? 'NONE' : stageSent === required ? 'OK' : 'SEND EMAIL'
    return {
      student: s.student,
      grade_code: s.grade_code,
      form: s.form,
      total: s.count,
      requiredStage: required,
      stageSent,
      sentAt: sent?.sent_at ?? null,
      status,
    }
  })

  // Sort: highest count first (Contract → 3rd → 2nd → 1st)
  rows.sort((a, b) => b.total - a.total)

  // Group by grade
  const grades = selectedGrade ? [selectedGrade] : PASTORAL_GRADES.filter((g) =>
    rows.some((r) => r.grade_code === g)
  )

  // Export data
  const exportHeaders = ['Student', 'Grade', 'Form', 'Total', 'Required Stage', 'Stage Sent', 'Status']
  const exportRows = rows
    .filter((r) => r.status === 'SEND EMAIL')
    .map((r) => [r.student, r.grade_code, r.form, String(r.total), r.requiredStage ?? '', r.stageSent ?? '', r.status])

  const hasData = rows.length > 0

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A6B]">Rule of 25</h1>
          <p className="text-sm text-gray-500 mt-0.5">Academic year {ayLabel} · from {ayStart}</p>
        </div>
        {exportRows.length > 0 && (
          <ExportButton
            headers={exportHeaders}
            rows={exportRows}
            filename={`rule-of-25-${tab}-${ayLabel}.csv`}
            label="Export SEND EMAIL list"
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {[{ value: 'interventions', label: 'Interventions' }, { value: 'lates', label: 'Lates' }].map((t) => (
          <a
            key={t.value}
            href={`/pastoral/rule-of-25?tab=${t.value}${selectedGrade ? `&grade=${selectedGrade}` : ''}`}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.value ? 'bg-white text-[#1B3A6B] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* Grade filter */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-gray-500">Grade:</span>
        {[{ value: '', label: 'All grades' }, ...PASTORAL_GRADES.map((g) => ({ value: g, label: g }))].map(({ value, label }) => (
          <a
            key={value}
            href={`/pastoral/rule-of-25?tab=${tab}${value ? `&grade=${value}` : ''}`}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              selectedGrade === value ? 'bg-[#1B3A6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {/* Lates empty state */}
      {tab === 'lates' && !hasData && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm font-medium mb-1">No lates data available</p>
          <p className="text-gray-400 text-xs">Upload a file containing Late event types to see this report.</p>
        </div>
      )}

      {/* Summary counts */}
      {hasData && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Contract', stage: (s: Rule25Row) => s.requiredStage?.startsWith('Contract'), colour: 'text-red-600', bg: 'bg-red-50' },
            { label: '3rd warning', stage: (s: Rule25Row) => s.requiredStage?.startsWith('3rd'), colour: 'text-amber-600', bg: 'bg-amber-50' },
            { label: '2nd warning', stage: (s: Rule25Row) => s.requiredStage?.startsWith('2nd'), colour: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: '1st warning', stage: (s: Rule25Row) => s.requiredStage?.startsWith('1st'), colour: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(({ label, stage, colour, bg }) => {
            const count = rows.filter(stage).length
            const toSend = rows.filter(stage).filter((r) => r.status === 'SEND EMAIL').length
            return (
              <div key={label} className={`${bg} rounded-xl p-4`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-2xl font-bold ${colour}`}>{count}</p>
                {toSend > 0 && <p className="text-xs text-gray-500 mt-1">{toSend} to notify</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* Per-grade tables */}
      {hasData && grades.map((grade) => {
        const gradeRows = rows.filter((r) => r.grade_code === grade)
        if (gradeRows.length === 0) return null

        const toNotify = gradeRows.filter((r) => r.status === 'SEND EMAIL')

        return (
          <div key={grade} className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-[#1B3A6B]">{grade}</h2>
              <div className="flex items-center gap-3">
                {toNotify.length > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                    {toNotify.length} to notify
                  </span>
                )}
                <ExportButton
                  headers={exportHeaders}
                  rows={toNotify.map((r) => [r.student, r.grade_code, r.form, String(r.total), r.requiredStage ?? '', r.stageSent ?? '', r.status])}
                  filename={`rule-of-25-${grade}-${tab}.csv`}
                  label={`Export ${grade}`}
                />
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Student</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Form</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Required stage</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Stage sent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gradeRows.map((row) => (
                  <tr key={row.student} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{row.student}</td>
                    <td className="px-5 py-3 text-gray-500">{row.form}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-bold ${row.total >= 25 ? 'text-red-600' : row.total >= 20 ? 'text-amber-600' : row.total >= 15 ? 'text-yellow-600' : 'text-blue-600'}`}>
                        {row.total}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{row.requiredStage ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{row.stageSent ?? '—'}</td>
                    <td className="px-5 py-3">
                      {row.status === 'SEND EMAIL' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          SEND EMAIL
                        </span>
                      )}
                      {row.status === 'OK' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.status === 'SEND EMAIL' && row.requiredStage && (
                        <MarkSentButton
                          student={row.student}
                          gradeCode={row.grade_code}
                          academicYear={ayLabel}
                          eventType={eventType === 'Late' ? 'Late' : 'Intervention'}
                          requiredStage={row.requiredStage}
                          stages={eventType === 'Late' ? STAGES_LATES : STAGES_INTERVENTIONS}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {!hasData && tab === 'interventions' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">No students have reached the 10-intervention threshold this academic year.</p>
        </div>
      )}
    </div>
  )
}
