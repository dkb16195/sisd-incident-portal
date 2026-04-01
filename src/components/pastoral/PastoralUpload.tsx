'use client'

import { useActionState, useRef } from 'react'
import { Upload, CheckCircle, AlertTriangle, X, FileText } from 'lucide-react'
import { uploadPastoralData } from '@/app/(app)/pastoral/upload/actions'
import Button from '@/components/ui/Button'
import type { ImportSummaryResult } from '@/types/pastoral'

const initialState: ImportSummaryResult | null = null

export default function PastoralUpload() {
  const [result, action, isPending] = useActionState(uploadPastoralData, initialState)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-6 max-w-2xl">
      <form action={action}>
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-[#1B3A6B]/30 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600 mb-1">Click to select a file</p>
          <p className="text-xs text-gray-400">CSV or XLSX — columns: Student, Name, Form, Subject, Teacher, Date, Description</p>
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                e.target.closest('form')?.requestSubmit()
              }
            }}
          />
        </div>

        {/* Manual submit fallback */}
        <div className="mt-3 flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Importing…' : 'Import'}
          </Button>
        </div>
      </form>

      {isPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-700">
          Processing file — this may take a moment for large datasets…
        </div>
      )}

      {result && !isPending && (
        <div className={`rounded-xl border p-5 space-y-4 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {result.error ? (
            <div className="flex items-start gap-2 text-red-700">
              <X size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{result.error}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600 shrink-0" />
                <p className="text-sm font-semibold text-green-800">Import complete</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Rows read', value: result.rowsRead, colour: 'text-gray-700' },
                  { label: 'Inserted', value: result.rowsInserted, colour: 'text-green-700' },
                  { label: 'Duplicates skipped', value: result.rowsDuplicate, colour: 'text-amber-700' },
                  { label: 'Failed', value: result.rowsFailed, colour: 'text-red-700' },
                ].map(({ label, value, colour }) => (
                  <div key={label} className="bg-white rounded-lg border border-gray-100 p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className={`text-2xl font-bold ${colour}`}>{value}</p>
                  </div>
                ))}
              </div>

              {result.latestDate && (
                <p className="text-xs text-gray-500">
                  Latest event date in file: <span className="font-medium">{result.latestDate}</span>
                </p>
              )}

              {result.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <p className="text-xs font-semibold text-amber-700">Row errors (first 20 shown)</p>
                  </div>
                  <ul className="space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-amber-800 font-mono">{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Format help */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Expected columns</p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-2 text-gray-400 font-medium">Column</th>
              <th className="text-left pb-2 text-gray-400 font-medium">Type</th>
              <th className="text-left pb-2 text-gray-400 font-medium">Example</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              ['Student', 'Text', 'Smith, John'],
              ['Name', 'Text', 'Secondary Intervention'],
              ['Form', 'Text', 'G8L1'],
              ['Subject', 'Text', 'Mathematics'],
              ['Teacher', 'Text', 'Mr Jones'],
              ['Date', 'Date', '01/04/2026'],
              ['Description', 'Text (optional)', 'Disruptive in class'],
            ].map(([col, type, ex]) => (
              <tr key={col}>
                <td className="py-1.5 font-medium text-gray-700">{col}</td>
                <td className="py-1.5 text-gray-500">{type}</td>
                <td className="py-1.5 text-gray-400 font-mono">{ex}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
