import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Upload, Calendar, Database, Clock, ArrowRight } from 'lucide-react'
import type { Profile } from '@/types/database'
import type { UploadBatch } from '@/types/pastoral'

export default async function PastoralOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  // Latest upload batch
  const { data: latestBatch } = await supabase
    .from('pastoral_upload_batches')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .returns<UploadBatch[]>()

  const batch = latestBatch?.[0]

  // Total events
  const { count: totalEvents } = await supabase
    .from('pastoral_events')
    .select('*', { count: 'exact', head: true })

  // Latest event date in database
  const { data: latestEventRow } = await supabase
    .from('pastoral_events')
    .select('event_date')
    .order('event_date', { ascending: false })
    .limit(1)
    .returns<{ event_date: string }[]>()

  const latestEventDate = latestEventRow?.[0]?.event_date

  const hasData = (totalEvents ?? 0) > 0

  const modules = [
    { href: '/pastoral/rule-of-25', label: 'Rule of 25', desc: 'Track cumulative interventions and warning stages per student' },
    { href: '/pastoral/weekly-changes', label: 'Weekly changes', desc: 'Students whose warning stage changed this week vs last week' },
    { href: '/pastoral/weekly-summary', label: 'Weekly summary', desc: 'Top house point earners and reflection lists per grade' },
    { href: '/pastoral/trends', label: 'Trends', desc: 'Daily intervention and house point charts with filters' },
    { href: '/pastoral/weekly-report', label: 'Weekly report', desc: 'Computed flags: Quiet Wins, Momentum, Early Support and more' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Pastoral Tracker</h1>
        <p className="text-sm text-gray-500 mt-0.5">Grades 6–12 · Interventions, house points, and lates</p>
      </div>

      {/* Data freshness */}
      <div className={`rounded-xl border p-5 mb-8 ${hasData ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-200'}`}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Data freshness</h2>
        {hasData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                <Database size={12} /> Total records
              </p>
              <p className="text-2xl font-bold text-[#1B3A6B]">{(totalEvents ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                <Calendar size={12} /> Latest event date
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {latestEventDate
                  ? new Date(latestEventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                <Clock size={12} /> Last uploaded
              </p>
              <p className="text-sm font-medium text-gray-700">
                {batch
                  ? new Date(batch.uploaded_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                <Upload size={12} /> Last import
              </p>
              {batch ? (
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-green-700">+{batch.rows_inserted}</span> inserted,{' '}
                  <span className="text-amber-600">{batch.rows_duplicate} dupes</span>
                </p>
              ) : <p className="text-sm text-gray-400">—</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Upload size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 mb-1">No data loaded yet</p>
              <p className="text-sm text-amber-700">
                Upload your iSAMS rewards and interventions export to get started.{' '}
                <Link href="/pastoral/upload" className="underline font-medium">Upload now →</Link>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Module cards */}
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(({ href, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#1B3A6B]/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-[#1B3A6B] transition-colors mb-1">{label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-[#1B3A6B] transition-colors shrink-0 mt-0.5 ml-2" />
            </div>
          </Link>
        ))}
        <Link
          href="/pastoral/upload"
          className="bg-[#1B3A6B]/5 rounded-xl border border-[#1B3A6B]/10 p-5 hover:bg-[#1B3A6B]/10 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-[#1B3A6B] mb-1">Upload data</p>
              <p className="text-xs text-[#1B3A6B]/70 leading-relaxed">Import new rewards and interventions from iSAMS</p>
            </div>
            <Upload size={16} className="text-[#1B3A6B]/50 shrink-0 mt-0.5 ml-2" />
          </div>
        </Link>
      </div>
    </div>
  )
}
