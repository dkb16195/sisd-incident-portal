'use client'

import { useState, useTransition } from 'react'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { createIncident, type NewIncidentData } from '@/app/(app)/incidents/actions'
import StudentSearch, { type SelectedStudent } from './StudentSearch'
import Button from '@/components/ui/Button'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { cn, GRADES, INCIDENT_TYPE_LABELS, SEVERITY_LABELS, STUDENT_ROLE_LABELS, CONTRACT_TRIGGER_TYPES, formatDate, getIncidentTypeLabel } from '@/lib/utils'
import type { IncidentType, IncidentSeverity } from '@/types/database'

interface Props {
  userGrade: string | null   // null = deputy/admin (can choose grade)
  userRole: string
}

interface FormState {
  title: string
  incident_type: IncidentType | ''
  custom_incident_type: string
  severity: IncidentSeverity | ''
  incident_date: string
  incident_time: string
  location: string
  grade: string
  description: string
}

const today = new Date().toISOString().split('T')[0]

const INCIDENT_TYPES: IncidentType[] = [
  'bullying', 'physical_altercation', 'verbal_misconduct', 'peer_conflict',
  'social_media', 'theft', 'property_damage', 'safeguarding', 'vaping', 'contraband',
  'rule_of_25_behaviour', 'rule_of_25_lates', 'other',
]

const SEVERITIES: IncidentSeverity[] = ['low', 'medium', 'high', 'critical']

const STEPS = ['Incident details', 'Students involved', 'Review & submit']

export default function NewIncidentForm({ userGrade, userRole }: Props) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>({
    title: '',
    incident_type: '',
    custom_incident_type: '',
    severity: '',
    incident_date: today,
    incident_time: '',
    location: '',
    grade: userGrade ?? '',
    description: '',
  })
  const [students, setStudents] = useState<SelectedStudent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function set(field: keyof FormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Rule of 25 types must always be critical severity
      if (field === 'incident_type' && CONTRACT_TRIGGER_TYPES.includes(value as typeof CONTRACT_TRIGGER_TYPES[number])) {
        next.severity = 'critical'
      }
      return next
    })
    if (field === 'grade') setStudents([])
  }

  // ── Step validation ────────────────────────────────────────────────────────
  function step1Valid() {
    const baseValid = !!(
      form.title.trim() &&
      form.incident_type &&
      form.severity &&
      form.incident_date &&
      form.location.trim() &&
      form.grade &&
      form.description.trim()
    )
    // If 'other' is selected, require a custom type
    if (form.incident_type === 'other' && !form.custom_incident_type.trim()) return false
    return baseValid
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createIncident({
        title: form.title.trim(),
        incident_type: form.incident_type as IncidentType,
        custom_incident_type: form.incident_type === 'other'
          ? form.custom_incident_type.trim()
          : undefined,
        severity: form.severity as IncidentSeverity,
        incident_date: form.incident_date,
        incident_time: form.incident_time || undefined,
        location: form.location.trim(),
        grade: form.grade,
        description: form.description.trim(),
        students: students.map((s) => ({
          student_id: s.student.id,
          role: s.role,
        })),
      })
      if (result?.error) setError(result.error)
      // On success, redirect happens server-side
    })
  }

  return (
    <div className="max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                i < step
                  ? 'bg-[#1B3A6B] text-white'
                  : i === step
                  ? 'bg-[#1B3A6B] text-white ring-4 ring-[#1B3A6B]/20'
                  : 'bg-gray-200 text-gray-500'
              )}
            >
              {i < step ? <Check size={13} /> : i + 1}
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                i === step ? 'text-[#1B3A6B]' : 'text-gray-400'
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn('w-8 h-px mx-1', i < step ? 'bg-[#1B3A6B]' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Incident Details ─────────────────────────────────────── */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

          {/* Contract trigger warning */}
          {CONTRACT_TRIGGER_TYPES.includes(form.incident_type as typeof CONTRACT_TRIGGER_TYPES[number]) && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold mb-0.5">Behaviour contract will be required</p>
              <p className="text-amber-700 text-xs">This incident type automatically triggers a behaviour contract. Severity is locked to Critical. Complete the investigation checklist to record the contract start date.</p>
            </div>
          )}

          <div>
            <label className="label">Incident title <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="e.g. Physical altercation in corridor B"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Incident type <span className="text-red-500">*</span></label>
              <select
                className="input"
                value={form.incident_type}
                onChange={(e) => set('incident_type', e.target.value)}
              >
                <option value="">Select type…</option>
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>{INCIDENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
              {form.incident_type === 'other' && (
                <input
                  className="input mt-2"
                  placeholder="Describe the incident type…"
                  value={form.custom_incident_type}
                  onChange={(e) => set('custom_incident_type', e.target.value)}
                />
              )}
            </div>
            <div>
              <label className="label">Severity <span className="text-red-500">*</span></label>
              {CONTRACT_TRIGGER_TYPES.includes(form.incident_type as typeof CONTRACT_TRIGGER_TYPES[number]) ? (
                <input
                  className="input bg-red-50 text-red-700 font-medium"
                  value="Critical (locked)"
                  disabled
                />
              ) : (
                <select
                  className="input"
                  value={form.severity}
                  onChange={(e) => set('severity', e.target.value)}
                >
                  <option value="">Select severity…</option>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                className="input"
                value={form.incident_date}
                onChange={(e) => set('incident_date', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Time <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="time"
                className="input"
                value={form.incident_time}
                onChange={(e) => set('incident_time', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Location <span className="text-red-500">*</span></label>
              <input
                className="input"
                placeholder="e.g. Corridor B, Floor 2"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Grade <span className="text-red-500">*</span></label>
              {userGrade ? (
                <input className="input bg-gray-50 text-gray-500" value={userGrade} disabled />
              ) : (
                <select
                  className="input"
                  value={form.grade}
                  onChange={(e) => set('grade', e.target.value)}
                >
                  <option value="">Select grade…</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="label">Full description <span className="text-red-500">*</span></label>
            <textarea
              className="input min-h-[120px] resize-y"
              placeholder="Describe what happened in full detail…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(1)} disabled={!step1Valid()}>
              Next: Students involved
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Students Involved ────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Search for students from any grade and assign their role in this incident.
              You can proceed without adding any students.
            </p>
            <StudentSearch
              selected={students}
              onChange={setStudents}
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(0)}>
              <ChevronLeft size={16} />
              Back
            </Button>
            <Button onClick={() => setStep(2)}>
              Next: Review
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-[#1B3A6B]">
              Incident details
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Title</p>
                <p className="font-medium text-gray-900">{form.title}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Type</p>
                  <p className="text-gray-700">
                    {getIncidentTypeLabel(form.incident_type as IncidentType, form.custom_incident_type)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Severity</p>
                  <SeverityBadge severity={form.severity} />
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Status</p>
                  <StatusBadge status="open" />
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Date</p>
                  <p className="text-gray-700">{formatDate(form.incident_date)}{form.incident_time ? ` at ${form.incident_time}` : ''}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Location</p>
                  <p className="text-gray-700">{form.location}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Grade</p>
                  <p className="text-gray-700">{form.grade}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Description</p>
                <p className="text-gray-700 whitespace-pre-wrap">{form.description}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-[#1B3A6B] mb-3">
              Students involved ({students.length})
            </h3>
            {students.length === 0 ? (
              <p className="text-sm text-gray-400">No students linked to this incident.</p>
            ) : (
              <ul className="space-y-2">
                {students.map(({ student, role }) => (
                  <li key={student.id} className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0">
                      <span className="text-[#1B3A6B] text-xs font-medium">
                        {student.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{student.full_name}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{student.year_group}</span>
                    <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                      {STUDENT_ROLE_LABELS[role]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)} disabled={isPending}>
              <ChevronLeft size={16} />
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving…' : 'Log incident'}
              {!isPending && <Check size={16} />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
