import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PastoralUpload from '@/components/pastoral/PastoralUpload'
import type { Profile } from '@/types/database'
import type { UploadBatch } from '@/types/pastoral'

export default async function PastoralUploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile) redirect('/')

  // Recent upload history
  const { data: batches } = await supabase
    .from('pastoral_upload_batches')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(10)
    .returns<UploadBatch[]>()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Upload pastoral data</h1>
        <p className="text-sm text-gray-500 mt-0.5">Import or refresh from iSAMS rewards and interventions export</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <PastoralUpload />
        </div>

        {/* Upload history */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Import history</h2>
          {!batches?.length ? (
            <p className="text-sm text-gray-400">No imports yet.</p>
          ) : (
            <div className="space-y-2">
              {batches.map((b) => (
                <div key={b.id} className="bg-white border border-gray-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 truncate">{b.filename}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(b.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex gap-3 mt-1.5 text-xs">
                    <span className="text-green-600 font-medium">+{b.rows_inserted}</span>
                    <span className="text-amber-500">{b.rows_duplicate} dupes</span>
                    {b.rows_failed > 0 && <span className="text-red-500">{b.rows_failed} failed</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
