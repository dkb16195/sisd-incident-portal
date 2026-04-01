import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PastoralNavLink from '@/components/pastoral/PastoralNavLink'
import type { Profile } from '@/types/database'

const NAV = [
  { href: '/pastoral', label: 'Overview', exact: true },
  { href: '/pastoral/upload', label: 'Upload data' },
  { href: '/pastoral/rule-of-25', label: 'Rule of 25' },
  { href: '/pastoral/weekly-changes', label: 'Weekly changes' },
  { href: '/pastoral/weekly-summary', label: 'Weekly summary' },
  { href: '/pastoral/trends', label: 'Trends' },
  { href: '/pastoral/weekly-report', label: 'Weekly report' },
  { href: '/pastoral/definitions', label: 'Definitions' },
]

export default async function PastoralLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile) redirect('/')

  return (
    <div className="flex flex-col min-h-full">
      {/* Sub-navigation */}
      <div className="border-b border-gray-200 bg-white px-8">
        <nav className="flex items-center gap-0 -mb-px overflow-x-auto">
          {NAV.map(({ href, label, exact }) => (
            <PastoralNavLink key={href} href={href} label={label} exact={exact} />
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
