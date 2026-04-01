'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseCsv, parseXlsx, normaliseRow } from '@/lib/pastoral/parse'
import type { ImportSummaryResult } from '@/types/pastoral'

export async function uploadPastoralData(_prev: ImportSummaryResult | null, formData: FormData): Promise<ImportSummaryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, rowsRead: 0, rowsInserted: 0, rowsDuplicate: 0, rowsFailed: 0, latestDate: null, errors: [], error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { success: false, rowsRead: 0, rowsInserted: 0, rowsDuplicate: 0, rowsFailed: 0, latestDate: null, errors: [], error: 'No file selected' }

  const adminSupabase = createAdminClient()
  const errors: string[] = []
  let rawRows: ReturnType<typeof Array<Record<string, unknown>>>

  try {
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv') || file.type === 'text/csv') {
      const text = await file.text()
      rawRows = await parseCsv(text) as any[]
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer()
      rawRows = await parseXlsx(buffer) as any[]
    } else {
      return { success: false, rowsRead: 0, rowsInserted: 0, rowsDuplicate: 0, rowsFailed: 0, latestDate: null, errors: [], error: 'Unsupported file type. Upload a CSV or XLSX file.' }
    }
  } catch (e) {
    return { success: false, rowsRead: 0, rowsInserted: 0, rowsDuplicate: 0, rowsFailed: 0, latestDate: null, errors: [], error: `Failed to parse file: ${e instanceof Error ? e.message : 'Unknown error'}` }
  }

  const rowsRead = rawRows.length
  if (rowsRead === 0) return { success: false, rowsRead: 0, rowsInserted: 0, rowsDuplicate: 0, rowsFailed: 0, latestDate: null, errors: [], error: 'File is empty or has no data rows' }

  // Create batch record first
  const { data: batch, error: batchErr } = await adminSupabase
    .from('pastoral_upload_batches')
    .insert({ uploaded_by: user.id, filename: file.name, rows_read: rowsRead, rows_inserted: 0, rows_duplicate: 0, rows_failed: 0 })
    .select('id')
    .single()

  if (batchErr || !batch) {
    return { success: false, rowsRead, rowsInserted: 0, rowsDuplicate: 0, rowsFailed: 0, latestDate: null, errors: [], error: 'Failed to create import record' }
  }

  // Normalise rows
  const normalised: Array<{
    event_uid: string
    student: string
    name: string
    form: string
    subject: string
    teacher: string
    event_date: string
    description: string
    grade_code: string
    event_type: string
    academic_year: string
    uploaded_by: string
    upload_batch_id: string
  }> = []

  let failedCount = 0
  for (let i = 0; i < rawRows.length; i++) {
    const { row, error } = normaliseRow(rawRows[i] as any, i + 2)
    if (error) {
      failedCount++
      if (errors.length < 20) errors.push(`Row ${i + 2}: ${error.reason}`)
    } else if (row) {
      normalised.push({
        ...row,
        uploaded_by: user.id,
        upload_batch_id: batch.id,
      })
    }
  }

  // Batch upsert in chunks of 500 to avoid parameter limits
  const CHUNK_SIZE = 500
  let insertedCount = 0
  let duplicateCount = 0

  for (let i = 0; i < normalised.length; i += CHUNK_SIZE) {
    const chunk = normalised.slice(i, i + CHUNK_SIZE)
    const { error: insertErr, data: inserted } = await adminSupabase
      .from('pastoral_events')
      .upsert(chunk, { onConflict: 'event_uid', ignoreDuplicates: true })
      .select('id')

    if (insertErr) {
      errors.push(`Batch ${Math.floor(i / CHUNK_SIZE) + 1} error: ${insertErr.message}`)
      failedCount += chunk.length
    } else {
      insertedCount += inserted?.length ?? 0
    }
  }

  duplicateCount = normalised.length - failedCount - insertedCount

  // Find latest event date
  let latestDate: string | null = null
  if (normalised.length > 0) {
    const sorted = [...normalised].sort((a, b) => b.event_date.localeCompare(a.event_date))
    latestDate = sorted[0].event_date
  }

  // Update batch record
  await adminSupabase
    .from('pastoral_upload_batches')
    .update({ rows_inserted: insertedCount, rows_duplicate: duplicateCount, rows_failed: failedCount, latest_event_date: latestDate })
    .eq('id', batch.id)

  revalidatePath('/pastoral')
  revalidatePath('/pastoral/rule-of-25')
  revalidatePath('/pastoral/weekly-changes')
  revalidatePath('/pastoral/weekly-summary')
  revalidatePath('/pastoral/trends')
  revalidatePath('/pastoral/weekly-report')

  return {
    success: true,
    rowsRead,
    rowsInserted: insertedCount,
    rowsDuplicate: duplicateCount,
    rowsFailed: failedCount,
    latestDate,
    errors,
  }
}
