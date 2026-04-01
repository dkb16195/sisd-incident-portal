export type UserRole = 'glc' | 'deputy_head' | 'admin'
export type IncidentType =
  | 'bullying'
  | 'physical_altercation'
  | 'verbal_misconduct'
  | 'peer_conflict'
  | 'social_media'
  | 'theft'
  | 'property_damage'
  | 'safeguarding'
  | 'vaping'
  | 'contraband'
  | 'rule_of_25_behaviour'
  | 'rule_of_25_lates'
  | 'other'
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'referred'
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type StudentRole = 'involved' | 'victim' | 'perpetrator' | 'witness'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: UserRole
          grade: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: UserRole
          grade?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: UserRole
          grade?: string | null
          created_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          id: string
          full_name: string
          grade: string
          year_group: string
          student_id: string
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          grade: string
          year_group: string
          student_id: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          grade?: string
          year_group?: string
          student_id?: string
          created_at?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          id: string
          title: string
          incident_type: IncidentType
          custom_incident_type: string | null
          description: string
          incident_date: string
          incident_time: string | null
          location: string
          grade: string
          status: IncidentStatus
          severity: IncidentSeverity
          logged_by: string
          assigned_to: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          title: string
          incident_type: IncidentType
          custom_incident_type?: string | null
          description: string
          incident_date: string
          incident_time?: string | null
          location: string
          grade: string
          status?: IncidentStatus
          severity?: IncidentSeverity
          logged_by: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          incident_type?: IncidentType
          custom_incident_type?: string | null
          description?: string
          incident_date?: string
          incident_time?: string | null
          location?: string
          grade?: string
          status?: IncidentStatus
          severity?: IncidentSeverity
          logged_by?: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_logged_by_fkey"
            columns: ["logged_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_assigned_to_fkey"
            columns: ["assigned_to"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      incident_students: {
        Row: {
          id: string
          incident_id: string
          student_id: string
          role: StudentRole
        }
        Insert: {
          id?: string
          incident_id: string
          student_id: string
          role?: StudentRole
        }
        Update: {
          id?: string
          incident_id?: string
          student_id?: string
          role?: StudentRole
        }
        Relationships: [
          {
            foreignKeyName: "incident_students_incident_id_fkey"
            columns: ["incident_id"]
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_students_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "students"
            referencedColumns: ["id"]
          }
        ]
      }
      investigation_checklist: {
        Row: {
          id: string
          incident_id: string
          statements_taken: boolean
          statements_taken_date: string | null
          statements_taken_notes: string | null
          parents_contacted: boolean
          parents_contacted_date: string | null
          parents_contacted_notes: string | null
          referred_to_deputy: boolean
          referred_to_deputy_date: string | null
          referred_to_deputy_notes: string | null
          sanctions_applied: boolean
          sanctions_applied_date: string | null
          sanctions_applied_type: string | null
          sanctions_applied_notes: string | null
          follow_up_scheduled: boolean
          follow_up_scheduled_date: string | null
          follow_up_scheduled_notes: string | null
        }
        Insert: {
          id?: string
          incident_id: string
          statements_taken?: boolean
          statements_taken_date?: string | null
          statements_taken_notes?: string | null
          parents_contacted?: boolean
          parents_contacted_date?: string | null
          parents_contacted_notes?: string | null
          referred_to_deputy?: boolean
          referred_to_deputy_date?: string | null
          referred_to_deputy_notes?: string | null
          sanctions_applied?: boolean
          sanctions_applied_date?: string | null
          sanctions_applied_type?: string | null
          sanctions_applied_notes?: string | null
          follow_up_scheduled?: boolean
          follow_up_scheduled_date?: string | null
          follow_up_scheduled_notes?: string | null
        }
        Update: {
          id?: string
          incident_id?: string
          statements_taken?: boolean
          statements_taken_date?: string | null
          statements_taken_notes?: string | null
          parents_contacted?: boolean
          parents_contacted_date?: string | null
          parents_contacted_notes?: string | null
          referred_to_deputy?: boolean
          referred_to_deputy_date?: string | null
          referred_to_deputy_notes?: string | null
          sanctions_applied?: boolean
          sanctions_applied_date?: string | null
          sanctions_applied_type?: string | null
          sanctions_applied_notes?: string | null
          follow_up_scheduled?: boolean
          follow_up_scheduled_date?: string | null
          follow_up_scheduled_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investigation_checklist_incident_id_fkey"
            columns: ["incident_id"]
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          incident_id: string
          author_id: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          incident_id: string
          author_id: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          incident_id?: string
          author_id?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_incident_id_fkey"
            columns: ["incident_id"]
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      incident_type: IncidentType
      incident_status: IncidentStatus
      incident_severity: IncidentSeverity
      student_role: StudentRole
      [key: string]: string
    }
    CompositeTypes: Record<string, never>
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Student = Database['public']['Tables']['students']['Row']
export type Incident = Database['public']['Tables']['incidents']['Row']
export type IncidentStudent = Database['public']['Tables']['incident_students']['Row']
export type InvestigationChecklist = Database['public']['Tables']['investigation_checklist']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']

// Rich joined types
export type IncidentWithStudents = Incident & {
  incident_students: (IncidentStudent & { student: Student })[]
  logged_by_profile?: Profile
  assigned_to_profile?: Profile | null
  investigation_checklist?: InvestigationChecklist | null
}

export type CommentWithAuthor = Comment & {
  author: Profile
}
