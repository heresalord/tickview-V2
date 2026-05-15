import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, type Category, type TicketPriority } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'

const PRIORITIES: { value: TicketPriority; label: string; desc: string }[] = [
  { value: 'basse',   label: 'Basse',   desc: 'Peut attendre quelques jours' },
  { value: 'normale', label: 'Normale', desc: 'Délai standard de traitement' },
  { value: 'haute',   label: 'Haute',   desc: 'Besoin d\'une réponse rapide' },
  { value: 'urgente', label: 'Urgente', desc: 'Impact critique sur l\'activité' },
]

export function NewTicketPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    priority: 'normale' as TicketPriority,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => setCategories((data ?? []) as Category[]))
  }, [])

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return
    setLoading(true)

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        organization_id: profile.organization_id,
        client_id:       user.id,
        title:           form.title.trim(),
        description:     form.description.trim(),
        priority:        form.priority,
        category_id:     form.category_id || null,
        status:          'ouvert' as const,
      })
      .select()
      .single()

    if (error || !ticket) {
      toast.error('Erreur lors de la soumission. Réessayez.')
      setLoading(false)
      return
    }

    await supabase.from('ticket_actions').insert({
      ticket_id:   ticket.id,
      actor_id:    user.id,
      action_type: 'creation',
      comment:     'Ticket créé par le client.',
      is_internal: false,
      metadata:    { to_status: 'ouvert' },
    })

    toast.success(`Plainte soumise — ${ticket.reference}`)
    navigate('/client')
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-2">
          <ArrowLeft size={16} /> Retour
        </button>
        <h1 className="page-title">Nouvelle plainte</h1>
        <p className="page-subtitle">Décrivez votre problème avec le plus de détails possible.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="field-label">Titre de la plainte <span className="text-red-500">*</span></label>
            <input
              className="field-input"
              placeholder="Résumez votre problème en une phrase"
              value={form.title}
              onChange={set('title')}
              maxLength={150}
              required
            />
            <p className="text-xs text-slate-400 mt-1">{form.title.length}/150</p>
          </div>

          <div>
            <label className="field-label">Description détaillée <span className="text-red-500">*</span></label>
            <textarea
              className="field-textarea"
              rows={5}
              placeholder="Décrivez le problème : quand cela s'est-il produit, quel est l'impact, qu'avez-vous déjà essayé…"
              value={form.description}
              onChange={set('description')}
              maxLength={1000}
              required
            />
            <p className="text-xs text-slate-400 mt-1">{form.description.length}/1000</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Catégorie</label>
              <select className="field-select" value={form.category_id} onChange={set('category_id')}>
                <option value="">Sélectionner…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Niveau d'urgence suggéré</label>
              <select className="field-select" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-colors cursor-not-allowed">
            <Paperclip size={20} className="mx-auto mb-2" />
            <p className="text-sm">Pièces jointes (disponible prochainement)</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Envoi en cours…' : 'Soumettre la plainte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
