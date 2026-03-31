'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, STUDENT_ROLE_LABELS } from '@/lib/utils'
import type { Student, StudentRole } from '@/types/database'

export interface SelectedStudent {
  student: Student
  role: StudentRole
}

interface Props {
  selected: SelectedStudent[]
  onChange: (students: SelectedStudent[]) => void
}

const ROLES: StudentRole[] = ['involved', 'victim', 'perpetrator', 'witness']

export default function StudentSearch({ selected, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedIds = new Set(selected.map((s) => s.student.id))

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) { setResults([]); setOpen(false); return }
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', `%${q}%`)
        .order('full_name')
        .limit(10)
      setResults((data ?? []).filter((s) => !selectedIds.has(s.id)))
      setOpen(true)
      setActiveIndex(0)
      setLoading(false)
    },
    [selectedIds]
  )

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200)
    return () => clearTimeout(timer)
  }, [query, search])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function addStudent(student: Student) {
    onChange([...selected, { student, role: 'involved' }])
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  function removeStudent(id: string) {
    onChange(selected.filter((s) => s.student.id !== id))
  }

  function updateRole(id: string, role: StudentRole) {
    onChange(selected.map((s) => (s.student.id === id ? { ...s, role } : s)))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[activeIndex]) addStudent(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && setOpen(true)}
            placeholder="Search students by name…"
            disabled={false}
            className="input pl-9"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-[#1B3A6B]/30 border-t-[#1B3A6B] rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div
            ref={dropdownRef}
            className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
          >
            {results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No students found.</p>
            ) : (
              <ul>
                {results.map((student, i) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => addStudent(student)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                        i === activeIndex ? 'bg-[#1B3A6B]/5' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="w-7 h-7 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0">
                        <span className="text-[#1B3A6B] text-xs font-medium">
                          {student.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.full_name}</p>
                        <p className="text-xs text-gray-400">{student.grade} · {student.year_group} · {student.student_id}</p>
                      </div>
                      <UserPlus size={14} className="ml-auto text-gray-300" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Selected students */}
      {selected.length > 0 && (
        <ul className="space-y-2">
          {selected.map(({ student, role }) => (
            <li
              key={student.id}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0">
                <span className="text-[#1B3A6B] text-xs font-medium">
                  {student.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{student.full_name}</p>
                <p className="text-xs text-gray-400">{student.year_group}</p>
              </div>
              <select
                value={role}
                onChange={(e) => updateRole(student.id, e.target.value as StudentRole)}
                className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{STUDENT_ROLE_LABELS[r]}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeStudent(student.id)}
                className="text-gray-300 hover:text-red-500 transition-colors ml-1"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected.length === 0 && (
        <p className="text-xs text-gray-400">No students added yet.</p>
      )}
    </div>
  )
}
