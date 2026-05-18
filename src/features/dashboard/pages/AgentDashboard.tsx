import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase, type TicketFull } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'
import { StatusBadge, PriorityBadge, Spinner, EmptyState, TicketRow } from '../../../components/ui'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

const ITEMS_PER_PAGE = 10

export function AgentDashboard() {
  const { user, profile } = useAuth()
  const [tickets, setTickets]   = useState<TicketFull[]>([])
  const [loading, setLoading]   = useState(true)

  // Filters
  const [statusFilter, setStatusFilter]     = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  // Pagination
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('v_tickets_full')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTickets((data ?? []) as TicketFull[])
        setLoading(false)
      })
  }, [profile])

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter === 'active' && t.status === 'cloture') return false
      if (statusFilter === 'breached' && (!t.sla_breached || t.status === 'cloture')) return false
      if (statusFilter !== 'all' && statusFilter !== 'active' && statusFilter !== 'breached' && t.status !== statusFilter) return false

      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false

      return true
    })
  }, [tickets, statusFilter, priorityFilter, user])

  // Reset page to 1 when filters change
  useEffect(() => { setPage(1) }, [statusFilter, priorityFilter])

  const pageCount = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE)
  const paginatedTickets = filteredTickets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Stats (calculated from 'tickets' without 'cloture' for accurate pending/inprog)
  const activeTickets = tickets.filter(t => t.status !== 'cloture')
  const breached = activeTickets.filter(t => t.sla_breached).length
  const pending  = activeTickets.filter(t => t.status === 'en_attente').length
  const inprog   = activeTickets.filter(t => t.status === 'en_cours').length

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold text-slate-900 leading-snug">
          {getGreeting()},{' '}
          <span className="text-brand-600">{profile?.first_name}</span> 👋
        </h1>
        <p className="page-subtitle">Gérez les tickets en attente et en cours de traitement.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <button 
          onClick={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
          className={`stat-card p-3 sm:p-5 text-left transition-all hover:border-brand-300 ${statusFilter === 'active' ? 'ring-2 ring-brand-500 border-transparent bg-brand-50/20' : ''}`}
        >
          <span className="stat-value text-slate-700">{activeTickets.length}</span>
          <span className="stat-label">Total actifs</span>
        </button>
        <button 
          onClick={() => setStatusFilter(prev => prev === 'en_attente' ? 'all' : 'en_attente')}
          className={`stat-card p-3 sm:p-5 text-left transition-all hover:border-amber-300 ${statusFilter === 'en_attente' ? 'ring-2 ring-amber-500 border-transparent bg-amber-50/20' : ''}`}
        >
          <span className="stat-value text-amber-600">{pending}</span>
          <span className="stat-label">En attente</span>
        </button>
        <button 
          onClick={() => setStatusFilter(prev => prev === 'en_cours' ? 'all' : 'en_cours')}
          className={`stat-card p-3 sm:p-5 text-left transition-all hover:border-blue-300 ${statusFilter === 'en_cours' ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/20' : ''}`}
        >
          <span className="stat-value text-brand-600">{inprog}</span>
          <span className="stat-label">En cours</span>
        </button>
        <button 
          onClick={() => setStatusFilter(prev => prev === 'breached' ? 'all' : 'breached')}
          className={`stat-card p-3 sm:p-5 text-left transition-all hover:border-red-300 ${statusFilter === 'breached' ? 'ring-2 ring-red-500 border-transparent bg-red-50/20' : breached > 0 ? 'border-red-200 bg-red-50/50' : ''}`}
        >
          <span className="stat-value text-red-600 flex items-center gap-2">
            {breached > 0 && <AlertTriangle size={20} />}{breached}
          </span>
          <span className="stat-label">SLA dépassés</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Priority pills only */}
        {(['all', 'urgente', 'haute', 'normale', 'basse'] as const).map(f => {
          const colors = {
            all:     priorityFilter === f ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            urgente: priorityFilter === f ? 'bg-red-600 text-white'   : 'bg-red-50 text-red-700 hover:bg-red-100',
            haute:   priorityFilter === f ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
            normale: priorityFilter === f ? 'bg-blue-600 text-white'  : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
            basse:   priorityFilter === f ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
          }
          return (
            <button
              key={f}
              onClick={() => setPriorityFilter(f)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${colors[f]}`}
            >
              {{ all: 'Toutes', urgente: '🔴 Urgente', haute: '🟠 Haute', normale: '🔵 Normale', basse: '⚪ Basse' }[f]}
            </button>
          )
        })}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filteredTickets.length === 0 ? (
          <EmptyState message="Aucun ticket pour ces filtres." />
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedTickets.map(t => (
                <TicketRow key={t.id} ticket={t} linkTo={`/agent/tickets/${t.id}`} avatarName={t.client_name} />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Titre</th>
                    <th>Client</th>
                    <th>Statut</th>
                    <th>Priorité</th>
                    <th>SLA</th>
                    <th>Créé</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTickets.map(t => {
                    const isNew = t.status === 'en_attente' && !t.assigned_to
                    return (
                      <tr key={t.id} className={isNew ? 'bg-brand-50/50' : t.sla_breached ? 'bg-red-50/50' : ''}>
                        <td>
                          <Link to={`/agent/tickets/${t.id}`} className={`font-mono text-xs hover:text-brand-700 ${isNew ? 'text-brand-700 font-bold' : 'text-brand-600 font-semibold'}`}>
                            {t.reference}
                          </Link>
                        </td>
                        <td className="max-w-xs">
                          <div className="flex items-center gap-2">
                            {isNew && <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Nouveau</span>}
                            <Link to={`/agent/tickets/${t.id}`} className={`hover:text-brand-600 line-clamp-1 ${isNew ? 'font-bold text-slate-900' : ''}`}>
                              {t.title}
                            </Link>
                          </div>
                        </td>
                        <td className="text-slate-500">{t.client_name}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td>
                          {t.sla_deadline ? (
                            <span className={`text-xs flex items-center gap-1 ${t.sla_breached ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                              <Clock size={12} />
                              {t.sla_breached ? 'Dépassé' : formatDistanceToNow(new Date(t.sla_deadline), { addSuffix: true, locale: fr })}
                            </span>
                          ) : '—'}
                        </td>
                        <td className={`text-xs ${isNew ? 'text-brand-600 font-medium' : 'text-slate-400'}`}>
                          {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
                <span className="text-sm text-slate-500">
                  Affichage {((page - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(page * ITEMS_PER_PAGE, filteredTickets.length)} sur {filteredTickets.length}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary btn-sm px-2"
                  >
                    <ChevronLeft size={16} /> Précédent
                  </button>
                  <span className="text-sm font-medium text-slate-700 px-2">
                    Page {page} / {pageCount}
                  </span>
                  <button 
                    onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    className="btn-secondary btn-sm px-2"
                  >
                    Suivant <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
