import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Ticket, BarChart3, Users, Zap, Shield, Clock, CheckCircle } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'

const ROLE_HOME: Record<string, string> = {
  client:      '/client',
  agent:       '/agent',
  expert:      '/expert',
  admin:       '/admin',
  super_admin: '/super',
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 py-6 border-b border-slate-200 last:border-0">
      <span className="text-4xl font-display font-bold tracking-tight text-slate-900">{value}</span>
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  )
}


// ─── Mock ticket card ─────────────────────────────────────────────────────────
function MockTicketCard({
  ref: _ref,
  title,
  status,
  time,
  priority,
  initials,
}: {
  ref?: string
  title: string
  status: 'en_attente' | 'en_cours' | 'cloture'
  time: string
  priority: 'haute' | 'normale' | 'basse'
  initials: string
}) {
  const statusConfig = {
    en_attente:   { label: 'En attente',    dot: 'bg-amber-400' },
    en_cours: { label: 'En cours',  dot: 'bg-brand-500 animate-pulse' },
    cloture:   { label: 'Clôturé',    dot: 'bg-slate-400' },
  }
  const priorityConfig = {
    haute:   'text-red-600 bg-red-50',
    normale: 'text-slate-600 bg-slate-100',
    basse:   'text-slate-400 bg-slate-50',
  }

  const s = statusConfig[status]

  return (
    <div className="flex items-center gap-4 py-3.5 px-4 rounded-xl hover:bg-slate-50 transition-colors group cursor-default">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{time}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityConfig[priority]}`}>
          {priority}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          <span className="text-xs text-slate-500">{s.label}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const { session, role } = useAuth()
  const navigate = useNavigate()

  const handleCTA = () => {
    if (session && role) navigate(ROLE_HOME[role] || '/')
    else navigate('/login')
  }

  return (
    <div className="min-h-screen bg-white font-body text-slate-900" style={{ WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Ticket size={18} className="text-brand-600" strokeWidth={2} />
            <span className="font-display font-bold text-lg tracking-tight">TickView</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <a href="#product" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors">Produit</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
              {session ? 'Mon espace' : 'Se connecter'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-16 items-start">

          {/* Left */}
          <div>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 text-xs font-mono text-brand-600 border border-brand-100 bg-brand-50 rounded-full px-3 py-1 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
              Plateforme support client — v2.0
            </div>

            <h1 className="font-display text-[3.25rem] sm:text-[4rem] font-bold leading-[1.05] tracking-tight text-slate-900 mb-6">
              Le support<br />
              sans friction.
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed max-w-md mb-10">
              Tickets, agents, experts et clients — tout sur une seule plateforme. Résolvez plus vite, perdez moins de temps.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
              >
                {session ? 'Aller au dashboard' : 'Créer un compte gratuit'}
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Trust line */}
            <div className="flex items-center gap-2 mt-8 text-xs text-slate-400">
              <CheckCircle size={13} className="text-green-500" />
              Aucune carte de crédit requise
              <span className="mx-1 text-slate-200">·</span>
              <CheckCircle size={13} className="text-green-500" />
              Déploiement immédiat
            </div>
          </div>

          {/* Right — stats column */}
          <div className="border-l border-slate-200 pl-10 hidden lg:block">
            <Stat value="< 2 min" label="Temps moyen de prise en charge" />
            <Stat value="94 %" label="Taux de satisfaction client" />
            <Stat value="3 rôles" label="Agents, experts, admins — tout coordonné" />
            <Stat value="Temps réel" label="Notifications et mises à jour instantanées" />
          </div>
        </div>
      </section>

      {/* ── Product preview ────────────────────────────────────────────────── */}
      <section id="product" className="border-y border-slate-100 bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">File de tickets en direct</h2>
            </div>
            <button onClick={handleCTA} className="hidden sm:inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
              Voir mon dashboard <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Mock dashboard shell */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_40px_-8px_rgba(0,0,0,0.12)] overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 h-10 border-b border-slate-100 bg-slate-50/60">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <div className="flex-1 mx-4">
                <div className="h-5 max-w-xs mx-auto rounded-md bg-slate-100 flex items-center justify-center">
                  <span className="text-[10px] font-mono text-slate-400">app.tickview.bj/agent</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">

              {/* Fake sidebar */}
              <div className="hidden md:flex flex-col border-r border-slate-100 p-4 gap-1 bg-slate-50/40">
                {[
                  { label: 'Dashboard', active: false },
                  { label: 'Tickets', active: true },
                  { label: 'Équipe', active: false },
                  { label: 'Analytiques', active: false },
                  { label: 'Paramètres', active: false },
                ].map(item => (
                  <div
                    key={item.label}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      item.active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Fake ticket list */}
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 px-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tickets récents</span>
                  <span className="text-xs text-slate-400">12 en attente</span>
                </div>

                <MockTicketCard title="Impossible de réinitialiser mon mot de passe" status="en_cours" time="Il y a 3 min" priority="haute" initials="KD" />
                <MockTicketCard title="Facture du mois de mars non reçue" status="en_attente" time="Il y a 15 min" priority="normale" initials="AM" />
                <MockTicketCard title="Application mobile qui plante au démarrage" status="en_cours" time="Il y a 1 h" priority="haute" initials="SO" />
                <MockTicketCard title="Demande de changement d'adresse de livraison" status="cloture" time="Il y a 2 h" priority="basse" initials="FN" />
                <MockTicketCard title="Remboursement non crédité après 7 jours" status="en_attente" time="Il y a 3 h" priority="normale" initials="TB" />

                <div className="mt-3 px-4 pt-3 border-t border-slate-100">
                  <div className="h-2 w-32 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── Dark CTA ───────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="rounded-2xl bg-slate-900 px-10 py-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
                Votre équipe mérite<br />un meilleur support.
              </h2>
              <p className="text-slate-400 mt-3 max-w-md leading-relaxed">
                Rejoignez TickView et réduisez votre temps de résolution dès le premier jour.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors"
              >
                {session ? 'Mon dashboard' : 'Commencer gratuitement'}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Ticket size={14} className="text-brand-600" />
            <span className="text-sm font-medium text-slate-700">TickView</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm">© 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link to="/login" className="hover:text-slate-600 transition-colors">Connexion</Link>
            <Link to="/register" className="hover:text-slate-600 transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
