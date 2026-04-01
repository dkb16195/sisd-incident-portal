'use client'

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import type { TrendPoint, GroupByRow } from '@/types/pastoral'

interface TrendsChartProps {
  data: TrendPoint[]
  groupByData: GroupByRow[]
  groupByLabel: string
  showMA?: boolean
  inverseView?: boolean
}

export default function TrendsChart({ data, groupByData, groupByLabel, showMA = false, inverseView = false }: TrendsChartProps) {
  const maxInterv = Math.max(...data.map((d) => d.interventions), 1)

  const chartData = data.map((d) => ({
    ...d,
    display_interventions: inverseView ? maxInterv - d.interventions : d.interventions,
    label: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }))

  return (
    <div className="space-y-8">
      {/* Interventions chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
          Interventions over time {inverseView && '(inverse — rises as interventions fall)'}
        </h2>
        <p className="text-xs text-gray-400 mb-4">Daily count{showMA ? ' + 7-day moving average' : ''}</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="intervGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#CC2229" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#CC2229" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(val) => [val, inverseView ? 'Interventions (inverse)' : 'Interventions']}
            />
            <Area
              type="monotone"
              dataKey="display_interventions"
              stroke="#CC2229"
              strokeWidth={2}
              fill="url(#intervGrad)"
              dot={false}
              name="Interventions"
            />
            {showMA && (
              <Area
                type="monotone"
                dataKey="ma7_interventions"
                stroke="#1B3A6B"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                fill="none"
                dot={false}
                name="7-day avg"
                connectNulls
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* House points chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">House points over time</h2>
        <p className="text-xs text-gray-400 mb-4">Daily count{showMA ? ' + 7-day moving average' : ''}</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="hpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B3A6B" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1B3A6B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(val) => [val, 'House Points']}
            />
            <Area
              type="monotone"
              dataKey="housePoints"
              stroke="#1B3A6B"
              strokeWidth={2}
              fill="url(#hpGrad)"
              dot={false}
              name="House Points"
            />
            {showMA && (
              <Area
                type="monotone"
                dataKey="ma7_housePoints"
                stroke="#CC2229"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                fill="none"
                dot={false}
                name="7-day avg"
                connectNulls
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Group-by table */}
      {groupByData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Breakdown by {groupByLabel}</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{groupByLabel}</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Interventions</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">House Points</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Lates</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groupByData.map((row) => (
                <tr key={row.label} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{row.label}</td>
                  <td className="px-5 py-3 text-right text-red-600 font-medium">{row.interventions}</td>
                  <td className="px-5 py-3 text-right text-[#1B3A6B] font-medium">{row.housePoints}</td>
                  <td className="px-5 py-3 text-right text-amber-600 font-medium">{row.lates}</td>
                  <td className="px-5 py-3 text-right text-gray-700 font-bold">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
