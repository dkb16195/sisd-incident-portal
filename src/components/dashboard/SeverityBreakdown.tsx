'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DataPoint {
  severity: string
  count: number
}

const COLOURS: Record<string, string> = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#d97706',
  low:      '#6b7280',
}

const LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export default function SeverityBreakdown({ data }: { data: DataPoint[] }) {
  const filtered = data.filter((d) => d.count > 0)

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-[160px]">
        <p className="text-sm text-gray-400">No data yet.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="count"
          nameKey="severity"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={60}
          paddingAngle={3}
        >
          {filtered.map((entry) => (
            <Cell key={entry.severity} fill={COLOURS[entry.severity] ?? '#6b7280'} />
          ))}
        </Pie>
        <Tooltip
          formatter={(val, name) => [val, LABELS[String(name)] ?? name]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}
        />
        <Legend
          formatter={(value) => LABELS[value] ?? value}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
