'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, ChevronDown } from 'lucide-react'
import { markStageSent } from '@/app/(app)/pastoral/rule-of-25/actions'

interface Props {
  student: string
  gradeCode: string
  academicYear: string
  eventType: 'Intervention' | 'Late'
  requiredStage: string
  stages: string[]
}

export default function MarkSentButton({ student, gradeCode, academicYear, eventType, requiredStage, stages }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleMark(stage: string) {
    setOpen(false)
    setError(null)
    startTransition(async () => {
      const res = await markStageSent(student, gradeCode, academicYear, eventType, stage)
      if (res?.error) setError(res.error)
      else setDone(true)
    })
  }

  if (done) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <CheckCircle size={12} />
        Marked sent
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B3A6B] text-white rounded-lg hover:bg-[#1B3A6B]/90 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Mark sent'}
        <ChevronDown size={11} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] py-1">
            {stages.map((stage) => (
              <button
                key={stage}
                onClick={() => handleMark(stage)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${stage === requiredStage ? 'font-semibold text-[#1B3A6B]' : 'text-gray-700'}`}
              >
                {stage === requiredStage && <span className="text-[#1B3A6B] mr-1">→</span>}
                {stage}
              </button>
            ))}
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
