import { cn } from '@/lib/utils'

type Variant = 'navy' | 'gold' | 'green' | 'red' | 'amber' | 'orange' | 'purple' | 'blue' | 'gray'

const variants: Record<Variant, string> = {
  navy:   'bg-[#1B3A6B]/10 text-[#1B3A6B]',
  gold:   'bg-[#E8A020]/15 text-[#B87818]',
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-700',
  amber:  'bg-amber-100 text-amber-800',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
  blue:   'bg-blue-100 text-blue-700',
  gray:   'bg-gray-100 text-gray-600',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: Variant
  className?: string
}

export default function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// Convenience helpers used across the app
export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, Variant> = {
    low: 'gray', medium: 'amber', high: 'orange', critical: 'red',
  }
  const labels: Record<string, string> = {
    low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
  }
  return <Badge variant={map[severity] ?? 'gray'}>{labels[severity] ?? severity}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    open: 'blue', in_progress: 'amber', resolved: 'green', referred: 'purple',
  }
  const labels: Record<string, string> = {
    open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', referred: 'Referred',
  }
  return <Badge variant={map[status] ?? 'gray'}>{labels[status] ?? status}</Badge>
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, Variant> = {
    glc: 'navy', deputy_head: 'purple', admin: 'gold',
  }
  const labels: Record<string, string> = {
    glc: 'GLC', deputy_head: 'Deputy Head', admin: 'Admin',
  }
  return <Badge variant={map[role] ?? 'gray'}>{labels[role] ?? role}</Badge>
}
