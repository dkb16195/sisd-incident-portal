'use client'

import { useState, useTransition } from 'react'
import { createUser } from '@/app/(app)/admin/actions'
import Button from '@/components/ui/Button'
import { GRADES } from '@/lib/utils'
import type { UserRole } from '@/types/database'

export default function AddUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>('glc')

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createUser(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Full name</label>
          <input name="full_name" required className="input" placeholder="Ms Sarah Jones" disabled={isPending} />
        </div>
        <div>
          <label className="label">Email address</label>
          <input name="email" type="email" required className="input" placeholder="sjones@sisd.ae" disabled={isPending} />
        </div>
        <div>
          <label className="label">Temporary password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="input"
            placeholder="Min. 8 characters"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select
            name="role"
            required
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={isPending}
          >
            <option value="glc">GLC</option>
            <option value="deputy_head">Deputy Head</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {role === 'glc' && (
          <div>
            <label className="label">Assigned grade</label>
            <select name="grade" required className="input" disabled={isPending}>
              <option value="">Select grade…</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onSuccess} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create user'}
        </Button>
      </div>
    </form>
  )
}
