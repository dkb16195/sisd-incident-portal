'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { addComment, deleteComment } from '@/app/(app)/incidents/[id]/actions'
import Button from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import type { CommentWithAuthor } from '@/types/database'

interface Props {
  incidentId: string
  comments: CommentWithAuthor[]
  currentUserId: string
}

export default function CommentThread({ incidentId, comments: initial, currentUserId }: Props) {
  const [comments, setComments] = useState(initial)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Sync if server re-renders with new comments
  useEffect(() => {
    setComments(initial)
  }, [initial])

  function handleAdd() {
    if (!body.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await addComment(incidentId, body)
      if (res?.error) {
        setError(res.error)
      } else {
        setBody('')
        // Scroll to bottom after new comment lands (server revalidates)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    })
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      const res = await deleteComment(commentId, incidentId)
      if (!res?.error) {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#1B3A6B] mb-4">
        Notes & comments ({comments.length})
      </h2>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">No notes yet. Add the first one below.</p>
      ) : (
        <ul className="space-y-4 mb-6">
          {comments.map((comment) => {
            const isOwn = comment.author_id === currentUserId
            return (
              <li key={comment.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[#1B3A6B] text-xs font-medium">
                    {comment.author.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author.full_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(comment.created_at)}
                      </span>
                    </div>
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        disabled={isPending}
                        className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {comment.body}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div ref={bottomRef} />

      {/* Add comment */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note… (Cmd+Enter to submit)"
          className="input text-sm min-h-[80px] resize-y w-full"
          disabled={isPending}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={isPending || !body.trim()}
          >
            {isPending ? 'Saving…' : 'Add note'}
          </Button>
        </div>
      </div>
    </section>
  )
}
