'use client'

import { useState, useTransition } from 'react'
import { UserPlus, Ban, CheckCircle } from 'lucide-react'
import { setUserBanned } from '@/app/(app)/admin/actions'
import { RoleBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import AddUserForm from './AddUserForm'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface UserWithMeta extends Profile {
  email: string
  banned: boolean
  last_sign_in: string | null
}

interface Props {
  users: UserWithMeta[]
}

export default function UserManagement({ users }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [banError, setBanError] = useState<string | null>(null)

  function handleBan(userId: string, currentlyBanned: boolean) {
    setBanError(null)
    startTransition(async () => {
      const result = await setUserBanned(userId, !currentlyBanned)
      if (result?.error) setBanError(result.error)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Staff accounts</h2>
          <p className="text-sm text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <UserPlus size={16} />
          Add user
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">New staff account</h3>
          <AddUserForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      {banError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {banError}
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Grade</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last sign in</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className={u.banned ? 'opacity-50' : ''}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0">
                      <span className="text-[#1B3A6B] text-xs font-semibold">
                        {u.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    {u.full_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3 text-gray-500">{u.grade ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {u.last_sign_in ? formatDate(u.last_sign_in) : 'Never'}
                </td>
                <td className="px-4 py-3">
                  {u.banned ? (
                    <span className="text-xs font-medium text-red-600">Deactivated</span>
                  ) : (
                    <span className="text-xs font-medium text-green-600">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBan(u.id, u.banned)}
                    disabled={isPending}
                    title={u.banned ? 'Reactivate account' : 'Deactivate account'}
                  >
                    {u.banned ? (
                      <CheckCircle size={15} className="text-green-600" />
                    ) : (
                      <Ban size={15} className="text-red-500" />
                    )}
                    {u.banned ? 'Reactivate' : 'Deactivate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
