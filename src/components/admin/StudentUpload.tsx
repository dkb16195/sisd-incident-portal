'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react'
import { upsertStudents } from '@/app/(app)/admin/actions'
import Button from '@/components/ui/Button'

interface ParsedRow {
  full_name: string
  grade: string
  year_group: string
  student_id: string
}

type UploadState = 'idle' | 'preview' | 'success' | 'error'

// ── RFC-4180 CSV parser ────────────────────────────────────────────────────
// Handles quoted fields, embedded commas, embedded newlines, and BOM.
function parseCSVRaw(text: string): string[][] {
  // Strip BOM
  const raw = text.replace(/^\uFEFF/, '')

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < raw.length) {
    const ch = raw[i]
    const next = raw[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        // Escaped quote
        field += '"'
        i += 2
      } else if (ch === '"') {
        inQuotes = false
        i++
      } else {
        field += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        row.push(field)
        field = ''
        i++
      } else if (ch === '\r' && next === '\n') {
        row.push(field)
        field = ''
        rows.push(row)
        row = []
        i += 2
      } else if (ch === '\n' || ch === '\r') {
        row.push(field)
        field = ''
        rows.push(row)
        row = []
        i++
      } else {
        field += ch
        i++
      }
    }
  }

  // Push final field/row
  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop empty trailing row
  if (rows.length > 0 && rows[rows.length - 1].every((c) => c === '')) {
    rows.pop()
  }

  return rows
}

// ── iSAMS format detection ─────────────────────────────────────────────────
function isISAMSFormat(headers: string[]): boolean {
  const required = ['forename', 'surname', 'form', 'pupil email address']
  return required.every((h) => headers.includes(h))
}

// ── Parse iSAMS export ─────────────────────────────────────────────────────
function parseISAMS(rows: string[][]): { rows: ParsedRow[]; error?: string } {
  const headers = rows[0].map((h) => h.trim().toLowerCase())

  const col = (name: string) => headers.indexOf(name)
  const iForename = col('forename')
  const iPreferred = col('preferred name')
  const iSurname = col('surname')
  const iForm = col('form')
  const iEmail = col('pupil email address')

  // Deduplicate by pupil email — keep first occurrence
  const seen = new Map<string, ParsedRow>()

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.every((c) => c === '')) continue

    const email = (r[iEmail] ?? '').trim().toLowerCase()
    if (!email || seen.has(email)) continue

    // Name: use Preferred Name if set and different from Forename
    const forename = (r[iForename] ?? '').trim()
    const preferred = iPreferred >= 0 ? (r[iPreferred] ?? '').trim() : ''
    const surname = (r[iSurname] ?? '').trim()
    const firstName = preferred && preferred !== forename ? preferred : forename
    const full_name = `${firstName} ${surname}`.trim()

    // Grade: extract number from Form like "G10G1", "G9B2", "G7B1"
    const form = (r[iForm] ?? '').trim()
    const gradeMatch = form.match(/^G(\d+)/i)
    if (!gradeMatch) continue // skip rows with no recognisable grade
    const gradeNum = parseInt(gradeMatch[1], 10)
    const grade = `Grade ${gradeNum}`
    const year_group = `Year ${gradeNum + 1}`

    // Student ID: email prefix before @
    const student_id = email.split('@')[0]

    if (!full_name || !student_id) continue

    seen.set(email, { full_name, grade, year_group, student_id })
  }

  const parsed = Array.from(seen.values())
  if (parsed.length === 0) {
    return { rows: [], error: 'No valid student rows found in the iSAMS export.' }
  }
  return { rows: parsed }
}

// ── Parse simple format: full_name, grade, year_group, student_id ──────────
const REQUIRED_HEADERS = ['full_name', 'grade', 'year_group', 'student_id']

function parseSimple(rows: string[][]): { rows: ParsedRow[]; error?: string } {
  const headers = rows[0].map((h) => h.trim().toLowerCase())
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h))
  if (missing.length > 0) {
    return { rows: [], error: `Missing columns: ${missing.join(', ')}` }
  }

  const idx = (col: string) => headers.indexOf(col)
  const parsed: ParsedRow[] = []
  const errors: string[] = []

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    if (!cols || cols.every((c) => c === '')) continue

    const row: ParsedRow = {
      full_name: (cols[idx('full_name')] ?? '').trim(),
      grade: (cols[idx('grade')] ?? '').trim(),
      year_group: (cols[idx('year_group')] ?? '').trim(),
      student_id: (cols[idx('student_id')] ?? '').trim(),
    }

    if (!row.full_name || !row.grade || !row.year_group || !row.student_id) {
      errors.push(`Row ${i + 1}: missing required field(s)`)
      continue
    }
    parsed.push(row)
  }

  const error =
    errors.length > 0
      ? `${errors.length} row(s) skipped: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? ' …' : ''}`
      : undefined

  return { rows: parsed, error }
}

// ── Main entry point ───────────────────────────────────────────────────────
function parseCSV(text: string): { rows: ParsedRow[]; error?: string; format?: string } {
  const raw = parseCSVRaw(text)
  if (raw.length < 2) return { rows: [], error: 'CSV file appears to be empty.' }

  const headers = raw[0].map((h) => h.trim().toLowerCase())

  if (isISAMSFormat(headers)) {
    const result = parseISAMS(raw)
    return { ...result, format: 'iSAMS' }
  }

  return { ...parseSimple(raw), format: 'simple' }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function StudentUpload({ currentCount }: { currentCount: number }) {
  const [state, setState] = useState<UploadState>('idle')
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null)
  const [result, setResult] = useState<{ count?: number; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setParseError(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { rows, error, format } = parseCSV(text)
      setDetectedFormat(format ?? null)
      if (rows.length === 0 && error) {
        setParseError(error)
        setState('error')
        return
      }
      setPreview(rows)
      if (error) setParseError(error)
      setState('preview')
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  function handleConfirm() {
    startTransition(async () => {
      const res = await upsertStudents(preview)
      setResult(res)
      setState(res.error ? 'error' : 'success')
    })
  }

  function reset() {
    setState('idle')
    setPreview([])
    setParseError(null)
    setFileName('')
    setDetectedFormat(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle size={40} className="text-green-500 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Upload complete</h3>
        <p className="text-sm text-gray-500 mb-6">
          {result?.count} student record{result?.count !== 1 ? 's' : ''} added or updated.
        </p>
        <Button variant="secondary" onClick={reset}>Upload another file</Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Student list</h2>
          <p className="text-sm text-gray-500">
            {currentCount} student{currentCount !== 1 ? 's' : ''} in the system.
            Upload a CSV to add or update records.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      {state === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-[#1B3A6B]/50 transition-colors"
        >
          <Upload size={32} className="mx-auto text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">Drop a CSV file here</p>
          <p className="text-xs text-gray-400 mb-4">
            Accepts iSAMS exports or a CSV with columns: full_name, grade, year_group, student_id
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Browse file
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>
      )}

      {/* Error state */}
      {state === 'error' && !preview.length && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle size={28} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm font-medium text-red-700 mb-4">{parseError ?? result?.error}</p>
          <Button variant="secondary" size="sm" onClick={reset}>Try again</Button>
        </div>
      )}

      {/* Preview */}
      {state === 'preview' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="font-medium">{fileName}</span>
              {detectedFormat === 'iSAMS' && (
                <span className="text-xs bg-[#1B3A6B]/10 text-[#1B3A6B] px-2 py-0.5 rounded-md font-medium">iSAMS</span>
              )}
              <span className="text-gray-400">—</span>
              <span>{preview.length} students</span>
            </div>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {parseError && (
            <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ {parseError}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4 max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Grade</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Year group</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Student ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-900">{row.full_name}</td>
                    <td className="px-4 py-2 text-gray-500">{row.grade}</td>
                    <td className="px-4 py-2 text-gray-500">{row.year_group}</td>
                    <td className="px-4 py-2 text-gray-400 font-mono text-xs">{row.student_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && (
              <p className="text-xs text-gray-400 text-center py-2 border-t border-gray-100">
                Showing first 50 of {preview.length} rows
              </p>
            )}
          </div>

          {result?.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              {result.error}
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={reset} disabled={isPending}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending ? 'Importing…' : `Import ${preview.length} records`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
