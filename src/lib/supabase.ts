import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

// Single shared client — one instance ensures localStorage is never double-written
// and onAuthStateChange always reflects the true persisted session.
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tickview-auth',
  },
})

// supabaseAuth is an alias so existing imports don't need to change
export const supabaseAuth = supabase

// ─── Domain types ─────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'agent' | 'expert' | 'admin'

export type TicketStatus = 'en_attente' | 'en_cours' | 'cloture'

export type TicketPriority = 'basse' | 'normale' | 'haute' | 'urgente'

export type ActionType =
  | 'creation' | 'prise_en_charge' | 'reponse'
  | 'reassignation' | 'demande_info' | 'info_recue'
  | 'escalade' | 'cloture' | 'commentaire_interne'

// ─── Table row types ──────────────────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id?: string
  role: UserRole
  first_name: string
  last_name: string
  email?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  organization_id: string
  name: string
  description?: string
  is_active: boolean
}

export interface Ticket {
  id: string
  reference: string
  organization_id: string
  category_id?: string
  client_id: string
  assigned_to?: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  sla_deadline?: string
  sla_breached: boolean
  closed_at?: string
  satisfaction_score?: number
  satisfaction_comment?: string
  satisfaction_at?: string
  created_at: string
  updated_at: string
}

export interface TicketFull extends Ticket {
  client_name: string
  client_email?: string
  assigned_name?: string
  assigned_role?: UserRole
  organization_name?: string
  category_name?: string
  last_comment: string | null
}

export interface TicketAction {
  id: string
  ticket_id: string
  actor_id: string
  action_type: ActionType
  comment?: string
  is_internal: boolean
  metadata?: Record<string, unknown>
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  ticket_id?: string
  channel: 'email' | 'sms' | 'in_app'
  status: 'pending' | 'sent' | 'failed'
  title: string
  body: string
  read_at?: string
  created_at: string
}

export interface FaqArticle {
  id: string
  organization_id: string
  question: string
  answer: string
  category_id?: string
  is_published: boolean
  created_at: string
}

export interface SlaConfig {
  id: string
  organization_id: string
  priority: TicketPriority
  response_time_hours: number
  created_at: string
}

export interface TicketKpis {
  organization_id: string
  total: number
  open_count: number
  in_progress_count: number
  closed_count: number
  sla_breached_count: number
  avg_satisfaction: number | null
  avg_resolution_hours: number | null
}
