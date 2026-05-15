import { useEffect, useState } from 'react'
import { Save, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, type Category, type SlaConfig, type UserRole, type TicketPriority } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'
import { Spinner } from '../../../components/ui'

export function SettingsPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'sla' | 'categories'>('sla')
  const [loading, setLoading] = useState(true)

  // State
  const [categories, setCategories] = useState<Category[]>([])
  const [slas, setSlas] = useState<SlaConfig[]>([])

  useEffect(() => {
    async function load() {
      if (!profile?.organization_id) return
      
      const [catRes, slaRes] = await Promise.all([
        supabase.from('categories').select('*').eq('organization_id', profile.organization_id).order('name'),
        supabase.from('sla_configs').select('*').eq('organization_id', profile.organization_id)
      ])

      setCategories((catRes.data ?? []) as Category[])
      
      // Initialize SLAs if none exist for the 4 priorities
      const existingSlas = (slaRes.data ?? []) as SlaConfig[]
      const priorities: TicketPriority[] = ['basse', 'normale', 'haute', 'urgente']
      const mergedSlas = priorities.map(p => {
        const found = existingSlas.find(s => s.priority === p)
        return found || {
          id: `new-${p}`,
          organization_id: profile.organization_id,
          priority: p,
          max_hours: p === 'urgente' ? 4 : p === 'haute' ? 12 : p === 'normale' ? 48 : 72,
          escalate_to_role: 'expert' as UserRole
        }
      })
      setSlas(mergedSlas)
      setLoading(false)
    }
    load()
  }, [profile])

  const handleSaveSLA = async () => {
    setLoading(true)
    for (const sla of slas) {
      if (sla.id.startsWith('new-')) {
        await supabase.from('sla_configs').insert({
          organization_id: sla.organization_id,
          priority: sla.priority,
          max_hours: sla.max_hours,
          escalate_to_role: sla.escalate_to_role
        })
      } else {
        await supabase.from('sla_configs').update({
          max_hours: sla.max_hours,
          escalate_to_role: sla.escalate_to_role
        }).eq('id', sla.id)
      }
    }
    toast.success('Configuration SLA enregistrée.')
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="page-header">
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Configurez le comportement de votre organisation.</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('sla')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sla' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Règles SLA (Escalade)
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'categories' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Catégories de tickets
        </button>
      </div>

      {activeTab === 'sla' && (
        <div className="card space-y-6 animate-fade-in">
          <div>
            <h2 className="font-semibold text-slate-800">Service Level Agreements (SLA)</h2>
            <p className="text-sm text-slate-500 mt-1">
              Définissez le temps maximum de résolution attendu selon la priorité du ticket. 
              Si le temps est dépassé, le ticket peut être automatiquement escaladé.
            </p>
          </div>

          <div className="space-y-4">
            {slas.map((sla, i) => (
              <div key={sla.priority} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                <div className="w-24">
                  <span className="text-sm font-semibold capitalize text-slate-700">{sla.priority}</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    className="field-input w-24"
                    value={sla.max_hours}
                    onChange={e => {
                      const newSlas = [...slas]
                      newSlas[i].max_hours = parseInt(e.target.value) || 1
                      setSlas(newSlas)
                    }}
                  />
                  <span className="text-sm text-slate-500">heures max</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm text-slate-500">Escalader vers :</span>
                  <select
                    className="field-select w-40"
                    value={sla.escalate_to_role || ''}
                    onChange={e => {
                      const newSlas = [...slas]
                      newSlas[i].escalate_to_role = (e.target.value || null) as UserRole
                      setSlas(newSlas)
                    }}
                  >
                    <option value="">Aucun</option>
                    <option value="expert">Expert</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button onClick={handleSaveSLA} className="btn-primary">
              <Save size={16} /> Enregistrer les SLA
            </button>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="card space-y-6 animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold text-slate-800">Catégories</h2>
              <p className="text-sm text-slate-500 mt-1">
                Gérez les catégories disponibles lorsque vos clients créent un ticket.
              </p>
            </div>
            <button className="btn-secondary btn-sm" onClick={() => toast('Bientôt disponible !')}>
              <Plus size={14} /> Nouvelle Catégorie
            </button>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Description</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400">Aucune catégorie configurée.</td>
                  </tr>
                ) : (
                  categories.map(cat => (
                    <tr key={cat.id}>
                      <td className="font-medium">{cat.name}</td>
                      <td className="text-slate-500">{cat.description || '-'}</td>
                      <td>
                        <span className={`badge ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {cat.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button className="text-slate-400 hover:text-red-500 transition-colors p-1" onClick={() => toast('Bientôt disponible !')}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
