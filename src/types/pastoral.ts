export type PastoralEventType = 'Intervention' | 'HousePoint' | 'Late' | 'Other'

export interface PastoralEvent {
  id: string
  event_uid: string
  student: string
  name: string
  form: string
  subject: string
  teacher: string
  event_date: string
  description: string
  grade_code: string
  event_type: PastoralEventType
  academic_year: string
  uploaded_at: string
  uploaded_by: string | null
  upload_batch_id: string | null
}

export interface UploadBatch {
  id: string
  uploaded_by: string | null
  uploaded_at: string
  filename: string
  rows_read: number
  rows_inserted: number
  rows_duplicate: number
  rows_failed: number
  latest_event_date: string | null
}

export interface Rule25SentLog {
  id: string
  student: string
  grade_code: string
  academic_year: string
  event_type: 'Intervention' | 'Late'
  stage_sent: string
  sent_at: string
  sent_by: string | null
  notes: string | null
}

export interface FlagDefinition {
  id: string
  flag_code: string
  title: string
  what_it_means: string
  why_it_matters: string
  suggested_action: string
  updated_at: string
  updated_by: string | null
}

// ── Derived / computed types ──────────────────────────────────────────────

export type Rule25Stage =
  | '1st warning – Interventions'
  | '2nd warning – Interventions'
  | '3rd warning – Interventions'
  | 'Contract – Interventions'
  | '1st warning – Lates'
  | '2nd warning – Lates'
  | '3rd warning – Lates'
  | 'Contract – Lates'
  | null

export interface Rule25Row {
  student: string
  grade_code: string
  form: string
  total: number
  requiredStage: Rule25Stage
  stageSent: string | null
  sentAt: string | null
  status: 'SEND EMAIL' | 'OK' | 'NONE'
}

export interface WeeklyChangeRow {
  student: string
  grade_code: string
  form: string
  totalNow: number
  stagePrev: Rule25Stage
  stageNow: Rule25Stage
  stageSent: string | null
  status: 'SEND EMAIL' | 'OK'
}

export interface StudentMetrics {
  student: string
  grade_code: string
  form: string
  rewards_7: number
  rewards_prev7: number
  rewards_14: number
  interv_7: number
  interv_prev7: number
  interv_10: number
  interv_14: number
  late_7: number
  balance14: number
}

export interface ReportFlags {
  posA: boolean   // Quiet Wins
  posB: boolean   // Momentum
  posC: boolean   // Strong Balance
  negA: boolean   // Acceleration
  negC: boolean   // No positives + interventions
  negD: boolean   // Sustained high
  riskScore: number
  topSubject?: string   // for clustering
  topSubjectCount?: number
}

export interface ImportSummaryResult {
  success: boolean
  rowsRead: number
  rowsInserted: number
  rowsDuplicate: number
  rowsFailed: number
  latestDate: string | null
  errors: string[]
  error?: string
}

export interface PastoralFilters {
  dateFrom?: string
  dateTo?: string
  preset?: string
  grade?: string
  form?: string
  subject?: string
  teacher?: string
  student?: string
}

export interface FilterOptions {
  grades: string[]
  forms: string[]
  subjects: string[]
  teachers: string[]
}

export interface TrendPoint {
  date: string
  interventions: number
  housePoints: number
  lates: number
  ma7_interventions?: number
  ma7_housePoints?: number
}

export interface GroupByRow {
  label: string
  interventions: number
  housePoints: number
  lates: number
  total: number
}
