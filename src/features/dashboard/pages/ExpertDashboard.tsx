import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
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

export function ExpertDashboard() {
  const { user, profile } = useAuth()
  const [tickets, setTickets] = useState<TicketFull[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_cours' | 'breached'>('all')

  const load = useCallback(async () => {
    if (!user || !profile) return
    const { data } = await supabase
      .from('v_tickets_full')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('assigned_to', user.id)
      .not('status', 'in', '("cloture")')
      .order('created_at', { ascending: false })
    setTickets((data ?? []) as TicketFull[])
    setLoading(false)
  }, [user, profile])

  useEffect(() => { load() }, [load])

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter === 'en_cours' && t.status !== 'en_cours') return false
      if (statusFilter === 'breached' && !t.sla_breached) return false
      return true
    })
  }, [tickets, statusFilter])

  const breached = tickets.filter(t => t.sla_breached).length

  return (
    <div className="max-w-5xl mx-auto">
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold text-slate-900 leading-snug">
          {getGreeting()},{' '}
          <span className="text-brand-600">{profile?.first_name}</span> 👋
        </h1>
        <p className="page-subtitle">Tickets techniques assignés à votre expertise.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <button 
          onClick={() => setStatusFilter(prev => prev === 'all' ? 'all' : 'all')}
          className={`stat-card p-3 sm:p-5 text-left transition-all hover:border-slate-300 ${statusFilter === 'all' ? 'ring-2 ring-slate-500 border-transparent bg-slate-50/20' : ''}`}
        >
          <span className="stat-value text-slate-700">{tickets.length}</span>
          <span className="stat-label">Total assignés</span>
        </button>
        <button 
          onClick={() => setStatusFilter(prev => prev === 'en_cours' ? 'all' : 'en_cours')}
          className={`stat-card p-3 sm:p-5 text-left transition-all hover:border-blue-300 ${statusFilter === 'en_cours' ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/20' : ''}`}
        >
          <span className="stat-value text-brand-600">{tickets.filter(t => t.status === 'en_cours').length}</span>
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

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filteredTickets.length === 0 ? (
          <EmptyState message="Aucun ticket assigné pour le moment." />
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {filteredTickets.map(t => (
                <TicketRow key={t.id} ticket={t} linkTo={`/expert/tickets/${t.id}`} avatarName={t.client_name} />
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
                  {filteredTickets.map(t => (
                    <tr key={t.id} className={t.sla_breached ? 'bg-red-50/50' : ''}>
                      <td>
                        <Link
                          to={`/expert/tickets/${t.id}`}
                          className="font-mono text-xs text-brand-600 hover:text-brand-700 font-semibold"
                        >
                          {t.reference}
                        </Link>
                      </td>
                      <td className="max-w-xs">
                        <Link to={`/expert/tickets/${t.id}`} className="hover:text-brand-600 line-clamp-1">
                          {t.title}
                        </Link>
                      </td>
                      <td className="text-slate-500">{t.client_name}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td>
                        {t.sla_deadline ? (
                          <span className={`text-xs flex items-center gap-1 ${t.sla_breached ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                            <Clock size={12} />
                            {t.sla_breached
                              ? 'Dépassé'
                              : formatDistanceToNow(new Date(t.sla_deadline), { addSuffix: true, locale: fr })}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-slate-400 text-xs">
                        {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
