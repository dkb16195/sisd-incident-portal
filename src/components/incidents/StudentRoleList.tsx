'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateStudentRole } from '@/app/(app)/incidents/[id]/actions'
import { STUDENT_ROLE_LABELS } from '@/lib/utils'
import type { IncidentStudent, Student, StudentRole } from '@/types/database'

type IncidentStudentWithStudent = IncidentStudent & { student: Student }

const ROLES: StudentRole[] = ['involved', 'victim', 'perpetrator', 'witness']

interface Props {
  incidentId: string
  incidentStudents: IncidentStudentWithStudent[]
}

export default function StudentRoleList({ incidentId, incidentStudents }: Props) {
  const [roles, setRoles] = useState<Record<string, StudentRole>>(
    Object.fromEntries(incidentStudents.map((is) => [is.id, is.role]))
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  if (!incidentStudents.length) {
    return <p className="text-xs text-gray-400">No students linked.</p>
  }

  function handleRoleChange(incidentStudentId: string, newRole: StudentRole) {
    setRoles((prev) => ({ ...prev, [incidentStudentId]: newRole }))
    setErrors((prev) => { const next = { ...prev }; delete next[incidentStudentId]; return next })
    setSaving(incidentStudentId)

    startTransition(async () => {
      const res = await updateStudentRole(incidentStudentId, newRole, incidentId)
      setSaving(null)
      if (res?.error) {
        setErrors((prev) => ({ ...prev, [incidentStudentId]: res.error! }))
      }
    })
  }

  return (
    <ul className="space-y-2.5">
      {incidentStudents.map(({ id: isId, student }) => (
        <li key={isId} className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[#1B3A6B] text-xs font-medium">
              {student.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/students/${student.id}`}
              className="text-sm font-medium text-gray-900 hover:text-[#1B3A6B] transition-colors leading-snug block truncate"
            >
              {student.full_name}
            </Link>
            <p className="text-xs text-gray-400">{student.grade} · {student.year_group}</p>
            <select
              value={roles[isId]}
              onChange={(e) => handleRoleChange(isId, e.target.value as StudentRole)}
              disabled={saving === isId}
              className="mt-1 text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A6B] disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{STUDENT_ROLE_LABELS[r]}</option>
              ))}
            </select>
            {errors[isId] && (
              <p className="text-xs text-red-500 mt-0.5">{errors[isId]}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
