import { useEffect, useState } from 'react'
import { Save, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, type Category, type SlaConfig, type UserRole, type TicketPriority } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'
import { Spinner } from '../../../components/ui'

export function SettingsPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'org' | 'sla' | 'categories'>('org')
  const [loading, setLoading] = useState(true)

  // State
  const [categories, setCategories] = useState<Category[]>([])
  const [slas, setSlas] = useState<SlaConfig[]>([])
  const [orgCode, setOrgCode] = useState('')
  
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')

  const handleSaveOrg = async () => {
    setLoading(true)
    const { error } = await supabase.from('organizations').update({
      code: orgCode
    }).eq('id', profile!.organization_id)
    if (error) {
      if (error.code === '23505') {
        toast.error('Ce code est déjà utilisé par une autre organisation.')
      } else {
        toast.error('Erreur lors de la mise à jour du code.')
      }
    } else {
      toast.success('Code organisation mis à jour.')
    }
    setLoading(false)
  }

  useEffect(() => {
    async function load() {
      if (!profile?.organization_id) return
      
      const [orgRes, catRes, slaRes] = await Promise.all([
        supabase.from('organizations').select('code').eq('id', profile.organization_id).single(),
        supabase.from('categories').select('*').eq('organization_id', profile.organization_id).order('name'),
        supabase.from('sla_configs').select('*').eq('organization_id', profile.organization_id)
      ])

      if (orgRes.data) setOrgCode(orgRes.data.code)
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
          response_time_hours: sla.max_hours,
        })
      } else {
        await supabase.from('sla_configs').update({
          response_time_hours: sla.max_hours,
        }).eq('id', sla.id)
      }
    }
    toast.success('Configuration SLA enregistrée.')
    setLoading(false)
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    setLoading(true)
    const { data, error } = await supabase.from('categories').insert({
      organization_id: profile!.organization_id,
      name: newCatName.trim(),
      description: newCatDesc.trim() || null,
      is_active: true
    }).select().single()
    
    if (error) {
      toast.error(error.message)
    } else if (data) {
      setCategories([...categories, data as Category])
      toast.success('Catégorie créée.')
      setShowCategoryModal(false)
      setNewCatName('')
      setNewCatDesc('')
    }
    setLoading(false)
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Voulez-vous supprimer cette catégorie ?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Catégorie supprimée.')
      setCategories(categories.filter(c => c.id !== id))
    }
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
          onClick={() => setActiveTab('org')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'org' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Organisation
        </button>
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

      {activeTab === 'org' && (
        <div className="card space-y-6 animate-fade-in">
          <div>
            <h2 className="font-semibold text-slate-800">Code d'accès organisation</h2>
            <p className="text-sm text-slate-500 mt-1">
              Ce code unique permet à vos collaborateurs et clients de rejoindre automatiquement votre organisation lors de leur inscription.
            </p>
          </div>

          <div className="max-w-sm">
            <label className="field-label">Code d'accès</label>
            <input
              className="field-input font-mono uppercase tracking-widest text-lg"
              value={orgCode}
              onChange={e => setOrgCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              maxLength={12}
            />
            <p className="text-xs text-slate-400 mt-2">
              ⚠️ Modifier ce code n'affecte pas les comptes existants. Les nouveaux inscrits devront utiliser ce nouveau code.
            </p>
          </div>

          <div className="pt-2">
            <button onClick={handleSaveOrg} disabled={loading || !orgCode.trim()} className="btn-primary">
              <Save size={16} /> Enregistrer
            </button>
          </div>
        </div>
      )}

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
              <div key={sla.priority} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                <div className="sm:w-24">
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
            <button className="btn-secondary btn-sm px-2 sm:px-3" onClick={() => setShowCategoryModal(true)}>
              <Plus size={16} /> <span className="hidden sm:inline">Nouvelle Catégorie</span>
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
                        <button className="text-slate-400 hover:text-red-500 transition-colors p-1" onClick={() => handleDeleteCategory(cat.id)}>
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Nouvelle Catégorie</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              <div>
                <label className="field-label">Nom de la catégorie</label>
                <input 
                  className="field-input" 
                  value={newCatName} 
                  onChange={e => setNewCatName(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="field-label">Description (Optionnelle)</label>
                <textarea 
                  className="field-textarea" 
                  rows={2}
                  value={newCatDesc} 
                  onChange={e => setNewCatDesc(e.target.value)} 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" className="btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
