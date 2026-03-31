import { formatDateTime } from '@/lib/utils'
import { AlertTriangle, MessageSquare } from 'lucide-react'

interface AuditEntry {
  id: string
  type: 'incident' | 'comment'
  actor: string
  description: string
  timestamp: string
}

interface Props {
  entries: AuditEntry[]
}

export default function AuditLog({ entries }: Props) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent activity</h2>
        <p className="text-sm text-gray-500">Last 50 actions across the system</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No activity yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className="mt-0.5 shrink-0">
                {entry.type === 'incident' ? (
                  <div className="w-7 h-7 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center">
                    <AlertTriangle size={13} className="text-[#1B3A6B]" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#E8A020]/15 flex items-center justify-center">
                    <MessageSquare size={13} className="text-[#E8A020]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">
                  <span className="font-medium">{entry.actor}</span>{' '}
                  {entry.description}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(entry.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
