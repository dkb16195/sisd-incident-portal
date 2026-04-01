import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const GRADES = [
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
] as const

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  bullying: 'Bullying',
  physical_altercation: 'Physical Altercation',
  verbal_misconduct: 'Verbal Misconduct',
  peer_conflict: 'Peer Conflict',
  social_media: 'Social Media',
  theft: 'Theft',
  property_damage: 'Property Damage',
  safeguarding: 'Safeguarding',
  vaping: 'Vaping',
  contraband: 'Contraband',
  rule_of_25_behaviour: 'Rule of 25 — Behaviour',
  rule_of_25_lates: 'Rule of 25 — Lates',
  other: 'Other',
}

// Incident types that automatically trigger a behaviour contract
export const CONTRACT_TRIGGER_TYPES = ['rule_of_25_behaviour', 'rule_of_25_lates'] as const

/**
 * Returns the display label for an incident type.
 * When type is 'other' and a custom value was entered, returns that value.
 */
export function getIncidentTypeLabel(
  incidentType: string,
  customType?: string | null
): string {
  if (incidentType === 'other' && customType?.trim()) return customType.trim()
  return INCIDENT_TYPE_LABELS[incidentType] ?? incidentType
}

export const SANCTION_LABELS: Record<string, string> = {
  break_time_reflection: 'Break time reflection',
  lunchtime_reflection: 'Lunchtime reflection',
  after_school_reflection: 'After school reflection',
  internal_reflection_day: 'Internal reflection day',
  behaviour_contract: 'Behaviour contract',
  monitoring_card: 'Monitoring card',
  warning_applied: 'Warning applied',
  intervention_isams: 'Intervention on iSAMS',
  other: 'Other',
}

export const SANCTION_TYPES = Object.keys(SANCTION_LABELS)

/**
 * Returns the display label for a sanction.
 * When type is 'other' and custom notes are provided, appends them.
 */
export function getSanctionLabel(
  sanctionType: string | null | undefined,
  notes?: string | null
): string {
  if (!sanctionType) return '—'
  if (sanctionType === 'other') return notes?.trim() ? `Other: ${notes.trim()}` : 'Other'
  return SANCTION_LABELS[sanctionType] ?? sanctionType
}

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  referred: 'Referred',
}

export const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const STUDENT_ROLE_LABELS: Record<string, string> = {
  involved: 'Involved',
  victim: 'Victim',
  perpetrator: 'Perpetrator',
  witness: 'Witness',
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function daysAgo(dateStr: string): number {
  const now = new Date()
  const date = new Date(dateStr)
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

export function isOverdue(createdAt: string, status: string): boolean {
  return ['open', 'in_progress'].includes(status) && daysAgo(createdAt) > 14
}

export function checklistProgress(checklist: {
  statements_taken: boolean
  parents_contacted: boolean
  referred_to_deputy: boolean
  sanctions_applied: boolean
  follow_up_scheduled: boolean
}): { complete: number; total: number } {
  const fields = [
    checklist.statements_taken,
    checklist.parents_contacted,
    checklist.referred_to_deputy,
    checklist.sanctions_applied,
    checklist.follow_up_scheduled,
  ]
  return { complete: fields.filter(Boolean).length, total: 5 }
}
