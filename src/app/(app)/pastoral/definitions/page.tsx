import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DefinitionEditor from '@/components/pastoral/DefinitionEditor'
import type { Profile } from '@/types/database'
import type { FlagDefinition } from '@/types/pastoral'

export default async function DefinitionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  const { data: definitions } = await supabase
    .from('pastoral_flag_definitions')
    .select('*')
    .order('flag_code')
    .returns<FlagDefinition[]>()

  const isAdmin = profile?.role === 'admin'

  const categories = [
    { key: 'positive', label: 'Positive flags', codes: ['PosA', 'PosB', 'PosC'], colour: 'bg-green-50 border-green-200' },
    { key: 'negative', label: 'Early support flags', codes: ['NegA', 'NegC', 'NegD'], colour: 'bg-amber-50 border-amber-200' },
    { key: 'risk', label: 'Risk scoring', codes: ['RiskScore'], colour: 'bg-blue-50 border-blue-200' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Definitions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Staff guidance for each flag in the weekly report
          {isAdmin && ' · Click any field to edit'}
        </p>
      </div>

      <div className="space-y-8">
        {categories.map(({ label, codes, colour }) => {
          const defs = (definitions ?? []).filter((d) => codes.includes(d.flag_code))
          return (
            <div key={label}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{label}</h2>
              <div className="space-y-4">
                {defs.map((def) => (
                  <div key={def.id} className={`rounded-xl border p-6 ${colour}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm font-mono font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded">{def.flag_code}</span>
                      {isAdmin ? (
                        <DefinitionEditor definition={def} field="title">
                          <h3 className="text-base font-bold text-gray-900 hover:bg-white/50 px-1 rounded cursor-text">{def.title}</h3>
                        </DefinitionEditor>
                      ) : (
                        <h3 className="text-base font-bold text-gray-900">{def.title}</h3>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-6 text-sm">
                      <FieldBlock label="What it means" value={def.what_it_means} defId={def.id} field="what_it_means" isAdmin={isAdmin} />
                      <FieldBlock label="Why it matters" value={def.why_it_matters} defId={def.id} field="why_it_matters" isAdmin={isAdmin} />
                      <FieldBlock label="Suggested action" value={def.suggested_action} defId={def.id} field="suggested_action" isAdmin={isAdmin} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FieldBlock({ label, value, defId, field, isAdmin }: {
  label: string
  value: string
  defId: string
  field: string
  isAdmin: boolean
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
      {isAdmin ? (
        <DefinitionEditor definition={{ id: defId } as any} field={field}>
          <p className="text-gray-700 leading-relaxed hover:bg-white/50 px-1 rounded cursor-text whitespace-pre-wrap">{value || '—'}</p>
        </DefinitionEditor>
      ) : (
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{value || '—'}</p>
      )}
    </div>
  )
}
