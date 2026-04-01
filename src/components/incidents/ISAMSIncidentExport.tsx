'use client'

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import {
  getIncidentTypeLabel,
  SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  STUDENT_ROLE_LABELS,
  formatDate,
  formatDateTime,
} from '@/lib/utils'
import type { IncidentWithStudents } from '@/types/database'

interface Props {
  incident: IncidentWithStudents
}

function buildText(incident: IncidentWithStudents): string {
  const lines: string[] = []

  lines.push(`INCIDENT NOTE — ${formatDate(incident.incident_date)}`)
  lines.push(`${'─'.repeat(60)}`)
  lines.push(`Title:    ${incident.title}`)
  lines.push(`Type:     ${getIncidentTypeLabel(incident.incident_type, incident.custom_incident_type)}`)
  lines.push(`Severity: ${SEVERITY_LABELS[incident.severity] ?? incident.severity}`)
  lines.push(`Status:   ${INCIDENT_STATUS_LABELS[incident.status] ?? incident.status}`)
  lines.push(`Date:     ${formatDate(incident.incident_date)}${incident.incident_time ? ` at ${incident.incident_time}` : ''}`)
  lines.push(`Location: ${incident.location}`)
  lines.push(`Grade:    ${incident.grade}`)

  if (incident.logged_by_profile) {
    lines.push(`Logged by: ${incident.logged_by_profile.full_name} on ${formatDateTime(incident.created_at)}`)
  }

  if (incident.incident_students?.length) {
    lines.push('')
    lines.push('Students involved:')
    for (const is of incident.incident_students) {
      const s = is.student
      lines.push(`  • ${s.full_name} (${s.grade}, ${s.year_group}) — ${STUDENT_ROLE_LABELS[is.role] ?? is.role}`)
    }
  }

  lines.push('')
  lines.push('Description:')
  lines.push(incident.description)

  const cl = incident.investigation_checklist
  if (cl) {
    lines.push('')
    lines.push('Investigation:')
    lines.push(`  Statements taken:   ${cl.statements_taken ? `Yes${cl.statements_taken_date ? ` (${formatDate(cl.statements_taken_date)})` : ''}` : 'No'}`)
    lines.push(`  Parents contacted:  ${cl.parents_contacted ? `Yes${cl.parents_contacted_date ? ` (${formatDate(cl.parents_contacted_date)})` : ''}` : 'No'}`)
    lines.push(`  Referred to Deputy: ${cl.referred_to_deputy ? `Yes${cl.referred_to_deputy_date ? ` (${formatDate(cl.referred_to_deputy_date)})` : ''}` : 'No'}`)
    if (cl.sanctions_applied) {
      lines.push(`  Sanction applied:   Yes — ${cl.sanctions_applied_type ?? ''}${cl.sanctions_applied_date ? ` (${formatDate(cl.sanctions_applied_date)})` : ''}`)
    } else {
      lines.push(`  Sanction applied:   No`)
    }
    lines.push(`  Follow-up scheduled:${cl.follow_up_scheduled ? ` Yes${cl.follow_up_scheduled_date ? ` (${formatDate(cl.follow_up_scheduled_date)})` : ''}` : ' No'}`)
  }

  lines.push('')
  lines.push(`${'─'.repeat(60)}`)
  lines.push('Logged via SISD Incident Portal')

  return lines.join('\n')
}

export default function ISAMSIncidentExport({ incident }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const text = buildText(incident)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setExpanded(true) // fallback: show textarea so user can copy manually
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#1B3A6B] mb-3">
        iSAMS export
      </h2>
      <p className="text-xs text-gray-400 mb-3 leading-relaxed">
        Copy formatted incident notes to paste into iSAMS Student Notes.
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            copied
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy for iSAMS'}
        </button>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Hide' : 'Preview'}
        </button>
      </div>

      {expanded && (
        <textarea
          readOnly
          value={text}
          className="mt-3 w-full text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]/30"
          rows={20}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
      )}
    </section>
  )
}
