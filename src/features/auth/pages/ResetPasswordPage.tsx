import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket, Lock } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Spinner } from '../../../components/ui'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase va automatiquement valider le token de l'URL et créer une session temporaire (event: PASSWORD_RECOVERY)
    // Nous pouvons écouter cet événement pour savoir si l'utilisateur est bien autorisé à changer son mot de passe
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // L'utilisateur peut réinitialiser son mot de passe, l'interface s'affiche normalement
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else {
      // Redirection après succès
      navigate('/login?reset=success')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-body relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-64 bg-brand-600 rounded-b-[3rem] -z-10 shadow-lg" />
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-slate-100">
        <div className="p-8 pb-6 border-b border-slate-100 text-center">
          <div className="mx-auto bg-brand-100 w-12 h-12 flex items-center justify-center rounded-xl mb-4 text-brand-600">
            <Ticket size={24} />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 mb-1">Nouveau mot de passe</h1>
          <p className="text-slate-500 text-sm">
            Veuillez entrer votre nouveau mot de passe.
          </p>
        </div>

        <div className="p-8 bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="field-label">Nouveau mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? <Spinner /> : 'Enregistrer le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
