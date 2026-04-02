'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X, AlertTriangle, ExternalLink, FileText, CheckCircle2, Clock, Archive } from 'lucide-react'
import { formatDate, getIncidentTypeLabel, GRADES } from '@/lib/utils'
import type { Student, Incident, IncidentStudent } from '@/types/database'

type ContractEntry = {
  contractId: string
  startDate: string | null
  incident: Incident & {
    incident_students: (IncidentStudent & { student: Student })[]
  }
  student: Student | null
  studentRole: string | null
}

interface Props {
  entries: ContractEntry[]
  canChooseGrade: boolean
}

function reviewDate(startDate: string): Date {
  const d = new Date(startDate)
  d.setFullYear(d.getFullYear() + 1)
  return d
}

function contractStatus(startDate: string | null): 'no-date' | 'active' | 'due-soon' | 'expired' {
  if (!startDate) return 'no-date'
  const review = reviewDate(startDate)
  const now = new Date()
  const daysUntilReview = Math.floor((review.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilReview < 0) return 'expired'
  if (daysUntilReview <= 30) return 'due-soon'
  return 'active'
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  'due-soon': 'Review due',
  expired: 'Expired',
  'no-date': 'Date needed',
}

export default function ContractsDashboard({ entries, canChooseGrade }: Props) {
  const [q, setQ] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Compute per-student active contract count (over all entries, before filtering)
  const studentContractCount = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of entries) {
      if (!entry.student) continue
      const status = contractStatus(entry.startDate)
      if (status === 'active' || status === 'due-soon' || status === 'no-date') {
        counts[entry.student.id] = (counts[entry.student.id] ?? 0) + 1
      }
    }
    return counts
  }, [entries])

  // Dashboard stats (over all entries)
  const stats = useMemo(() => {
    const active = entries.filter((e) => contractStatus(e.startDate) === 'active').length
    const dueSoon = entries.filter((e) => contractStatus(e.startDate) === 'due-soon').length
    const expired = entries.filter((e) => contractStatus(e.startDate) === 'expired').length
    const atLimit = entries.filter(
      (e) => e.student && (studentContractCount[e.student.id] ?? 0) >= 3
    ).length
    return { active, dueSoon, expired, atLimit, total: entries.length }
  }, [entries, studentContractCount])

  // Filtered entries
  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (statusFilter && contractStatus(entry.startDate) !== statusFilter) return false
      if (gradeFilter && entry.incident.grade !== gradeFilter) return false
      if (q) {
        const qLower = q.toLowerCase()
        const nameMatch = entry.student?.full_name.toLowerCase().includes(qLower)
        const incidentMatch = entry.incident.title.toLowerCase().includes(qLower)
        if (!nameMatch && !incidentMatch) return false
      }
      return true
    })
  }, [entries, q, gradeFilter, statusFilter])

  const hasFilters = !!q || !!gradeFilter || !!statusFilter

  return (
    <div>
      {/* Dashboard stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active contracts"
          value={stats.active}
          colour="blue"
          icon={<CheckCircle2 size={18} />}
          onClick={() => setStatusFilter(statusFilter === 'active' ? '' : 'active')}
          active={statusFilter === 'active'}
        />
        <StatCard
          label="Review due (30 days)"
          value={stats.dueSoon}
          colour="amber"
          icon={<Clock size={18} />}
          onClick={() => setStatusFilter(statusFilter === 'due-soon' ? '' : 'due-soon')}
          active={statusFilter === 'due-soon'}
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          colour="gray"
          icon={<Archive size={18} />}
          onClick={() => setStatusFilter(statusFilter === 'expired' ? '' : 'expired')}
          active={statusFilter === 'expired'}
        />
        <StatCard
          label="At limit (3 contracts)"
          value={stats.atLimit}
          colour="red"
          icon={<AlertTriangle size={18} />}
          onClick={() => {/* no filter for this one */}}
          active={false}
          noFilter
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search student or incident…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input pl-8 h-9 text-sm w-56"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input h-9 text-sm w-40"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {canChooseGrade && (
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="input h-9 text-sm w-36"
          >
            <option value="">All grades</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={() => { setQ(''); setGradeFilter(''); setStatusFilter('') }}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}

        <span className="ml-auto text-sm text-gray-400">
          {filtered.length} of {stats.total} contract{stats.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {hasFilters ? 'No contracts match your filters.' : 'No behaviour contracts on record.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Student</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Incident</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Start date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">12-month review</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contracts (active)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((entry, idx) => {
                const status = contractStatus(entry.startDate)
                const review = entry.startDate ? reviewDate(entry.startDate) : null
                const now = new Date()
                const daysRemaining = review
                  ? Math.floor((review.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  : null
                const activeContracts = entry.student
                  ? (studentContractCount[entry.student.id] ?? 0)
                  : null

                return (
                  <tr key={`${entry.contractId}-${entry.student?.id ?? idx}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      {entry.student ? (
                        <Link href={`/students/${entry.student.id}`} className="group flex items-start gap-1">
                          <div>
                            <p className="font-medium text-gray-900 group-hover:text-[#1B3A6B] transition-colors">
                              {entry.student.full_name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {entry.student.grade} · {entry.student.year_group}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <span className="text-gray-400 italic">No student linked</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <Link href={`/incidents/${entry.incident.id}`} className="group flex items-start gap-1">
                        <div>
                          <p className="text-gray-800 group-hover:text-[#1B3A6B] transition-colors leading-snug">
                            {entry.incident.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {getIncidentTypeLabel(entry.incident.incident_type, entry.incident.custom_incident_type)}
                            {' '}· {entry.incident.grade}
                            {' '}· {formatDate(entry.incident.incident_date)}
                          </p>
                        </div>
                        <ExternalLink size={11} className="text-gray-300 group-hover:text-[#1B3A6B] mt-0.5 shrink-0 transition-colors" />
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {entry.startDate ? formatDate(entry.startDate) : (
                        <span className="text-amber-600 text-xs font-medium">Not recorded</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {review ? (
                        <div>
                          <p className={status === 'expired' ? 'text-gray-400 line-through' : 'text-gray-700'}>
                            {formatDate(review.toISOString())}
                          </p>
                          {status !== 'expired' && daysRemaining !== null && (
                            <p className={`text-xs mt-0.5 ${status === 'due-soon' ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {status === 'active' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          Active
                        </span>
                      )}
                      {status === 'due-soon' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle size={10} />
                          Review due
                        </span>
                      )}
                      {status === 'expired' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                          Expired
                        </span>
                      )}
                      {status === 'no-date' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                          Date needed
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {activeContracts !== null ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map((n) => (
                              <div
                                key={n}
                                className={`w-3 h-3 rounded-sm ${
                                  n <= activeContracts
                                    ? activeContracts >= 3
                                      ? 'bg-red-500'
                                      : activeContracts === 2
                                      ? 'bg-amber-400'
                                      : 'bg-[#1B3A6B]'
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-xs font-medium ${
                            activeContracts >= 3 ? 'text-red-600' : activeContracts === 2 ? 'text-amber-600' : 'text-gray-500'
                          }`}>
                            {activeContracts}/3
                            {activeContracts >= 3 && ' — limit reached'}
                            {activeContracts === 2 && ' — one remaining'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  colour,
  icon,
  onClick,
  active,
  noFilter,
}: {
  label: string
  value: number
  colour: 'blue' | 'amber' | 'gray' | 'red'
  icon: React.ReactNode
  onClick: () => void
  active: boolean
  noFilter?: boolean
}) {
  const colours = {
    blue: {
      bg: active ? 'bg-[#1B3A6B]' : 'bg-white hover:bg-blue-50',
      border: active ? 'border-[#1B3A6B]' : 'border-gray-200 hover:border-blue-300',
      icon: active ? 'text-white' : 'text-[#1B3A6B]',
      value: active ? 'text-white' : 'text-[#1B3A6B]',
      label: active ? 'text-blue-200' : 'text-gray-500',
    },
    amber: {
      bg: active ? 'bg-amber-500' : 'bg-white hover:bg-amber-50',
      border: active ? 'border-amber-500' : 'border-gray-200 hover:border-amber-300',
      icon: active ? 'text-white' : 'text-amber-500',
      value: active ? 'text-white' : 'text-amber-600',
      label: active ? 'text-amber-100' : 'text-gray-500',
    },
    gray: {
      bg: active ? 'bg-gray-600' : 'bg-white hover:bg-gray-50',
      border: active ? 'border-gray-600' : 'border-gray-200 hover:border-gray-400',
      icon: active ? 'text-white' : 'text-gray-400',
      value: active ? 'text-white' : 'text-gray-600',
      label: active ? 'text-gray-300' : 'text-gray-500',
    },
    red: {
      bg: 'bg-white',
      border: 'border-gray-200',
      icon: 'text-red-500',
      value: 'text-red-600',
      label: 'text-gray-500',
    },
  }

  const c = colours[colour]

  return (
    <button
      onClick={noFilter ? undefined : onClick}
      className={`rounded-xl border p-4 text-left transition-all ${c.bg} ${c.border} ${noFilter ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div className={`mb-2 ${c.icon}`}>{icon}</div>
      <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
      <p className={`text-xs mt-0.5 ${c.label}`}>{label}</p>
    </button>
  )
}
