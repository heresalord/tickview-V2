import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, User, AlertTriangle, CheckCircle2,
  MessageSquare, RotateCcw, XCircle, Send, ChevronDown,
  Lock, Unlock,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { supabase, type TicketFull, type TicketAction, type Profile, type ActionType } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'
import { StatusBadge, PriorityBadge, Spinner, Avatar } from '../../../components/ui'

// ─── Which action types look like "messages" vs "events" ─────────────────────
const MESSAGE_TYPES: ActionType[] = ['reponse', 'demande_info', 'info_recue']

// ─── Action type labels ───────────────────────────────────────────────────────
const ACTION_LABELS: Record<ActionType, string> = {
  creation:            'Ticket créé',
  prise_en_charge:     'Pris en charge',
  reponse:             'Réponse',
  reassignation:       'Réassigné',
  demande_info:        'Informations demandées',
  info_recue:          'Informations reçues',
  resolution:          'Marqué résolu',
  cloture:             'Clôturé',
  reouverture:         'Rouvert',
  escalade:            'Escalade déclenchée',
  commentaire_interne: 'Note interne',
}

const ACTION_COLORS: Record<ActionType, string> = {
  creation:            'bg-slate-400',
  prise_en_charge:     'bg-brand-500',
  reponse:             'bg-sky-500',
  reassignation:       'bg-purple-500',
  demande_info:        'bg-amber-500',
  info_recue:          'bg-amber-400',
  resolution:          'bg-green-500',
  cloture:             'bg-slate-600',
  reouverture:         'bg-orange-500',
  escalade:            'bg-red-500',
  commentaire_interne: 'bg-slate-300',
}

// ─── SLA countdown ────────────────────────────────────────────────────────────
function SlaCountdown({ deadline, breached }: { deadline: string; breached: boolean }) {
  if (breached) {
    return (
      <span className="flex items-center gap-1.5 text-red-600 font-semibold text-sm">
        <AlertTriangle size={14} /> SLA dépassé
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-slate-500 text-sm">
      <Clock size={14} />
      Expire {formatDistanceToNow(new Date(deadline), { addSuffix: true, locale: fr })}
    </span>
  )
}

// ─── Conversation + Timeline hybrid ──────────────────────────────────────────
function ConversationTimeline({
  actions,
  profiles,
  clientId,
}: {
  actions: TicketAction[]
  profiles: Record<string, Profile>
  clientId: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [actions.length])

  if (actions.length === 0) return null

  return (
    <div className="space-y-3">
      {actions.map((action, i) => {
        const actor = profiles[action.actor_id]
        const name = actor ? `${actor.first_name} ${actor.last_name}` : 'Système'
        const isMessage = MESSAGE_TYPES.includes(action.action_type)
        const isFromClient = action.actor_id === clientId
        const isLast = i === actions.length - 1

        // ── Chat bubble for messages ──────────────────────────────────────
        if (isMessage && action.comment) {
          return (
            <div
              key={action.id}
              className={`flex gap-2.5 ${isFromClient ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className="flex-shrink-0 mt-1">
                <Avatar name={name} size="sm" />
              </div>
              <div className={`max-w-[75%] space-y-1 ${isFromClient ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`flex items-center gap-2 ${isFromClient ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-xs font-medium text-slate-600">{name}</span>
                  {action.is_internal && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5">
                      <Lock size={9} /> Interne
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {format(new Date(action.created_at), 'HH:mm', { locale: fr })}
                  </span>
                </div>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isFromClient
                      ? 'bg-brand-600 text-white rounded-tr-sm'
                      : action.is_internal
                      ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-tl-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                  }`}
                >
                  {action.comment}
                </div>
                <span className="text-xs text-slate-400">
                  {format(new Date(action.created_at), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
            </div>
          )
        }

        // ── Timeline event for system actions ─────────────────────────────
        return (
          <div key={action.id} className="flex gap-3 py-1">
            <div className="flex flex-col items-center">
              <div className={`h-2 w-2 rounded-full mt-1 flex-shrink-0 ${ACTION_COLORS[action.action_type]}`} />
              {!isLast && <div className="w-px flex-1 bg-slate-100 mt-1 min-h-[12px]" />}
            </div>
            <div className="pb-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-600">
                  {ACTION_LABELS[action.action_type]}
                </span>
                <span className="text-xs text-slate-400">— par {name}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {format(new Date(action.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </span>
              </div>
              {action.comment && !isMessage && (
                <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                  {action.comment}
                </p>
              )}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

// ─── Agent / Expert action panel ──────────────────────────────────────────────
interface ActionPanelProps {
  ticket: TicketFull
  agents: Profile[]
  onActionDone: () => void
}

function AgentActionPanel({ ticket, agents, onActionDone }: ActionPanelProps) {
  const { user, role } = useAuth()
  const [comment, setComment]       = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [reassignTo, setReassignTo] = useState('')
  const [loading, setLoading]       = useState(false)
  const [mode, setMode]             = useState<'reply' | 'reassign' | null>(null)

  const isMine       = ticket.assigned_to === user?.id
  const isUnassigned = !ticket.assigned_to
  const isClosed     = ticket.status === 'cloture'

  const writeAction = async (
    actionType: ActionType,
    comment: string,
    internal: boolean,
    metadata: Record<string, unknown> = {},
  ) => {
    const { error } = await supabase.from('ticket_actions').insert({
      ticket_id:   ticket.id,
      actor_id:    user!.id,
      action_type: actionType,
      comment,
      is_internal: internal,
      metadata,
    })
    if (error) throw error
  }

  const updateTicket = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from('tickets')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', ticket.id)
    if (error) throw error
  }

  const handleTakeOwnership = async () => {
    setLoading(true)
    try {
      await updateTicket({ assigned_to: user!.id, status: 'en_cours' })
      await writeAction('prise_en_charge', 'Ticket pris en charge.', false, { to_status: 'en_cours' })
      toast.success('Ticket pris en charge.')
      onActionDone()
    } catch (e: any) {
      toast.error(`Erreur : ${e?.message ?? 'inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!comment.trim()) return
    setLoading(true)
    try {
      await writeAction('reponse', comment.trim(), isInternal, {})
      await updateTicket({})
      toast.success(isInternal ? 'Note interne ajoutée.' : 'Réponse envoyée au client.')
      setComment('')
      setMode(null)
      onActionDone()
    } catch (e: any) {
      toast.error(`Erreur : ${e?.message ?? 'inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReassign = async () => {
    if (!reassignTo) return
    setLoading(true)
    try {
      const target = agents.find(a => a.id === reassignTo)
      await updateTicket({ assigned_to: reassignTo, status: 'reassigne' })
      await writeAction(
        'reassignation',
        `Réassigné à ${target?.first_name} ${target?.last_name}.`,
        false,
        { to_status: 'reassigne', assigned_to: reassignTo },
      )
      toast.success('Ticket réassigné.')
      setReassignTo('')
      setMode(null)
      onActionDone()
    } catch (e: any) {
      toast.error(`Erreur : ${e?.message ?? 'inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    setLoading(true)
    try {
      await updateTicket({ status: 'resolu' })
      await writeAction('resolution', 'Ticket marqué résolu.', false, { to_status: 'resolu' })
      toast.success('Ticket marqué comme résolu.')
      onActionDone()
    } catch (e: any) {
      toast.error(`Erreur : ${e?.message ?? 'inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = async () => {
    setLoading(true)
    try {
      await updateTicket({ status: 'cloture' })
      await writeAction('cloture', 'Ticket clôturé.', false, { to_status: 'cloture' })
      toast.success('Ticket clôturé.')
      onActionDone()
    } catch (e: any) {
      toast.error(`Erreur : ${e?.message ?? 'inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReturnToAgent = async () => {
    setLoading(true)
    try {
      await updateTicket({ status: 'en_cours', assigned_to: null })
      await writeAction(
        'reponse',
        comment.trim() || "Intervention technique terminée. Ticket retourné à l'agent.",
        false,
        { to_status: 'en_cours' },
      )
      toast.success('Ticket retourné à la file agent.')
      setComment('')
      setMode(null)
      onActionDone()
    } catch (e: any) {
      toast.error(`Erreur : ${e?.message ?? 'inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  if (isClosed) {
    return (
      <div className="card text-center text-slate-400 text-sm py-6">
        <XCircle size={24} className="mx-auto mb-2 opacity-40" />
        Ce ticket est clôturé.
      </div>
    )
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-slate-800 text-sm">Actions</h3>

      {(isUnassigned || (!isMine && role !== 'expert')) && (
        <button onClick={handleTakeOwnership} disabled={loading} className="btn-primary w-full justify-center">
          <Unlock size={15} /> Prendre en charge
        </button>
      )}

      {mode === 'reply' ? (
        <div className="space-y-2">
          <textarea
            className="field-textarea text-sm"
            rows={4}
            placeholder={isInternal ? 'Note interne (non visible par le client)…' : 'Réponse au client…'}
            value={comment}
            onChange={e => setComment(e.target.value)}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded" />
              Note interne
            </label>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => { setMode(null); setComment('') }} className="btn-secondary btn-sm">Annuler</button>
              <button onClick={handleReply} disabled={loading || !comment.trim()} className="btn-primary btn-sm">
                <Send size={13} /> Envoyer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setMode('reply')} className="btn-secondary w-full justify-center">
          <MessageSquare size={15} /> Répondre / Ajouter une note
        </button>
      )}

      {(role === 'agent' || role === 'admin') && mode === 'reassign' ? (
        <div className="space-y-2">
          <select className="field-select text-sm" value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
            <option value="">Choisir un assigné…</option>
            {agents
              .filter(a => (role === 'admin' ? true : a.role === 'expert') && a.id !== user?.id)
              .map(a => (
                <option key={a.id} value={a.id}>
                  {a.first_name} {a.last_name} ({a.role})
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            <button onClick={() => { setMode(null); setReassignTo('') }} className="btn-secondary btn-sm flex-1 justify-center">Annuler</button>
            <button onClick={handleReassign} disabled={loading || !reassignTo} className="btn-primary btn-sm flex-1 justify-center">Assigner</button>
          </div>
        </div>
      ) : (role === 'agent' || role === 'admin') && (
        <button onClick={() => setMode('reassign')} className="btn-secondary w-full justify-center text-purple-600 hover:bg-purple-50">
          <ChevronDown size={15} /> Assigner / Réassigner
        </button>
      )}

      {role === 'expert' && (
        <div className="space-y-2">
          <textarea
            className="field-textarea text-sm"
            rows={3}
            placeholder="Solution technique apportée (optionnel)…"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          <button onClick={handleReturnToAgent} disabled={loading} className="btn-secondary w-full justify-center text-purple-600 hover:bg-purple-50">
            <RotateCcw size={15} /> Retourner à la file agent
          </button>
        </div>
      )}

      <div className="flex gap-2 pt-1 border-t border-slate-100">
        {ticket.status !== 'resolu' && (
          <button onClick={handleResolve} disabled={loading} className="btn-secondary flex-1 justify-center text-green-600 hover:bg-green-50">
            <CheckCircle2 size={15} /> Marquer résolu
          </button>
        )}
        <button onClick={handleClose} disabled={loading} className="btn-danger flex-1 justify-center">
          <XCircle size={15} /> Clôturer
        </button>
      </div>
    </div>
  )
}

// ─── Client reply box ─────────────────────────────────────────────────────────
function ClientReplyBox({ ticket, onDone }: { ticket: TicketFull; onDone: () => void }) {
  const { user } = useAuth()
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  if (ticket.status === 'cloture' || ticket.status === 'resolu') return null

  const handleReply = async () => {
    if (!comment.trim()) return
    setLoading(true)
    try {
      const { error: insertError } = await supabase.from('ticket_actions').insert({
        ticket_id:   ticket.id,
        actor_id:    user!.id,
        action_type: 'reponse',
        comment:     comment.trim(),
        is_internal: false,
      })

      if (insertError) {
        console.error('ClientReplyBox insert error:', insertError)
        toast.error(`Erreur envoi : ${insertError.message}`)
        return
      }

      // Non-blocking update of updated_at
      const { error: updateError } = await supabase.from('tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticket.id)
      if (updateError) console.error('ClientReplyBox ticket update error:', updateError)

      setComment('')
      onDone()
    } catch (e: any) {
      console.error('ClientReplyBox exception:', e)
      toast.error(`Erreur inattendue : ${e?.message ?? 'inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleReply()
    }
  }

  return (
    <div className="card space-y-3">
      <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
        <MessageSquare size={15} className="text-brand-600" />
        Répondre
      </h3>
      <textarea
        className="field-textarea text-sm"
        rows={3}
        placeholder="Votre message… (Ctrl+Entrée pour envoyer)"
        value={comment}
        onChange={e => setComment(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Ctrl+Entrée pour envoyer</span>
        <button
          onClick={handleReply}
          disabled={loading || !comment.trim()}
          className="btn-primary btn-sm"
        >
          {loading ? <Spinner /> : <Send size={13} />}
          {loading ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}

// ─── Satisfaction form ────────────────────────────────────────────────────────
function SatisfactionForm({ ticket, onDone }: { ticket: TicketFull; onDone: () => void }) {
  const [score, setScore]     = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  if (ticket.satisfaction_score) {
    return (
      <div className="card text-center space-y-1">
        <p className="text-sm font-medium text-slate-700">Votre évaluation</p>
        <p className="text-3xl">{'⭐'.repeat(ticket.satisfaction_score)}</p>
        {ticket.satisfaction_comment && (
          <p className="text-sm text-slate-500 italic">"{ticket.satisfaction_comment}"</p>
        )}
      </div>
    )
  }

  if (ticket.status !== 'resolu' && ticket.status !== 'cloture') return null

  const handleSubmit = async () => {
    if (!score) return
    setLoading(true)
    await supabase.from('tickets').update({
      satisfaction_score:   score,
      satisfaction_comment: comment.trim() || null,
      satisfaction_at:      new Date().toISOString(),
    }).eq('id', ticket.id)
    toast.success('Merci pour votre évaluation !')
    onDone()
    setLoading(false)
  }

  return (
    <div className="card space-y-3">
      <h3 className="font-semibold text-slate-800 text-sm">Évaluer cette intervention</h3>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setScore(n)}
            className={`text-2xl transition-transform hover:scale-110 ${score >= n ? 'opacity-100' : 'opacity-25'}`}
          >
            ⭐
          </button>
        ))}
      </div>
      <textarea
        className="field-textarea text-sm"
        rows={2}
        placeholder="Commentaire (optionnel)…"
        value={comment}
        onChange={e => setComment(e.target.value)}
      />
      <button onClick={handleSubmit} disabled={loading || !score} className="btn-primary w-full justify-center">
        Envoyer mon évaluation
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function TicketDetailPage() {
  const { id }         = useParams<{ id: string }>()
  const navigate       = useNavigate()
  const { role, user } = useAuth()

  const [ticket,   setTicket]   = useState<TicketFull | null>(null)
  const [actions,  setActions]  = useState<TicketAction[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [agents,   setAgents]   = useState<Profile[]>([])
  const [loading,  setLoading]  = useState(true)

  const isStaff = role === 'agent' || role === 'expert' || role === 'admin'

  const loadTicket = useCallback(async () => {
    if (!id) return

    const { data: t } = await supabase
      .from('v_tickets_full')
      .select('*')
      .eq('id', id)
      .single()
    if (!t) { navigate(-1); return }
    setTicket(t as TicketFull)

    const { data: acts } = await supabase
      .from('ticket_actions')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    const all = (acts ?? []) as TicketAction[]
    const visible = role === 'client' ? all.filter(a => !a.is_internal) : all
    setActions(visible)

    const actorIds = [...new Set(all.map(a => a.actor_id))]
    if (actorIds.length) {
      const { data: profs } = await supabase.from('profiles').select('*').in('id', actorIds)
      const map: Record<string, Profile> = {}
      ;(profs ?? []).forEach((p: Profile) => { map[p.id] = p })
      setProfiles(map)
    }

    if (isStaff) {
      const { data: staff } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', (t as TicketFull).organization_id)
        .in('role', ['agent', 'expert'])
        .eq('is_active', true)
      setAgents((staff ?? []) as Profile[])
    }

    setLoading(false)
  }, [id, navigate, role, isStaff])

  useEffect(() => { loadTicket() }, [loadTicket])

  // ── Realtime: listen for new actions on this ticket ───────────────────────
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`ticket-actions-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_actions', filter: `ticket_id=eq.${id}` },
        () => { loadTicket() },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, loadTicket])

  const backPath = role === 'client'
    ? '/client'
    : role === 'expert'
    ? '/expert'
    : role === 'admin'
    ? '/admin/tickets'
    : '/agent'

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  if (!ticket) return null

  const clientId = ticket.client_id

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate(backPath)} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft size={16} /> Retour
      </button>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="font-mono text-xs text-brand-600 font-semibold mb-1">{ticket.reference}</p>
          <h1 className="text-2xl font-display text-slate-900 leading-snug">{ticket.title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {ticket.category_name && (
              <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                {ticket.category_name}
              </span>
            )}
            {ticket.sla_deadline && (
              <SlaCountdown deadline={ticket.sla_deadline} breached={ticket.sla_breached} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Description</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Conversation ({actions.length} message{actions.length > 1 ? 's' : ''})
            </h2>
            <ConversationTimeline
              actions={actions}
              profiles={profiles}
              clientId={clientId}
            />
          </div>

          {role === 'client' && (
            <ClientReplyBox ticket={ticket} onDone={loadTicket} />
          )}

          {role === 'client' && (
            <SatisfactionForm ticket={ticket} onDone={loadTicket} />
          )}
        </div>

        <div className="space-y-4">
          <div className="card space-y-3 text-sm">
            <h3 className="font-semibold text-slate-800">Informations</h3>

            <div className="flex items-start gap-2 text-slate-600">
              <User size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Client</p>
                <p>{ticket.client_name}</p>
              </div>
            </div>

            {ticket.assigned_name ? (
              <div className="flex items-start gap-2 text-slate-600">
                <Avatar name={ticket.assigned_name} size="sm" />
                <div>
                  <p className="text-xs text-slate-400">Assigné à</p>
                  <p>{ticket.assigned_name}</p>
                  <p className="text-xs text-slate-400 capitalize">{ticket.assigned_role}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Non assigné</p>
            )}

            <div className="border-t border-slate-100 pt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Créé</span>
                <span>{format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: fr })}</span>
              </div>
              {ticket.resolved_at && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Résolu</span>
                  <span>{format(new Date(ticket.resolved_at), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              )}
              {ticket.closed_at && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Clôturé</span>
                  <span>{format(new Date(ticket.closed_at), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              )}
            </div>
          </div>

          {isStaff && (
            <AgentActionPanel
              ticket={ticket}
              agents={agents}
              onActionDone={loadTicket}
            />
          )}
        </div>
      </div>
    </div>
  )
}
