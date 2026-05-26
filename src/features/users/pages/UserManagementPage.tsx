import { useEffect, useState, useCallback } from 'react'
import { UserPlus, ToggleLeft, ToggleRight, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, type Profile, type UserRole } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'
import { Avatar, Spinner, EmptyState } from '../../../components/ui'

const ROLE_LABELS: Record<UserRole, string> = {
  client:      'Client',
  agent:       'Agent',
  expert:      'Expert',
  admin:       'Admin',
  super_admin: 'Super Admin',
}

const ROLE_COLORS: Record<UserRole, string> = {
  client:      'bg-slate-100 text-slate-600',
  agent:       'bg-blue-100 text-blue-700',
  expert:      'bg-purple-100 text-purple-700',
  admin:       'bg-brand-100 text-brand-700',
  super_admin: 'bg-red-100 text-red-700',
}

// ─── Create user modal ────────────────────────────────────────────────────────

interface CreateUserModalProps {
  orgId: string
  onClose: () => void
  onCreated: () => void
}

function CreateUserModal({ orgId, onClose, onCreated }: CreateUserModalProps) {
  const [form, setForm] = useState({
    email:      '',
    password:   '',
    first_name: '',
    last_name:  '',
    phone:      '',
    role:       'client' as UserRole,
  })
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.first_name || !form.last_name) {
      toast.error('Tous les champs obligatoires doivent être remplis.')
      return
    }
    setLoading(true)

    // Call the create_user_by_admin DB function
    const { data, error } = await supabase.rpc('create_user_by_admin', {
      p_email:      form.email,
      p_password:   form.password,
      p_role:       form.role,
      p_first_name: form.first_name,
      p_last_name:  form.last_name,
      p_phone:      form.phone || null,
      p_org_id:     orgId,
    })

    if (error) {
      toast.error('Erreur : ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Utilisateur créé avec succès.')
    onCreated()
    onClose()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
        <h2 className="font-display text-xl text-slate-900">Nouvel utilisateur</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Prénom <span className="text-red-500">*</span></label>
            <input className="field-input" value={form.first_name} onChange={set('first_name')} placeholder="Kofi" />
          </div>
          <div>
            <label className="field-label">Nom <span className="text-red-500">*</span></label>
            <input className="field-input" value={form.last_name} onChange={set('last_name')} placeholder="Mensah" />
          </div>
        </div>

        <div>
          <label className="field-label">Email <span className="text-red-500">*</span></label>
          <input className="field-input" type="email" value={form.email} onChange={set('email')} placeholder="kofi@exemple.bj" />
        </div>

        <div>
          <label className="field-label">Mot de passe <span className="text-red-500">*</span></label>
          <input className="field-input" type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 caractères" />
        </div>

        <div>
          <label className="field-label">Téléphone</label>
          <input className="field-input" value={form.phone} onChange={set('phone')} placeholder="+229 61 00 00 00" />
        </div>

        <div>
          <label className="field-label">Rôle</label>
          <select className="field-select" value={form.role} onChange={set('role')}>
            {(['client', 'agent', 'expert', 'admin'] as UserRole[]).map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
          <button onClick={handleCreate} disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function UserManagementPage() {
  const { profile } = useAuth()
  const [users, setUsers]         = useState<Profile[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
    setUsers((data ?? []) as Profile[])
    setLoading(false)
  }, [profile])

  useEffect(() => { load() }, [load])

  const toggleActive = async (user: Profile) => {
    const next = !user.is_active
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: next })
      .eq('id', user.id)
    if (error) { toast.error('Erreur lors de la mise à jour.'); return }
    toast.success(next ? 'Compte activé.' : 'Compte désactivé.')
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: next } : u))
  }

  const filtered = users.filter(u => {
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    const matchSearch = search === '' || [u.first_name, u.last_name].join(' ').toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">Gérez les comptes et les accès de votre organisation.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <UserPlus size={16} /> Nouvel utilisateur
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="field-input pl-9"
            placeholder="Rechercher un utilisateur…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="field-select w-40" value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}>
          <option value="all">Tous les rôles</option>
          {(['client', 'agent', 'expert', 'admin'] as UserRole[]).map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState message="Aucun utilisateur trouvé." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Téléphone</th>
                <th>Statut</th>
                <th>Actif</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={`${u.first_name} ${u.last_name}`} size="sm" />
                      <div>
                        <p className="font-medium text-slate-900">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-slate-400">Créé le {new Date(u.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="text-slate-500 text-sm">{u.phone ?? '—'}</td>
                  <td>
                    <span className={`text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-red-500'}`}>
                      {u.is_active ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleActive(u)}
                      className="btn-ghost p-1 rounded-lg"
                      title={u.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {u.is_active
                        ? <ToggleRight size={22} className="text-green-500" />
                        : <ToggleLeft  size={22} className="text-slate-400" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && profile && (
        <CreateUserModal
          orgId={profile.organization_id}
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}
