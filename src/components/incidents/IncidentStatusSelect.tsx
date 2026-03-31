'use client'

import { useState, useTransition } from 'react'
import { updateIncidentStatus } from '@/app/(app)/incidents/[id]/actions'
import { INCIDENT_STATUS_LABELS } from '@/lib/utils'
import type { IncidentStatus } from '@/types/database'

const STATUSES: IncidentStatus[] = ['open', 'in_progress', 'resolved', 'referred']

interface Props {
  incidentId: string
  currentStatus: IncidentStatus
}

export default function IncidentStatusSelect({ incidentId, currentStatus }: Props) {
  const [status, setStatus] = useState<IncidentStatus>(currentStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as IncidentStatus
    setError(null)
    startTransition(async () => {
      const res = await updateIncidentStatus(incidentId, next)
      if (res?.error) {
        setError(res.error)
      } else {
        setStatus(next)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="text-xs text-gray-400">Change status</label>
      <select
        value={status}
        onChange={handleChange}
        disabled={isPending}
        className="input h-9 text-sm w-40"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{INCIDENT_STATUS_LABELS[s]}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
