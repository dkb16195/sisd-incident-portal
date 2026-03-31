'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface DataPoint {
  type: string
  count: number
}

export default function IncidentsByTypeChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="type"
          width={120}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(val: number) => [val, 'Incidents']}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}
          cursor={{ fill: '#f9fafb' }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={i === 0 ? '#1B3A6B' : `rgba(27,58,107,${Math.max(0.25, 0.85 - i * 0.1)})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
