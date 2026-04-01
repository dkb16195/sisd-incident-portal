'use client'

import { useState, useRef, useTransition } from 'react'
import { updateFlagDefinition } from '@/app/(app)/pastoral/definitions/actions'
import type { FlagDefinition } from '@/types/pastoral'

interface Props {
  definition: FlagDefinition
  field: string
  children: React.ReactNode
}

export default function DefinitionEditor({ definition, field, children }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(() => {
    const key = field as keyof FlagDefinition
    return String(definition[key] ?? '')
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLTextAreaElement>(null)

  function handleClick() {
    setEditing(true)
    setTimeout(() => ref.current?.focus(), 0)
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const res = await updateFlagDefinition(definition.id, { [field]: value })
      if (res?.error) {
        setError(res.error)
      } else {
        setSaved(true)
        setEditing(false)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setEditing(false)
    if (e.key === 'Enter' && e.metaKey) handleSave()
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-sm text-gray-700 border border-[#1B3A6B]/30 rounded-lg p-2 resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-3 py-1 text-xs font-medium bg-[#1B3A6B] text-white rounded-lg disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <span className="text-xs text-gray-400">⌘ Enter to save · Esc to cancel</span>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    )
  }

  return (
    <div onClick={handleClick} className="relative">
      {children}
      {saved && (
        <span className="absolute top-0 right-0 text-xs text-green-600 bg-white px-1 rounded">Saved</span>
      )}
    </div>
  )
}
