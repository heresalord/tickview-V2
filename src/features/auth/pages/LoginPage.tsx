import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ticket, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../../../lib/supabase'

const ROLE_HOME: Record<UserRole, string> = {
  client: '/client', agent: '/agent', expert: '/expert',
  admin: '/admin',
}

export function LoginPage() {
  const { signIn, session, role, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      toast.success('Mot de passe mis à jour. Vous pouvez vous connecter.')
      navigate('/login', { replace: true })
    }
  }, [searchParams, navigate])

  // Redirect once the auth state is settled and we have a session + role
  useEffect(() => {
    if (!authLoading && session && role) {
      navigate(ROLE_HOME[role as UserRole] || '/client', { replace: true })
    }
    // Auth resolved but profile missing in DB — unblock the form
    if (!authLoading && session && !role) {
      toast.error('Profil introuvable. Contactez votre administrateur.')
      setLoading(false)
    }
    // Auth resolved with no session (e.g. bad credentials flow completed)
    if (!authLoading && !session) {
      setLoading(false)
    }
  }, [authLoading, session, role, navigate])

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Safety valve: if auth state never resolves (rare edge case), unblock after 12s
    const safetyTimer = setTimeout(() => setLoading(false), 12_000)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        clearTimeout(safetyTimer)
        toast.error('Email ou mot de passe incorrect.')
        setLoading(false)
      }
      // On success: onAuthStateChange in AuthProvider will update session/role,
      // the useEffect above will trigger the redirect.
      // We intentionally leave loading=true during that transition so the
      // button doesn't flicker back to "Se connecter" before navigating.
    } catch {
      clearTimeout(safetyTimer)
      toast.error('Une erreur est survenue. Veuillez réessayer.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-brand-400/10 blur-3xl" />
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

          <h2 className="font-display text-xl text-slate-900 mb-1">Connexion</h2>
          <p className="text-sm text-slate-500 mb-6">Bienvenue. Connectez-vous pour continuer.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Adresse email</label>
              <input type="email" className="field-input" placeholder="vous@exemple.bj"
                value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" autoFocus />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="field-label">Mot de passe</label>
                <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 font-medium mb-1">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} className="field-input pr-10"
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
              Créer un compte
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
