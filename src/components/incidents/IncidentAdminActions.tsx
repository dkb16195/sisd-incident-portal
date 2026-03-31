'use client'

import { useState, useTransition } from 'react'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { archiveIncident, deleteIncident } from '@/app/(app)/incidents/[id]/actions'
import Button from '@/components/ui/Button'

interface Props {
  incidentId: string
  isArchived: boolean
}

export default function IncidentAdminActions({ incidentId, isArchived }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    setError(null)
    startTransition(async () => {
      const res = await archiveIncident(incidentId, !isArchived)
      if (res?.error) setError(res.error)
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteIncident(incidentId)
      if (res && 'error' in res && res.error) setError(res.error)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
        Admin actions
      </h2>

      <div className="space-y-2">
        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start"
          onClick={handleArchive}
          disabled={isPending}
        >
          {isArchived
            ? <><ArchiveRestore size={14} /> Unarchive incident</>
            : <><Archive size={14} /> Archive incident</>
          }
        </Button>

        {!showDeleteConfirm ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending}
          >
            <Trash2 size={14} />
            Delete incident
          </Button>
        ) : (
          <div className="border border-red-200 rounded-lg p-3 bg-red-50 space-y-2">
            <p className="text-xs text-red-700 font-medium">
              This permanently deletes the incident and all linked data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? 'Deleting…' : 'Yes, delete'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
