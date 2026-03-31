'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useCallback, useTransition } from 'react'
import { GRADES, INCIDENT_TYPE_LABELS, INCIDENT_STATUS_LABELS, SEVERITY_LABELS } from '@/lib/utils'

interface Props {
  canChooseGrade: boolean
  currentParams: {
    status?: string
    severity?: string
    grade?: string
    type?: string
    q?: string
  }
}

const STATUSES = ['open', 'in_progress', 'resolved', 'referred']
const SEVERITIES = ['low', 'medium', 'high', 'critical']
const TYPES = ['bullying', 'physical_altercation', 'verbal_misconduct', 'peer_conflict', 'social_media', 'theft', 'property_damage', 'safeguarding', 'other']

export default function IncidentFilters({ canChooseGrade, currentParams }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams()
      const merged = { ...currentParams, [key]: value }
      Object.entries(merged).forEach(([k, v]) => {
        if (v) params.set(k, v)
      })
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    },
    [currentParams, pathname, router]
  )

  const clear = useCallback(() => {
    startTransition(() => {
      router.replace(pathname)
    })
  }, [pathname, router])

  const hasFilters = Object.values(currentParams).some(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search title…"
          defaultValue={currentParams.q ?? ''}
          onChange={(e) => update('q', e.target.value)}
          className="input pl-8 h-9 text-sm w-48"
        />
      </div>

      {/* Status */}
      <select
        value={currentParams.status ?? ''}
        onChange={(e) => update('status', e.target.value)}
        className="input h-9 text-sm w-36"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{INCIDENT_STATUS_LABELS[s]}</option>
        ))}
      </select>

      {/* Severity */}
      <select
        value={currentParams.severity ?? ''}
        onChange={(e) => update('severity', e.target.value)}
        className="input h-9 text-sm w-36"
      >
        <option value="">All severities</option>
        {SEVERITIES.map((s) => (
          <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
        ))}
      </select>

      {/* Type */}
      <select
        value={currentParams.type ?? ''}
        onChange={(e) => update('type', e.target.value)}
        className="input h-9 text-sm w-44"
      >
        <option value="">All types</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>{INCIDENT_TYPE_LABELS[t]}</option>
        ))}
      </select>

      {/* Grade — only for deputy/admin */}
      {canChooseGrade && (
        <select
          value={currentParams.grade ?? ''}
          onChange={(e) => update('grade', e.target.value)}
          className="input h-9 text-sm w-36"
        >
          <option value="">All grades</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
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
