'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { PASTORAL_GRADES } from '@/lib/pastoral/utils'
import type { PastoralFilters, FilterOptions } from '@/types/pastoral'

const DATE_PRESETS = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last14', label: 'Last 14 days' },
  { value: 'last28', label: 'Last 28 days' },
  { value: 'academic', label: 'Academic year' },
]

interface Props {
  current: PastoralFilters
  options?: FilterOptions
  hide?: Array<'date' | 'grade' | 'form' | 'subject' | 'teacher' | 'student'>
}

export default function GlobalFilters({ current, options, hide = [] }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [studentInput, setStudentInput] = useState(current.student ?? '')
  const studentDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset local input when filters are cleared externally
  useEffect(() => {
    if (!current.student) setStudentInput('')
  }, [current.student])

  const update = useCallback(
    (updates: Partial<PastoralFilters>) => {
      const merged = { ...current, ...updates }
      const params = new URLSearchParams()
      Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
      startTransition(() => router.replace(`${pathname}?${params.toString()}`))
    },
    [current, pathname, router]
  )

  const clear = useCallback(() => {
    startTransition(() => router.replace(pathname))
  }, [pathname, router])

  const hasFilters = Object.values(current).some(Boolean)
  const activePreset = current.preset

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {/* Date presets */}
      {!hide.includes('date') && (
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => update({ preset: p.value, dateFrom: undefined, dateTo: undefined })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activePreset === p.value || (!activePreset && p.value === 'last28')
                  ? 'bg-white text-[#1B3A6B] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => update({ preset: 'custom' })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activePreset === 'custom' ? 'bg-white text-[#1B3A6B] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Custom
          </button>
        </div>
      )}

      {/* Custom date range */}
      {!hide.includes('date') && activePreset === 'custom' && (
        <>
          <input
            type="date"
            className="input h-9 text-sm w-36"
            value={current.dateFrom ?? ''}
            onChange={(e) => update({ dateFrom: e.target.value })}
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="date"
            className="input h-9 text-sm w-36"
            value={current.dateTo ?? ''}
            onChange={(e) => update({ dateTo: e.target.value })}
          />
        </>
      )}

      {/* Grade */}
      {!hide.includes('grade') && (
        <select
          value={current.grade ?? ''}
          onChange={(e) => update({ grade: e.target.value, form: undefined })}
          className="input h-9 text-sm w-32"
        >
          <option value="">All grades</option>
          {PASTORAL_GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      )}

      {/* Form */}
      {!hide.includes('form') && options?.forms && options.forms.length > 0 && (
        <select
          value={current.form ?? ''}
          onChange={(e) => update({ form: e.target.value })}
          className="input h-9 text-sm w-32"
        >
          <option value="">All forms</option>
          {options.forms
            .filter((f) => !current.grade || f.startsWith(current.grade.replace('G', 'G')))
            .map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      )}

      {/* Subject */}
      {!hide.includes('subject') && options?.subjects && options.subjects.length > 0 && (
        <select
          value={current.subject ?? ''}
          onChange={(e) => update({ subject: e.target.value })}
          className="input h-9 text-sm w-40"
        >
          <option value="">All subjects</option>
          {options.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}

      {/* Teacher */}
      {!hide.includes('teacher') && options?.teachers && options.teachers.length > 0 && (
        <select
          value={current.teacher ?? ''}
          onChange={(e) => update({ teacher: e.target.value })}
          className="input h-9 text-sm w-44"
        >
          <option value="">All teachers</option>
          {options.teachers.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}

      {/* Student search */}
      {!hide.includes('student') && (
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Student name…"
            value={studentInput}
            onChange={(e) => {
              const val = e.target.value
              setStudentInput(val)
              if (studentDebounce.current) clearTimeout(studentDebounce.current)
              studentDebounce.current = setTimeout(() => {
                update({ student: val || undefined })
              }, 400)
            }}
            className="input pl-8 h-9 text-sm w-44"
          />
        </div>
      )}

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors ml-1"
        >
          <X size={14} />
          Clear
        </button>
      )}
    </div>
  )
}
