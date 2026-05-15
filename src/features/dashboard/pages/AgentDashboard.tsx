import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase, type TicketFull } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'
import { StatusBadge, PriorityBadge, Spinner, EmptyState } from '../../../components/ui'

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
  const [assignFilter, setAssignFilter]     = useState<'all' | 'mine' | 'unassigned'>('all')
  const [statusFilter, setStatusFilter]     = useState<string>('active')
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
      if (assignFilter === 'mine' && t.assigned_to !== user!.id) return false
      if (assignFilter === 'unassigned' && t.assigned_to !== null) return false

      if (statusFilter === 'active' && t.status === 'cloture') return false
      if (statusFilter !== 'all' && statusFilter !== 'active' && t.status !== statusFilter) return false

      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false

      return true
    })
  }, [tickets, assignFilter, statusFilter, priorityFilter, user])

  // Reset page to 1 when filters change
  useEffect(() => { setPage(1) }, [assignFilter, statusFilter, priorityFilter])

  const pageCount = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE)
  const paginatedTickets = filteredTickets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Stats (calculated from 'tickets' without 'cloture' for accurate pending/inprog)
  const activeTickets = tickets.filter(t => t.status !== 'cloture')
  const breached = activeTickets.filter(t => t.sla_breached).length
  const pending  = activeTickets.filter(t => t.status === 'ouvert').length
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-value text-slate-700">{activeTickets.length}</span>
          <span className="stat-label">Total actifs</span>
        </div>
        <div className="stat-card">
          <span className="stat-value text-amber-600">{pending}</span>
          <span className="stat-label">En attente</span>
        </div>
        <div className="stat-card">
          <span className="stat-value text-brand-600">{inprog}</span>
          <span className="stat-label">En cours</span>
        </div>
        <div className={`stat-card ${breached > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <span className="stat-value text-red-600 flex items-center gap-2">
            {breached > 0 && <AlertTriangle size={20} />}{breached}
          </span>
          <span className="stat-label">SLA dépassés</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          {(['all','mine','unassigned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setAssignFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                assignFilter === f ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {{ all: 'Tous', mine: 'Mes tickets', unassigned: 'Non assignés' }[f]}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <select 
            className="field-select py-1.5 text-sm bg-white" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="active">Statut : Actifs</option>
            <option value="all">Statut : Tous</option>
            <option value="ouvert">Ouvert</option>
            <option value="en_cours">En cours</option>
            <option value="en_attente">En attente</option>
            <option value="resolu">Résolu</option>
            <option value="cloture">Clôturé</option>
          </select>

          <select 
            className="field-select py-1.5 text-sm bg-white" 
            value={priorityFilter} 
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="all">Priorité : Toutes</option>
            <option value="urgente">Urgente</option>
            <option value="haute">Haute</option>
            <option value="normale">Normale</option>
            <option value="basse">Basse</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filteredTickets.length === 0 ? (
          <EmptyState message="Aucun ticket pour ces filtres." />
        ) : (
          <>
            <div className="overflow-x-auto">
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
                    const isNew = t.status === 'ouvert' && !t.assigned_to
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
