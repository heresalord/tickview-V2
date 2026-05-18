import { useState, useEffect } from 'react'
import { User, Lock, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'

export function ProfilePage() {
  const { profile, refreshProfile, user } = useAuth()
  
  // State for Personal Info
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [orgName, setOrgName] = useState<string>('')
  const [loadingInfo, setLoadingInfo] = useState(false)

  // Fetch org name on mount
  useEffect(() => {
    if (profile?.organization_id) {
      supabase.from('organizations').select('name').eq('id', profile.organization_id).single()
        .then(({ data }) => { if (data) setOrgName(data.name) })
    }
  }, [profile])

  // State for Password
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loadingPassword, setLoadingPassword] = useState(false)

  if (!profile || !user) return null

  const handleUpdateInfo = async () => {
    setLoadingInfo(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Erreur lors de la mise à jour du profil.')
    } else {
      toast.success('Profil mis à jour avec succès.')
      await refreshProfile()
    }
    setLoadingInfo(false)
  }

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères.')
      return
    }

    setLoadingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error('Erreur lors du changement de mot de passe.')
    } else {
      toast.success('Mot de passe mis à jour avec succès.')
      setPassword('')
      setConfirmPassword('')
    }
    setLoadingPassword(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="page-header">
        <h1 className="page-title">Mon Profil</h1>
        <p className="page-subtitle">Gérez vos informations personnelles et vos paramètres de sécurité.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Informations Personnelles */}
        <div className="md:col-span-2 space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2">
              <User size={18} className="text-brand-600" />
              <h2>Informations Personnelles</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Prénom</label>
                <input 
                  type="text" 
                  className="field-input" 
                  value={firstName} 
                  onChange={e => setFirstName(e.target.value)} 
                />
              </div>
              <div>
                <label className="field-label">Nom</label>
                <input 
                  type="text" 
                  className="field-input" 
                  value={lastName} 
                  onChange={e => setLastName(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="field-label">Numéro de téléphone</label>
              <input 
                type="tel" 
                className="field-input" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div>
              <label className="field-label">Adresse Email</label>
              <input 
                type="email" 
                className="field-input bg-slate-50 text-slate-500 cursor-not-allowed" 
                value={user.email || ''} 
                disabled 
              />
              <p className="text-xs text-slate-400 mt-1">L'adresse email ne peut pas être modifiée ici.</p>
            </div>

            <div>
              <label className="field-label">Organisation</label>
              <input 
                type="text" 
                className="field-input bg-slate-50 text-slate-500 cursor-not-allowed font-medium" 
                value={orgName || 'Chargement...'} 
                disabled 
              />
              <p className="text-xs text-slate-400 mt-1">Votre organisation de rattachement.</p>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleUpdateInfo} 
                disabled={loadingInfo || !firstName || !lastName}
                className="btn-primary"
              >
                <Save size={15} /> Enregistrer les modifications
              </button>
            </div>
          </div>

          {/* Sécurité */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2">
              <Lock size={18} className="text-brand-600" />
              <h2>Sécurité</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Nouveau mot de passe</label>
                <input 
                  type="password" 
                  className="field-input" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
              <div>
                <label className="field-label">Confirmer le mot de passe</label>
                <input 
                  type="password" 
                  className="field-input" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleUpdatePassword} 
                disabled={loadingPassword || !password || !confirmPassword}
                className="btn-secondary"
              >
                Changer le mot de passe
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="card bg-slate-50 border-none text-center py-8">
            <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              {profile.first_name[0]}{profile.last_name[0]}
            </div>
            <h3 className="font-semibold text-slate-800">{profile.first_name} {profile.last_name}</h3>
            <p className="text-sm text-slate-500 capitalize mt-1">{profile.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
