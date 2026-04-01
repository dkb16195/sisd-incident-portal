'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
  href: string
  label: string
  exact?: boolean
}

export default function PastoralNavLink({ href, label, exact }: Props) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href) && (href !== '/pastoral' || pathname === '/pastoral')

  return (
    <Link
      href={href}
      className={cn(
        'px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
        isActive
          ? 'border-[#1B3A6B] text-[#1B3A6B]'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      )}
    >
      {label}
    </Link>
  )
}
