'use client'

import { Download, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toCsvString } from '@/lib/pastoral/utils'

interface Props {
  headers: string[]
  rows: string[][]
  filename?: string
  label?: string
}

export default function ExportButton({ headers, rows, filename = 'export.csv', label = 'Export' }: Props) {
  const [copied, setCopied] = useState(false)

  function downloadCsv() {
    const csv = toCsvString(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copyToClipboard() {
    const text = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={downloadCsv}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Download size={12} />
        {label}
      </button>
      <button
        onClick={copyToClipboard}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
