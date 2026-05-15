import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Clock } from 'lucide-react'
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

export function ClientDashboard() {
  const { user, profile } = useAuth()
  const [tickets, setTickets] = useState<TicketFull[]>([])
  const [loading, setLoading] = useState(true)

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

  const open    = tickets.filter(t => !['cloture', 'resolu'].includes(t.status)).length
  const resolu  = tickets.filter(t => t.status === 'resolu').length
  const cloture = tickets.filter(t => t.status === 'cloture').length

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
        <Link to="/client/new" className="btn-primary">
          <PlusCircle size={16} />
          Nouvelle plainte
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-value text-brand-600">{open}</span>
          <span className="stat-label">En cours</span>
        </div>
        <div className="stat-card">
          <span className="stat-value text-green-600">{resolu}</span>
          <span className="stat-label">Résolus</span>
        </div>
        <div className="stat-card">
          <span className="stat-value text-slate-400">{cloture}</span>
          <span className="stat-label">Clôturés</span>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : tickets.length === 0 ? (
          <EmptyState message="Vous n'avez pas encore soumis de plainte." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Titre</th>
                <th>Statut</th>
                <th>Priorité</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
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
                  <td><PriorityBadge priority={t.priority} /></td>
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
        )}
      </div>
    </div>
  )
}
