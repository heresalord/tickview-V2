import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../../../lib/supabase'

const ROLE_HOME: Record<string, string> = {
  client: '/client', agent: '/agent', expert: '/expert',
  admin: '/admin', super_admin: '/super',
}

export function RegisterPage() {
  const { signUp, session, role } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session && role) {
      navigate(ROLE_HOME[role as string] || '/client')
    }
  }, [session, role, navigate])

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Les mots de passe ne correspondent pas.'); return }
    if (form.password.length < 8) { toast.error('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setLoading(true)
    const { error } = await signUp(form.email, form.password, { first_name: form.first_name, last_name: form.last_name })
    setLoading(false)
    if (error) { toast.error(error.message || 'Erreur lors de la création du compte.'); return }
    toast.success('Compte créé ! Vérifiez votre email pour confirmer.')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-brand-600/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Ticket size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-slate-900 leading-none">TickView</h1>
              <p className="text-xs text-slate-400 mt-0.5">Gestion des plaintes & réclamations</p>
            </div>
          </div>
          <h2 className="font-display text-xl text-slate-900 mb-1">Créer un compte</h2>
          <p className="text-sm text-slate-500 mb-6">Rejoignez TickView pour soumettre vos réclamations.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Prénom</label>
                <input className="field-input" placeholder="Yémi" value={form.first_name} onChange={set('first_name')} required />
              </div>
              <div>
                <label className="field-label">Nom</label>
                <input className="field-input" placeholder="Kéïta" value={form.last_name} onChange={set('last_name')} required />
              </div>
            </div>
            <div>
              <label className="field-label">Adresse email</label>
              <input type="email" className="field-input" placeholder="vous@exemple.bj" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="field-label">Mot de passe</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} className="field-input pr-10"
                  placeholder="8 caractères minimum" value={form.password} onChange={set('password')} required />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="field-label">Confirmer le mot de passe</label>
              <input type="password" className="field-input" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Déjà inscrit ?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
