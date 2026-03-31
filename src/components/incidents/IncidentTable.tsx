'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { formatDate, isOverdue, checklistProgress, getIncidentTypeLabel } from '@/lib/utils'
import type { IncidentWithStudents } from '@/types/database'

interface Props {
  incidents: IncidentWithStudents[]
  currentUserId: string
  userRole: string
}

export default function IncidentTable({ incidents, currentUserId, userRole }: Props) {
  if (incidents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-sm">No incidents match your filters.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Incident</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Grade</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Checklist</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {incidents.map((incident) => {
            const overdue = isOverdue(incident.created_at, incident.status)
            const cl = incident.investigation_checklist
            const progress = cl
              ? checklistProgress(cl)
              : { complete: 0, total: 5 }
            const studentCount = incident.incident_students?.length ?? 0

            return (
              <tr
                key={incident.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="group"
                  >
                    <div className="flex items-start gap-2">
                      {overdue && (
                        <span title="Open for more than 14 days">
                          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-[#1B3A6B] transition-colors leading-snug">
                          {incident.title}
                        </p>
                        {studentCount > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {studentCount} student{studentCount !== 1 ? 's' : ''} linked
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {getIncidentTypeLabel(incident.incident_type, incident.custom_incident_type)}
                </td>
                <td className="px-4 py-3 text-gray-600">{incident.grade}</td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={incident.severity} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={incident.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1B3A6B] rounded-full transition-all"
                        style={{ width: `${(progress.complete / progress.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">
                      {progress.complete}/{progress.total}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDate(incident.incident_date)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
