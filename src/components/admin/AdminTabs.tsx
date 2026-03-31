'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  key: string
  label: string
}

interface Props {
  tabs: Tab[]
  panels: Record<string, React.ReactNode>
}

export default function AdminTabs({ tabs, panels }: Props) {
  const [active, setActive] = useState(tabs[0].key)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors',
              active === tab.key
                ? 'border-[#1B3A6B] text-[#1B3A6B]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      {panels[active]}
    </div>
  )
}
