'use client'

import { useState, useTransition } from 'react'
import { CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react'
import { saveChecklist, type ChecklistData } from '@/app/(app)/incidents/[id]/actions'
import Button from '@/components/ui/Button'
import { SANCTION_LABELS, SANCTION_TYPES, CONTRACT_TRIGGER_TYPES } from '@/lib/utils'
import type { InvestigationChecklist as ChecklistType } from '@/types/database'

// Non-sanctions checklist items
interface BaseChecklistItem {
  key: keyof Pick<ChecklistData,
    'statements_taken' | 'parents_contacted' | 'referred_to_deputy' | 'follow_up_scheduled'>
  dateKey: keyof Pick<ChecklistData,
    'statements_taken_date' | 'parents_contacted_date' | 'referred_to_deputy_date' | 'follow_up_scheduled_date'>
  notesKey: keyof Pick<ChecklistData,
    'statements_taken_notes' | 'parents_contacted_notes' | 'referred_to_deputy_notes' | 'follow_up_scheduled_notes'>
  label: string
  description: string
}

const BASE_ITEMS: BaseChecklistItem[] = [
  {
    key: 'statements_taken',
    dateKey: 'statements_taken_date',
    notesKey: 'statements_taken_notes',
    label: 'Statements taken',
    description: 'Written statements collected from all involved parties',
  },
  {
    key: 'parents_contacted',
    dateKey: 'parents_contacted_date',
    notesKey: 'parents_contacted_notes',
    label: 'Parents contacted',
    description: 'Parents or guardians notified by phone or email',
  },
  {
    key: 'referred_to_deputy',
    dateKey: 'referred_to_deputy_date',
    notesKey: 'referred_to_deputy_notes',
    label: 'Referred to Deputy Head',
    description: 'Escalated to Deputy Head if required',
  },
  {
    key: 'follow_up_scheduled',
    dateKey: 'follow_up_scheduled_date',
    notesKey: 'follow_up_scheduled_notes',
    label: 'Follow-up scheduled',
    description: 'Follow-up meeting or check-in arranged',
  },
]

const TOTAL_ITEMS = BASE_ITEMS.length + 1 // + sanctions

function initState(cl: ChecklistType | null, incidentType?: string): ChecklistData {
  const isContractTrigger = CONTRACT_TRIGGER_TYPES.includes(incidentType as typeof CONTRACT_TRIGGER_TYPES[number])
  return {
    statements_taken: cl?.statements_taken ?? false,
    statements_taken_date: cl?.statements_taken_date ?? null,
    statements_taken_notes: cl?.statements_taken_notes ?? null,
    parents_contacted: cl?.parents_contacted ?? false,
    parents_contacted_date: cl?.parents_contacted_date ?? null,
    parents_contacted_notes: cl?.parents_contacted_notes ?? null,
    referred_to_deputy: cl?.referred_to_deputy ?? false,
    referred_to_deputy_date: cl?.referred_to_deputy_date ?? null,
    referred_to_deputy_notes: cl?.referred_to_deputy_notes ?? null,
    sanctions_applied: cl?.sanctions_applied ?? false,
    sanctions_applied_date: cl?.sanctions_applied_date ?? null,
    // Auto-set behaviour_contract for Rule of 25 types if not already set
    sanctions_applied_type: cl?.sanctions_applied_type ?? (isContractTrigger ? 'behaviour_contract' : null),
    sanctions_applied_notes: cl?.sanctions_applied_notes ?? null,
    follow_up_scheduled: cl?.follow_up_scheduled ?? false,
    follow_up_scheduled_date: cl?.follow_up_scheduled_date ?? null,
    follow_up_scheduled_notes: cl?.follow_up_scheduled_notes ?? null,
  }
}

interface Props {
  incidentId: string
  checklist: ChecklistType | null
  incidentType?: string
}

export default function InvestigationChecklist({ incidentId, checklist, incidentType }: Props) {
  const [data, setData] = useState<ChecklistData>(() => initState(checklist, incidentType))
  const isContractTrigger = CONTRACT_TRIGGER_TYPES.includes(incidentType as typeof CONTRACT_TRIGGER_TYPES[number])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split('T')[0]

  const complete = [
    ...BASE_ITEMS.map((item) => !!data[item.key]),
    data.sanctions_applied,
  ].filter(Boolean).length

  function toggleItem(key: keyof ChecklistData & string, dateKey: keyof ChecklistData & string) {
    const next = !data[key as keyof ChecklistData]
    setData((prev) => ({
      ...prev,
      [key]: next,
      [dateKey]: next ? (prev[dateKey as keyof ChecklistData] || today) : null,
    }))
    setSaved(false)
  }

  function toggleSanctions() {
    const next = !data.sanctions_applied
    setData((prev) => ({
      ...prev,
      sanctions_applied: next,
      sanctions_applied_date: next ? (prev.sanctions_applied_date || today) : null,
      // Keep type/notes when unchecking so data isn't lost if re-checked
    }))
    setSaved(false)
  }

  function setField(key: keyof ChecklistData, value: string | null) {
    setData((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function validate(): string | null {
    if (data.sanctions_applied && !data.sanctions_applied_type) {
      return 'Please select a sanction before saving.'
    }
    if (
      data.sanctions_applied &&
      data.sanctions_applied_type === 'other' &&
      !data.sanctions_applied_notes?.trim()
    ) {
      return 'Please describe the sanction applied.'
    }
    return null
  }

  function handleSave() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await saveChecklist(incidentId, data)
      if (res?.error) {
        setError(res.error)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#1B3A6B]">
            Investigation checklist
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {complete} of {TOTAL_ITEMS} steps complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1B3A6B] rounded-full transition-all duration-300"
              style={{ width: `${(complete / TOTAL_ITEMS) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{complete}/{TOTAL_ITEMS}</span>
        </div>
      </div>

      {/* Contract notice */}
      {isContractTrigger && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
          <p className="font-semibold mb-0.5">Behaviour contract required</p>
          <p>Record the contract start date in the Sanctions section below. The 12-month review date will be calculated automatically.</p>
        </div>
      )}

      <div className="space-y-2">
        {/* Base items */}
        {BASE_ITEMS.map((item) => {
          const checked = !!data[item.key]
          const isExpanded = expanded === item.key

          return (
            <div key={item.key} className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleItem(item.key, item.dateKey)}
                  className="shrink-0 hover:opacity-70 transition-opacity"
                >
                  {checked
                    ? <CheckSquare size={18} className="text-[#1B3A6B]" />
                    : <Square size={18} className="text-gray-300" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${checked ? 'text-gray-900' : 'text-gray-600'}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : item.key)}
                  className="text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Date completed</label>
                    <input
                      type="date"
                      className="input h-8 text-xs w-44"
                      value={data[item.dateKey] ?? ''}
                      onChange={(e) => setField(item.dateKey, e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Notes</label>
                    <textarea
                      className="input text-xs min-h-[64px] resize-y w-full"
                      placeholder="Optional notes…"
                      value={data[item.notesKey] ?? ''}
                      onChange={(e) => setField(item.notesKey, e.target.value || null)}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Sanctions item — special case with sanction type selector */}
        {(() => {
          const checked = data.sanctions_applied
          const isExpanded = expanded === 'sanctions_applied'
          const needsSanctionType = checked && !data.sanctions_applied_type

          return (
            <div className={`border rounded-lg overflow-hidden ${needsSanctionType ? 'border-amber-300' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={toggleSanctions}
                  className="shrink-0 hover:opacity-70 transition-opacity"
                >
                  {checked
                    ? <CheckSquare size={18} className="text-[#1B3A6B]" />
                    : <Square size={18} className="text-gray-300" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${checked ? 'text-gray-900' : 'text-gray-600'}`}>
                    Sanctions applied
                  </p>
                  <p className="text-xs text-gray-400">
                    {checked && data.sanctions_applied_type
                      ? (SANCTION_LABELS[data.sanctions_applied_type] ?? data.sanctions_applied_type)
                      : 'Appropriate sanctions recorded and communicated'}
                  </p>
                  {needsSanctionType && (
                    <p className="text-xs text-amber-600 mt-0.5">Sanction type required — expand to select</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : 'sanctions_applied')}
                  className="text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      {isContractTrigger ? 'Contract start date' : 'Date applied'}
                      {isContractTrigger && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                      type="date"
                      className="input h-8 text-xs w-44"
                      value={data.sanctions_applied_date ?? ''}
                      onChange={(e) => setField('sanctions_applied_date', e.target.value || null)}
                    />
                    {isContractTrigger && data.sanctions_applied_date && (
                      <p className="text-xs text-amber-700 mt-1.5 font-medium">
                        12-month review:{' '}
                        {new Date(
                          new Date(data.sanctions_applied_date).setFullYear(
                            new Date(data.sanctions_applied_date).getFullYear() + 1
                          )
                        ).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      Sanction type {checked && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      className="input text-xs"
                      value={data.sanctions_applied_type ?? ''}
                      onChange={(e) => setField('sanctions_applied_type', e.target.value || null)}
                    >
                      <option value="">Select sanction…</option>
                      {SANCTION_TYPES.map((s) => (
                        <option key={s} value={s}>{SANCTION_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      {data.sanctions_applied_type === 'other'
                        ? <>Describe the sanction {checked && <span className="text-red-500">*</span>}</>
                        : 'Notes'}
                    </label>
                    <textarea
                      className="input text-xs min-h-[64px] resize-y w-full"
                      placeholder={
                        data.sanctions_applied_type === 'other'
                          ? 'Describe the sanction given…'
                          : 'Optional notes…'
                      }
                      value={data.sanctions_applied_notes ?? ''}
                      onChange={(e) => setField('sanctions_applied_notes', e.target.value || null)}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Save */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        {error && <p className="text-xs text-red-500">{error}</p>}
        {saved && !error && <p className="text-xs text-green-600">Saved</p>}
        {!error && !saved && <span />}
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save checklist'}
        </Button>
      </div>
    </section>
  )
}
