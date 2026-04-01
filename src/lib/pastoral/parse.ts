import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { PastoralEventType } from '@/types/pastoral'

export interface RawRow {
  Student?: string
  Name?: string
  Form?: string
  Subject?: string
  Teacher?: string
  Date?: string | number
  Description?: string
  [key: string]: unknown
}

export interface NormalisedRow {
  student: string
  name: string
  form: string
  subject: string
  teacher: string
  event_date: string         // ISO YYYY-MM-DD
  description: string
  grade_code: string
  event_type: PastoralEventType
  academic_year: string
  event_uid: string
}

// ── Date parsing ──────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function parseDate(raw: string | number | undefined): string | null {
  if (raw === undefined || raw === null || raw === '') return null

  // Excel serial date (number)
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    return null
  }

  const s = String(raw).trim()
  if (!s) return null

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // DD/MM/YYYY or MM/DD/YYYY — treat as DD/MM/YYYY (iSAMS default)
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, d, m, y] = slashMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD-MM-YYYY
  const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dashMatch) {
    const [, d, m, y] = dashMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // "01 Apr 2026" or "1 April 2026"
  const wordMatch = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (wordMatch) {
    const [, d, mon, y] = wordMatch
    const m = MONTHS[mon.slice(0, 3).toLowerCase()]
    if (m) return `${y}-${String(m).padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // "Apr 01, 2026"
  const usWordMatch = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (usWordMatch) {
    const [, mon, d, y] = usWordMatch
    const m = MONTHS[mon.slice(0, 3).toLowerCase()]
    if (m) return `${y}-${String(m).padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Try native Date as last resort
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }

  return null
}

// ── Grade code derivation ─────────────────────────────────────────────────────

export function deriveGradeCode(form: string): string {
  const m = form.match(/^(G\d+)/i)
  return m ? m[1].toUpperCase() : form.slice(0, 3).toUpperCase()
}

// ── Event type derivation ─────────────────────────────────────────────────────

export function deriveEventType(name: string): PastoralEventType {
  const n = name.toLowerCase().trim()
  if (n.includes('intervention')) return 'Intervention'
  if (n.includes('positive reward') || n.includes('house point') || n.includes('housepoint')) return 'HousePoint'
  if (n === 'late' || n === 'lates' || n.includes('secondary late') || n.includes('late ')) return 'Late'
  return 'Other'
}

// ── Academic year derivation ──────────────────────────────────────────────────

export function deriveAcademicYear(dateStr: string): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  if (month >= 8) {
    return `${year}-${String(year + 1).slice(-2)}`
  }
  return `${year - 1}-${String(year).slice(-2)}`
}

// ── EventUID ─────────────────────────────────────────────────────────────────

function buildEventUid(student: string, name: string, form: string, subject: string, teacher: string, date: string, description: string): string {
  const parts = [student, name, form, subject, teacher, date, description]
  return parts.map((p) => p.trim().toLowerCase()).join('|')
}

// ── Row normalisation ─────────────────────────────────────────────────────────

export interface NormalisationError {
  rowIndex: number
  reason: string
  raw: string
}

export function normaliseRow(raw: RawRow, idx: number): { row: NormalisedRow | null; error: NormalisationError | null } {
  const student = String(raw.Student ?? '').trim()
  const name = String(raw.Name ?? '').trim()
  const form = String(raw.Form ?? '').trim()
  const subject = String(raw.Subject ?? '').trim()
  const teacher = String(raw.Teacher ?? '').trim()
  const description = String(raw.Description ?? '').trim()

  if (!student || !name || !form) {
    return { row: null, error: { rowIndex: idx, reason: 'Missing required field (Student, Name, or Form)', raw: JSON.stringify(raw) } }
  }

  const event_date = parseDate(raw.Date)
  if (!event_date) {
    return { row: null, error: { rowIndex: idx, reason: `Could not parse date: "${raw.Date}"`, raw: JSON.stringify(raw) } }
  }

  const grade_code = deriveGradeCode(form)
  const event_type = deriveEventType(name)
  const academic_year = deriveAcademicYear(event_date)
  const event_uid = buildEventUid(student, name, form, subject, teacher, event_date, description)

  return {
    row: { student, name, form, subject, teacher, event_date, description, grade_code, event_type, academic_year, event_uid },
    error: null,
  }
}

// ── File parsing ──────────────────────────────────────────────────────────────

export async function parseCsv(text: string): Promise<RawRow[]> {
  const result = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })
  return result.data
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<RawRow[]> {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' })
}
