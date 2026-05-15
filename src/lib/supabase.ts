import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnon)

// ─── Domain types (mirror DB enums) ──────────────────────────────────────────

export type UserRole = 'client' | 'agent' | 'expert' | 'admin' | 'super_admin'

export type TicketStatus =
  | 'ouvert' | 'en_cours' | 'en_attente'
  | 'reassigne' | 'resolu' | 'cloture'

export type TicketPriority = 'basse' | 'normale' | 'haute' | 'urgente'

export type ActionType =
  | 'creation' | 'prise_en_charge' | 'reponse'
  | 'reassignation' | 'demande_info' | 'info_recue'
  | 'resolution' | 'cloture' | 'reouverture'
  | 'escalade' | 'commentaire_interne'

// ─── Table row types ──────────────────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  slug: string
  address?: string
  phone?: string
  email?: string
  logo_url?: string
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  organization_id: string
  role: UserRole
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
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
  attachment_urls?: string[]
  status: TicketStatus
  priority: TicketPriority
  sla_deadline?: string
  sla_breached: boolean
  satisfaction_score?: number
  satisfaction_comment?: string
  resolved_at?: string
  closed_at?: string
  created_at: string
  updated_at: string
}

export interface TicketFull extends Ticket {
  client_name: string
  client_phone?: string
  assigned_name?: string
  assigned_role?: UserRole
  category_name?: string
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
  max_hours: number
  escalate_to_role?: UserRole
}

// ─── View types ───────────────────────────────────────────────────────────────

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
