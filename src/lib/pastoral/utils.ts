import type { Rule25Stage, StudentMetrics, ReportFlags } from '@/types/pastoral'

// ── Academic year helpers ─────────────────────────────────────────────────────

export function currentAcademicYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  if (month >= 8) return `${year}-${String(year + 1).slice(-2)}`
  return `${year - 1}-${String(year).slice(-2)}`
}

export function academicYearStart(academicYear?: string): Date {
  const ay = academicYear ?? currentAcademicYear()
  const startYear = parseInt(ay.split('-')[0])
  return new Date(startYear, 7, 1) // Aug 1
}

// ── Date window helpers ───────────────────────────────────────────────────────

export function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function daysAgoDate(days: number, from?: Date): string {
  const d = new Date(from ?? new Date())
  d.setDate(d.getDate() - days)
  return isoDate(d)
}

export function presetDateRange(preset: string): { from: string; to: string } {
  const today = isoDate(new Date())
  const academicStart = isoDate(academicYearStart())
  switch (preset) {
    case 'last7':  return { from: daysAgoDate(7), to: today }
    case 'last14': return { from: daysAgoDate(14), to: today }
    case 'last28': return { from: daysAgoDate(28), to: today }
    case 'academic': return { from: academicStart, to: today }
    default: return { from: daysAgoDate(28), to: today }
  }
}

export function resolveDateRange(params: { dateFrom?: string; dateTo?: string; preset?: string }): { from: string; to: string } {
  if (params.dateFrom && params.dateTo) return { from: params.dateFrom, to: params.dateTo }
  return presetDateRange(params.preset ?? 'last28')
}

// ── GRADES ────────────────────────────────────────────────────────────────────

export const PASTORAL_GRADES = ['G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12'] as const
export type PastoralGrade = typeof PASTORAL_GRADES[number]

// ── Rule of 25 stage calculation ──────────────────────────────────────────────

const THRESHOLDS = [
  { min: 25, stage: (type: 'Intervention' | 'Late') => `Contract – ${type === 'Intervention' ? 'Interventions' : 'Lates'}` },
  { min: 20, stage: (type: 'Intervention' | 'Late') => `3rd warning – ${type === 'Intervention' ? 'Interventions' : 'Lates'}` },
  { min: 15, stage: (type: 'Intervention' | 'Late') => `2nd warning – ${type === 'Intervention' ? 'Interventions' : 'Lates'}` },
  { min: 10, stage: (type: 'Intervention' | 'Late') => `1st warning – ${type === 'Intervention' ? 'Interventions' : 'Lates'}` },
]

export function getRequiredStage(count: number, type: 'Intervention' | 'Late' = 'Intervention'): Rule25Stage {
  for (const t of THRESHOLDS) {
    if (count >= t.min) return t.stage(type) as Rule25Stage
  }
  return null
}

export function stageSortOrder(stage: Rule25Stage): number {
  if (!stage) return -1
  if (stage.startsWith('Contract')) return 4
  if (stage.startsWith('3rd')) return 3
  if (stage.startsWith('2nd')) return 2
  if (stage.startsWith('1st')) return 1
  return 0
}

// ── Weekly report flag computation ───────────────────────────────────────────

export function computeFlags(
  metrics: StudentMetrics,
  config: { strongBalanceThreshold?: number; clusteringThreshold?: number; riskWeights?: { negA: number; negC: number; negD: number } }
): ReportFlags {
  const { strongBalanceThreshold = 3, riskWeights = { negA: 3, negC: 2, negD: 2 } } = config

  const posA = metrics.rewards_14 === 0 && metrics.interv_14 === 0
  const posB = metrics.rewards_7 - metrics.rewards_prev7 >= 1
  const posC = metrics.balance14 >= strongBalanceThreshold

  const negA = metrics.interv_7 - metrics.interv_prev7 >= 2
  const negC = metrics.rewards_14 === 0 && metrics.interv_10 >= 2
  const negD = metrics.interv_7 >= 3

  const riskScore =
    (negA ? riskWeights.negA : 0) +
    (negC ? riskWeights.negC : 0) +
    (negD ? riskWeights.negD : 0)

  return { posA, posB, posC, negA, negC, negD, riskScore }
}

// ── 7-day moving average ──────────────────────────────────────────────────────

export function movingAverage(values: number[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null
    const slice = values.slice(i - window + 1, i + 1)
    return Math.round((slice.reduce((a, b) => a + b, 0) / window) * 10) / 10
  })
}

// ── Aggregation helpers (used in server components) ───────────────────────────

export function groupByStudent<T extends { student: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    if (!map.has(row.student)) map.set(row.student, [])
    map.get(row.student)!.push(row)
  }
  return map
}

export function countBy<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    const k = key(row)
    counts[k] = (counts[k] ?? 0) + 1
  }
  return counts
}

// ── Export helpers ────────────────────────────────────────────────────────────

export function toCsvString(headers: string[], rows: string[][]): string {
  return [
    headers.join(','),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
}
