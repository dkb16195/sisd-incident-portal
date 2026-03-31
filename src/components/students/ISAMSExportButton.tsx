'use client'

import { Download } from 'lucide-react'
import Button from '@/components/ui/Button'
import { INCIDENT_TYPE_LABELS, SEVERITY_LABELS, INCIDENT_STATUS_LABELS, STUDENT_ROLE_LABELS, formatDate } from '@/lib/utils'
import type { Student, Incident, IncidentStudent } from '@/types/database'

type IncidentStudentWithIncident = IncidentStudent & { incident: Incident }

interface Props {
  student: Student
  involvements: IncidentStudentWithIncident[]
}

function buildISAMSNote(student: Student, involvements: IncidentStudentWithIncident[]): string {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const lines: string[] = []

  lines.push(`INCIDENT HISTORY — ${student.full_name.toUpperCase()}`)
  lines.push(`${student.grade} | ${student.year_group} | ID: ${student.student_id}`)
  lines.push(`Exported: ${today}`)
  lines.push(`${'─'.repeat(60)}`)
  lines.push('')

  if (involvements.length === 0) {
    lines.push('No incidents recorded for this student.')
    return lines.join('\n')
  }

  lines.push(`Total incidents: ${involvements.length}`)
  lines.push('')

  involvements.forEach((inv, i) => {
    const inc = inv.incident
    lines.push(`${i + 1}. ${inc.title}`)
    lines.push(`   Date:     ${formatDate(inc.incident_date)}`)
    lines.push(`   Type:     ${INCIDENT_TYPE_LABELS[inc.incident_type] ?? inc.incident_type}`)
    lines.push(`   Severity: ${SEVERITY_LABELS[inc.severity] ?? inc.severity}`)
    lines.push(`   Status:   ${INCIDENT_STATUS_LABELS[inc.status] ?? inc.status}`)
    lines.push(`   Role:     ${STUDENT_ROLE_LABELS[inv.role] ?? inv.role}`)
    lines.push(`   Location: ${inc.location}`)
    if (inc.description) {
      // Wrap description at ~60 chars
      const words = inc.description.replace(/\s+/g, ' ').trim().split(' ')
      let line = '   Details: '
      const indent = '             '
      words.forEach((word) => {
        if (line.length + word.length + 1 > 70) {
          lines.push(line)
          line = indent + word
        } else {
          line += (line === '   Details: ' ? '' : ' ') + word
        }
      })
      if (line.trim()) lines.push(line)
    }
    lines.push('')
  })

  lines.push(`${'─'.repeat(60)}`)
  lines.push('Logged via SISD Incident Portal')

  return lines.join('\n')
}

export default function ISAMSExportButton({ student, involvements }: Props) {
  function handleExport() {
    const text = buildISAMSNote(student, involvements)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${student.student_id}-isams-note.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleExport}>
      <Download size={14} />
      Export for iSAMS
    </Button>
  )
}
