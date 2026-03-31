'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  count: number
}

function formatTick(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function IncidentsTrendChart({ data }: { data: DataPoint[] }) {
  // Show every 5th label to avoid crowding
  const tickDates = data
    .filter((_, i) => i % 5 === 0)
    .map((d) => d.date)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1B3A6B" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#1B3A6B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          ticks={tickDates}
          tickFormatter={formatTick}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(val: number) => [val, 'Incidents']}
          labelFormatter={(label) => formatTick(label as string)}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#1B3A6B"
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={false}
          activeDot={{ r: 4, fill: '#1B3A6B' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
