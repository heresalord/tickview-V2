import { clsx } from 'clsx'
import { Loader2, InboxIcon } from 'lucide-react'
import type { TicketStatus, TicketPriority } from '../../lib/supabase'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin text-brand-600', className ?? 'h-5 w-5')} />
}

export function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  ouvert: 'Ouvert', en_cours: 'En cours', en_attente: 'En attente',
  reassigne: 'Réassigné', resolu: 'Résolu', cloture: 'Clôturé',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`badge-${status}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  )
}

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  basse: 'Basse', normale: 'Normale', haute: 'Haute', urgente: 'Urgente',
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={`badge-${priority}`}>{PRIORITY_LABELS[priority]}</span>
}

export function EmptyState({ message = 'Aucun élément trouvé.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <InboxIcon className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-11 w-11 text-base' }
  return (
    <div className={clsx('rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center flex-shrink-0', sizes[size])}>
      {initials || '?'}
    </div>
  )
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-slate-100 my-4" />
  return (
    <div className="flex items-center gap-3 my-4">
      <hr className="flex-1 border-slate-100" />
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <hr className="flex-1 border-slate-100" />
    </div>
  )
}
