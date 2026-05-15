import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket, Mail, ArrowLeft } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Spinner } from '../../../components/ui'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    // URL de redirection après le clic sur le lien dans l'email
    const redirectUrl = `${window.location.origin}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      setErrorMsg(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-body relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-64 bg-brand-600 rounded-b-[3rem] -z-10 shadow-lg" />
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-slate-100">
        <div className="p-8 pb-6 border-b border-slate-100 text-center">
          <div className="mx-auto bg-brand-100 w-12 h-12 flex items-center justify-center rounded-xl mb-4 text-brand-600">
            <Ticket size={24} />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 mb-1">Mot de passe oublié</h1>
          <p className="text-slate-500 text-sm">
            Entrez votre adresse email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <div className="p-8 bg-white">
          {success ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium">
                Un email contenant un lien de réinitialisation a été envoyé à <br/><strong>{email}</strong>.
              </div>
              <p className="text-slate-500 text-sm">
                Veuillez vérifier votre boîte de réception et vos courriers indésirables.
              </p>
              <Link to="/login" className="btn-secondary w-full justify-center">
                <ArrowLeft size={16} /> Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="field-label">Adresse email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-input pl-10"
                    placeholder="vous@exemple.fr"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-primary w-full justify-center mt-2"
              >
                {loading ? <Spinner /> : 'Envoyer le lien'}
              </button>

              <div className="text-center mt-6">
                <Link to="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center justify-center gap-2">
                  <ArrowLeft size={14} /> Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
