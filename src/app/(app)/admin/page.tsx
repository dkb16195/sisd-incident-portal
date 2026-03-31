import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminTabs from '@/components/admin/AdminTabs'
import UserManagement from '@/components/admin/UserManagement'
import StudentUpload from '@/components/admin/StudentUpload'
import AuditLog from '@/components/admin/AuditLog'
import type { Profile } from '@/types/database'

// ── Types for joined audit queries ────────────────────────────────────────────
type IncidentRow = {
  id: string
  title: string
  created_at: string
  profiles: { full_name: string } | null
}
type CommentRow = {
  id: string
  body: string
  created_at: string
  profiles: { full_name: string } | null
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()

  // ── Fetch all users (auth + profile data) ──────────────────────────────────
  const { data: authUsers } = await admin.auth.admin.listUsers()
  const { data: profiles } = await admin.from('profiles').select('*')

  const profileMap = new Map(
    ((profiles ?? []) as Profile[]).map((p) => [p.id, p])
  )

  const users = (authUsers?.users ?? []).map((u) => {
    const p = profileMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      full_name: p?.full_name ?? u.email ?? 'Unknown',
      role: (p?.role ?? 'glc') as Profile['role'],
      grade: p?.grade ?? null,
      created_at: p?.created_at ?? u.created_at,
      banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
      last_sign_in: u.last_sign_in_at ?? null,
    }
  })

  // ── Student count ──────────────────────────────────────────────────────────
  const { count: studentCount } = await admin
    .from('students')
    .select('*', { count: 'exact', head: true })

  // ── Audit log — last 50 incidents + comments ───────────────────────────────
  const [{ data: recentIncidents }, { data: recentComments }] = await Promise.all([
    admin
      .from('incidents')
      .select('id, title, created_at, profiles!incidents_logged_by_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(25),
    admin
      .from('comments')
      .select('id, body, created_at, profiles!comments_author_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  const auditEntries = [
    ...((recentIncidents ?? []) as unknown as IncidentRow[]).map((i) => ({
      id: `i-${i.id}`,
      type: 'incident' as const,
      actor: i.profiles?.full_name ?? 'Unknown',
      description: `logged a new incident: "${i.title}"`,
      timestamp: i.created_at,
    })),
    ...((recentComments ?? []) as unknown as CommentRow[]).map((c) => ({
      id: `c-${c.id}`,
      type: 'comment' as const,
      actor: c.profiles?.full_name ?? 'Unknown',
      description: `added a comment: "${c.body.slice(0, 60)}${c.body.length > 60 ? '…' : ''}"`,
      timestamp: c.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Admin panel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage staff accounts, student data, and system activity.
        </p>
      </div>

      <AdminTabs
        tabs={[
          { key: 'users', label: 'Staff accounts' },
          { key: 'students', label: 'Student list' },
          { key: 'audit', label: 'Activity log' },
        ]}
        panels={{
          users: <UserManagement users={users} />,
          students: <StudentUpload currentCount={studentCount ?? 0} />,
          audit: <AuditLog entries={auditEntries} />,
        }}
      />
    </div>
  )
}
