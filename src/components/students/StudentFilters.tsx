'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useCallback, useTransition } from 'react'
import { GRADES } from '@/lib/utils'

interface Props {
  canChooseGrade: boolean
  currentParams: { grade?: string; q?: string }
}

export default function StudentFilters({ canChooseGrade, currentParams }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const update = useCallback(
    (key: string, value: string) => {
      const merged = { ...currentParams, [key]: value }
      const params = new URLSearchParams()
      Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
      startTransition(() => router.replace(`${pathname}?${params.toString()}`))
    },
    [currentParams, pathname, router]
  )

  const clear = useCallback(() => {
    startTransition(() => router.replace(pathname))
  }, [pathname, router])

  const hasFilters = Object.values(currentParams).some(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search name or ID…"
          defaultValue={currentParams.q ?? ''}
          onChange={(e) => update('q', e.target.value)}
          className="input pl-8 h-9 text-sm w-52"
        />
      </div>

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

      {hasFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
          Clear
        </button>
      )}
    </div>
  )
}
