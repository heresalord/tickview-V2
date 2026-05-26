import { useEffect, useState } from 'react'
import { Building, Users, Power, Trash2, Edit2, Plus, X, CheckCircle, ArrowLeft } from 'lucide-react'
import { supabase, type Profile, type Organization } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'
import { Spinner, Avatar } from '../../../components/ui'
import toast from 'react-hot-toast'

interface OrgWithCount extends Organization {
  member_count?: number
}

export function AdminDashboard() {
  const { profile } = useAuth()
  const [orgs, setOrgs] = useState<OrgWithCount[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(false)
  const [mobileView, setMobileView] = useState<'orgs' | 'members'>('orgs')
  
  // Modals
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<OrgWithCount | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgCode, setOrgCode] = useState('')

  const [showMemberModal, setShowMemberModal] = useState(false)
  const [memberForm, setMemberForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'client'
  })
  const [creatingUser, setCreatingUser] = useState(false)

  const [memberFilter, setMemberFilter] = useState('all')

  const loadOrgs = async () => {
    setLoading(true)
    const { data: orgData, error: orgError } = await supabase.from('organizations').select('*').order('name')
    if (orgError) {
      toast.error('Erreur chargement organisations')
      setLoading(false)
      return
    }

    const { data: countData } = await supabase.from('profiles').select('organization_id')
    const counts: Record<string, number> = {}
    if (countData) {
      countData.forEach(p => {
        if (p.organization_id) {
          counts[p.organization_id] = (counts[p.organization_id] || 0) + 1
        }
      })
    }

    const orgsWithCount = orgData.map(o => ({
      ...o,
      member_count: counts[o.id] || 0
    }))
    
    setOrgs(orgsWithCount)
    if (orgsWithCount.length > 0 && !selectedOrgId) {
      setSelectedOrgId(orgsWithCount[0].id)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadOrgs()
    }
  }, [profile])

  const loadMembers = async (orgId: string) => {
    setMembersLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
    if (error) {
      toast.error('Impossible de charger les membres. (Erreur de permissions RLS ?)')
      console.error('Erreur loadMembers:', error)
    } else if (data) {
      setMembers(data as Profile[])
    }
    setMembersLoading(false)
  }

  useEffect(() => {
    if (selectedOrgId) {
      loadMembers(selectedOrgId)
    }
  }, [selectedOrgId])

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) return

    if (editingOrg) {
      const { error } = await supabase.from('organizations').update({
        name: orgName.trim(),
        code: orgCode.trim() || undefined
      }).eq('id', editingOrg.id)
      
      if (error) toast.error(error.message)
      else toast.success('Organisation modifiée.')
    } else {
      const { error } = await supabase.from('organizations').insert({
        name: orgName.trim()
      })
      if (error) toast.error(error.message)
      else toast.success('Organisation créée.')
    }
    
    setShowOrgModal(false)
    setEditingOrg(null)
    setOrgName('')
    setOrgCode('')
    loadOrgs()
  }

  const handleDeleteOrg = async (id: string, name: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'organisation "${name}" ? Toutes ses données seront perdues.`)) return
    const { error } = await supabase.from('organizations').delete().eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Organisation supprimée.')
      if (selectedOrgId === id) setSelectedOrgId(null)
      loadOrgs()
    }
  }

  const handleToggleOrg = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('organizations').update({ is_active: !currentStatus }).eq('id', id)
    if (error) toast.error(error.message)
    else loadOrgs()
  }

  const handleToggleMember = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_active: !currentStatus }).eq('id', id)
    if (error) toast.error(error.message)
    else if (selectedOrgId) loadMembers(selectedOrgId)
  }

  const handleUpdateMemberRole = async (id: string, role: string) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Rôle mis à jour.')
      if (selectedOrgId) loadMembers(selectedOrgId)
    }
  }

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberForm.email || !memberForm.password || !memberForm.first_name || !memberForm.last_name || !selectedOrgId) {
      toast.error('Tous les champs obligatoires doivent être remplis.')
      return
    }
    
    setCreatingUser(true)
    const { error } = await supabase.rpc('create_user_by_admin', {
      p_email:      memberForm.email,
      p_password:   memberForm.password,
      p_role:       memberForm.role,
      p_first_name: memberForm.first_name,
      p_last_name:  memberForm.last_name,
      p_phone:      memberForm.phone || null,
      p_org_id:     selectedOrgId,
    })

    if (error) {
      toast.error('Erreur : ' + error.message)
    } else {
      toast.success('Utilisateur créé avec succès.')
      setShowMemberModal(false)
      loadMembers(selectedOrgId)
    }
    setCreatingUser(false)
  }

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Supprimer ce membre ?')) return
    const { error } = await supabase.rpc('delete_user_by_admin', { p_user_id: id })
    if (error) toast.error(error.message)
    else if (selectedOrgId) loadMembers(selectedOrgId)
  }

  const filteredMembers = members.filter(m => {
    if (memberFilter === 'all') return true
    return m.role === memberFilter
  })

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="page-header">
        <h1 className="text-3xl font-display font-bold text-slate-900">Administration Globale</h1>
        <p className="text-slate-500 mt-1">Gérez toutes les organisations et leurs membres.</p>
      </div>

      {/* Mobile: org list (only shown when mobileView === 'orgs') */}
      <div className={`lg:hidden space-y-4 ${mobileView === 'orgs' ? 'block' : 'hidden'}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Building size={20} className="text-brand-600" /> Organisations
          </h2>
          <button
            onClick={() => { setEditingOrg(null); setOrgName(''); setOrgCode(''); setShowOrgModal(true) }}
            className="btn-primary btn-sm px-2"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {orgs.map(o => (
            <div
              key={o.id}
              onClick={() => { setSelectedOrgId(o.id); setMobileView('members') }}
              className="card p-4 cursor-pointer transition-all hover:border-slate-300 active:bg-slate-50 flex items-center justify-between"
            >
              <div>
                <h3 className="font-bold text-slate-900">{o.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{o.code} · {o.member_count} membres</p>
              </div>
              <ArrowLeft size={16} className="text-slate-400 rotate-180 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: members drill-down (only shown when mobileView === 'members') */}
      <div className={`lg:hidden ${mobileView === 'members' ? 'block' : 'hidden'}`}>
        {selectedOrgId ? (
          <div className="space-y-4">
            {/* Mobile header with back */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileView('orgs')}
                className="btn-ghost p-2 -ml-2"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-800">
                  {orgs.find(o => o.id === selectedOrgId)?.name}
                </h2>
                <p className="text-xs text-slate-400">{filteredMembers.length} membre{filteredMembers.length > 1 ? 's' : ''}</p>
              </div>
              <select
                className="field-select text-sm py-1"
                value={memberFilter}
                onChange={e => setMemberFilter(e.target.value)}
              >
                <option value="all">Tous</option>
                <option value="client">Clients</option>
                <option value="agent">Agents</option>
                <option value="expert">Experts</option>
              </select>
              <button
                onClick={() => { setMemberForm({ first_name: '', last_name: '', email: '', password: '', phone: '', role: 'client' }); setShowMemberModal(true) }}
                className="btn-primary btn-sm px-2"
              >
                <Plus size={16} />
              </button>
            </div>

            {membersLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : filteredMembers.length === 0 ? (
              <div className="card text-center text-slate-400 text-sm py-10">Aucun membre.</div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map(m => (
                  <div key={m.id} className={`card p-3 flex items-center gap-3 ${!m.is_active ? 'opacity-60' : ''}`}>
                    <Avatar name={`${m.first_name} ${m.last_name}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{m.first_name} {m.last_name}</p>
                      <p className="text-xs text-slate-400 truncate">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <select
                        className="field-select text-xs py-0.5 px-1.5"
                        value={m.role}
                        onChange={e => handleUpdateMemberRole(m.id, e.target.value)}
                        disabled={m.role === 'admin'}
                      >
                        <option value="client">Client</option>
                        <option value="agent">Agent</option>
                        <option value="expert">Expert</option>
                      </select>
                      {m.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => handleToggleMember(m.id, m.is_active)}
                            className={`p-1.5 rounded-md ${m.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                          >
                            <Power size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m.id)}
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Desktop: side-by-side grid */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-8">
        {/* Section 1: Organisations */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Building size={20} className="text-brand-600" /> Organisations
            </h2>
            <button 
              onClick={() => { setEditingOrg(null); setOrgName(''); setOrgCode(''); setShowOrgModal(true) }}
              className="btn-primary btn-sm px-2 sm:px-3"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Nouvelle</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {orgs.map(o => (
              <div 
                key={o.id}
                onClick={() => { setSelectedOrgId(o.id); setMobileView('members') }}
                className={`card p-4 cursor-pointer transition-all ${selectedOrgId === o.id ? 'ring-2 ring-brand-500 bg-brand-50/10' : 'hover:border-slate-300'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{o.name}</h3>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{o.code}</p>
                  </div>
                  {!o.is_active && (
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Inactif</span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Users size={14} /> {o.member_count} membres</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingOrg(o); setOrgName(o.name); setOrgCode(o.code); setShowOrgModal(true) }}
                      className="p-1 hover:text-brand-600" title="Modifier"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleOrg(o.id, o.is_active) }}
                      className={`p-1 ${o.is_active ? 'hover:text-amber-600' : 'hover:text-green-600'}`} title={o.is_active ? 'Désactiver' : 'Activer'}
                    >
                      <Power size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteOrg(o.id, o.name) }}
                      className="p-1 hover:text-red-600" title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Membres */}
        <div className="lg:col-span-2">
          {selectedOrgId ? (
            <div className="card h-full flex flex-col p-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-800">
                    Membres de l'organisation
                  </h2>
                  <select 
                    className="field-select text-sm py-1 min-w-[120px]"
                    value={memberFilter}
                    onChange={e => setMemberFilter(e.target.value)}
                  >
                    <option value="all">Tous</option>
                    <option value="client">Clients</option>
                    <option value="agent">Agents</option>
                    <option value="expert">Experts</option>
                  </select>
                </div>
                <button 
                  onClick={() => { setMemberForm({ first_name: '', last_name: '', email: '', password: '', phone: '', role: 'client' }); setShowMemberModal(true) }}
                  className="btn-primary btn-sm px-2 sm:px-3"
                >
                  <Plus size={16} /> <span className="hidden sm:inline">Ajouter un membre</span>
                </button>
              </div>

              {membersLoading ? (
                <div className="p-12 flex justify-center"><Spinner /></div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Aucun membre trouvé.
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Utilisateur</th>
                        <th>Email</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map(m => (
                        <tr key={m.id} className={!m.is_active ? 'bg-slate-50/50 opacity-60' : ''}>
                          <td>
                            <div className="flex items-center gap-2">
                              <Avatar name={`${m.first_name} ${m.last_name}`} size="sm" />
                              <span className="font-medium text-slate-900">{m.first_name} {m.last_name}</span>
                            </div>
                          </td>
                          <td className="text-slate-500">{m.email}</td>
                          <td>
                            <select
                              className="field-select text-xs py-1"
                              value={m.role}
                              onChange={e => handleUpdateMemberRole(m.id, e.target.value)}
                              disabled={m.role === 'admin'} // Protect admin
                            >
                              <option value="client">Client</option>
                              <option value="agent">Agent</option>
                              <option value="expert">Expert</option>
                            </select>
                          </td>
                          <td>
                            {m.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                <CheckCircle size={10} /> Actif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                <Power size={10} /> Inactif
                              </span>
                            )}
                          </td>
                          <td className="text-right flex justify-end gap-1">
                            {m.role !== 'admin' && (
                              <>
                                <button
                                  onClick={() => handleToggleMember(m.id, m.is_active)}
                                  className={`p-1.5 rounded-md hover:bg-slate-100 ${m.is_active ? 'text-amber-600' : 'text-green-600'}`}
                                  title={m.is_active ? 'Désactiver' : 'Activer'}
                                >
                                  <Power size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(m.id)}
                                  className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                                  title="Supprimer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="card h-full flex flex-col items-center justify-center text-slate-400 py-24">
              <Building size={48} className="mb-4 opacity-20" />
              <p>Sélectionnez une organisation pour voir ses membres.</p>
            </div>
          )}
        </div>
      </div>

      {/* Org Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">
                {editingOrg ? "Modifier l'organisation" : "Nouvelle organisation"}
              </h3>
              <button onClick={() => setShowOrgModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveOrg} className="p-6 space-y-4">
              <div>
                <label className="field-label">Nom de l'organisation</label>
                <input 
                  className="field-input" 
                  value={orgName} 
                  onChange={e => setOrgName(e.target.value)} 
                  required 
                />
              </div>
              {editingOrg && (
                <div>
                  <label className="field-label">Code d'accès (Optionnel)</label>
                  <input 
                    className="field-input font-mono uppercase" 
                    value={orgCode} 
                    onChange={e => setOrgCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} 
                    maxLength={12}
                  />
                  <p className="text-xs text-slate-400 mt-1">Laissez vide pour conserver le code actuel.</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowOrgModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && selectedOrgId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Ajouter un membre</h3>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleCreateMember}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Prénom <span className="text-red-500">*</span></label>
                  <input className="field-input" value={memberForm.first_name} onChange={e => setMemberForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Kofi" required />
                </div>
                <div>
                  <label className="field-label">Nom <span className="text-red-500">*</span></label>
                  <input className="field-input" value={memberForm.last_name} onChange={e => setMemberForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Mensah" required />
                </div>
              </div>
              
              <div>
                <label className="field-label">Adresse email <span className="text-red-500">*</span></label>
                <input 
                  type="email"
                  className="field-input" 
                  value={memberForm.email} 
                  onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))} 
                  placeholder="kofi@exemple.bj"
                  required 
                />
              </div>

              <div>
                <label className="field-label">Mot de passe <span className="text-red-500">*</span></label>
                <input 
                  type="password"
                  className="field-input" 
                  value={memberForm.password} 
                  onChange={e => setMemberForm(f => ({ ...f, password: e.target.value }))} 
                  placeholder="Min. 8 caractères"
                  required 
                />
              </div>

              <div>
                <label className="field-label">Téléphone</label>
                <input className="field-input" value={memberForm.phone} onChange={e => setMemberForm(f => ({ ...f, phone: e.target.value }))} placeholder="+229 61 00 00 00" />
              </div>

              <div>
                <label className="field-label">Rôle</label>
                <select className="field-select" value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="client">Client</option>
                  <option value="agent">Agent</option>
                  <option value="expert">Expert</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowMemberModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={creatingUser} className="btn-primary">
                  {creatingUser ? 'Création...' : 'Créer le membre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
