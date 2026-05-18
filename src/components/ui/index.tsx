import { clsx } from 'clsx'
import { Loader2, InboxIcon, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { TicketStatus, TicketPriority, TicketFull } from '../../lib/supabase'

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
  en_attente: 'En attente',
  en_cours:   'En cours',
  cloture:    'Clôturé',
}

export function StatusBadge({ status, small }: { status: TicketStatus, small?: boolean }) {
  return (
    <span className={clsx(`badge-${status}`, small && '!px-1.5 !py-0.5 !text-[10px] !gap-1')}>
      <span className={clsx("rounded-full bg-current opacity-70", small ? "h-1 w-1" : "h-1.5 w-1.5")} />
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

export function TicketCard({ ticket, linkTo }: { ticket: TicketFull; linkTo: string }) {
  const isNew = ticket.status === 'en_attente' && !ticket.assigned_to
  return (
    <Link
      to={linkTo}
      className={clsx(
        'card-hover block p-4',
        isNew && 'border-brand-200 bg-brand-50/40',
        ticket.sla_breached && 'border-red-200 bg-red-50/30'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {isNew && (
            <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
              Nouveau
            </span>
          )}
          <span className={clsx('font-mono text-xs font-semibold', isNew ? 'text-brand-700' : 'text-brand-600')}>
            {ticket.reference}
          </span>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <p className={clsx('text-sm line-clamp-2 mb-3', isNew ? 'font-bold text-slate-900' : 'font-medium text-slate-800')}>
        {ticket.title}
      </p>
      <div className="flex items-center justify-between">
        <PriorityBadge priority={ticket.priority} />
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Clock size={11} />
          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}
        </span>
      </div>
    </Link>
  )
}

export function TicketRow({ ticket, linkTo, avatarName }: { ticket: TicketFull; linkTo: string, avatarName?: string }) {
  const isUnread = ticket.status === 'en_attente'
  
  const borderColors = {
    en_attente: 'border-l-amber-500',
    en_cours: 'border-l-blue-500',
    cloture: 'border-l-transparent'
  }

  const previewText = ticket.last_comment || ticket.description || 'Aucun message.'
  const displayName = avatarName || ticket.client_name || '?'

  return (
    <Link
      to={linkTo}
      className={clsx(
        'block p-4 border-l-4 transition-colors',
        isUnread ? 'bg-slate-50' : 'bg-white hover:bg-slate-50',
        borderColors[ticket.status]
      )}
    >
      <div className="flex gap-3">
        <Avatar name={displayName} size="md" />
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-0.5">
            <h4 className={clsx(
              'truncate pr-2 text-sm',
              isUnread ? 'font-bold text-slate-900' : 'font-normal text-slate-600'
            )}>
              {ticket.title}
            </h4>
            <span className={clsx(
              'text-[11px] whitespace-nowrap',
              isUnread ? 'font-bold text-slate-900' : 'text-slate-400'
            )}>
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
          
          <div className="flex justify-between items-end gap-2 mt-1">
            <p className="text-sm text-slate-400 truncate flex-1">
              {previewText}
            </p>
            <div className="flex-shrink-0">
              <StatusBadge status={ticket.status} small />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
