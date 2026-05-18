import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase, type TicketFull } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'
import { StatusBadge, Spinner, EmptyState, TicketRow } from '../../../components/ui'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function ClientDashboard() {
  const { user, profile } = useAuth()
  const [tickets, setTickets] = useState<TicketFull[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_attente' | 'en_cours' | 'cloture'>('all')

  useEffect(() => {
    if (!user) return
    supabase
      .from('v_tickets_full')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTickets((data ?? []) as TicketFull[])
        setLoading(false)
      })
  }, [user])

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      return true
    })
  }, [tickets, statusFilter])

  const pending  = tickets.filter(t => t.status === 'en_attente').length
  const inprog   = tickets.filter(t => t.status === 'en_cours').length
  const cloture  = tickets.filter(t => t.status === 'cloture').length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 leading-snug">
            {getGreeting()},{' '}
            <span className="text-brand-600">{profile?.first_name}</span> 👋
          </h1>
          <p className="page-subtitle">Suivez l'avancement de vos réclamations en temps réel.</p>
        </div>
        <Link to="/client/new" className="btn-primary px-3 sm:px-4">
          <PlusCircle size={18} />
          <span className="hidden sm:inline">Nouvelle plainte</span>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
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
          onClick={() => setStatusFilter(prev => prev === 'cloture' ? 'all' : 'cloture')}
          className={`stat-card p-3 sm:p-5 text-left transition-all hover:border-slate-300 ${statusFilter === 'cloture' ? 'ring-2 ring-slate-500 border-transparent bg-slate-50/20' : ''}`}
        >
          <span className="stat-value text-slate-400">{cloture}</span>
          <span className="stat-label">Clôturés</span>
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filteredTickets.length === 0 ? (
          <EmptyState message="Vous n'avez pas encore soumis de plainte." />
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {filteredTickets.map(t => (
                <TicketRow key={t.id} ticket={t} linkTo={`/client/tickets/${t.id}`} avatarName={t.assigned_name || 'Agent'} />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Titre</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(t => (
                    <tr key={t.id}>
                      <td>
                        <Link to={`/client/tickets/${t.id}`} className="font-mono text-xs text-brand-600 hover:text-brand-700 font-semibold">
                          {t.reference}
                        </Link>
                      </td>
                      <td className="max-w-xs">
                        <Link to={`/client/tickets/${t.id}`} className="hover:text-brand-600 transition-colors line-clamp-1">
                          {t.title}
                        </Link>
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td className="text-slate-400 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}
                        </span>
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
