import { useState } from 'react'
import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Ticket, Users, Settings, LogOut,
  Menu, X, ShieldCheck,
  ClipboardList, PlusCircle, HelpCircle, Building2,
} from 'lucide-react'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { Avatar } from '../ui'
import { NotificationMenu } from '../../features/notifications/components/NotificationMenu'
import type { UserRole } from '../../lib/supabase'

interface NavItem { label: string; to: string; icon: React.ReactNode }

function getNavItems(role: UserRole): NavItem[] {
  const base: NavItem[] = []

  if (role === 'client') {
    base.push(
      { label: 'Mes plaintes',      to: '/client',        icon: <ClipboardList size={18} /> },
      { label: 'Nouvelle plainte',  to: '/client/new',    icon: <PlusCircle size={18} /> },
      { label: 'FAQ',               to: '/client/faq',    icon: <HelpCircle size={18} /> },
    )
  }

  if (role === 'agent') {
    base.push(
      { label: 'Tableau de bord',  to: '/agent',          icon: <LayoutDashboard size={18} /> },
      { label: 'Tickets',          to: '/agent/tickets',  icon: <Ticket size={18} /> },
    )
  }

  if (role === 'expert') {
    base.push(
      { label: 'Tableau de bord',  to: '/expert',           icon: <LayoutDashboard size={18} /> },
      { label: 'Tickets assignés', to: '/expert/tickets',   icon: <Ticket size={18} /> },
    )
  }

  if (role === 'admin') {
    base.push(
      { label: 'Tableau de bord',  to: '/admin',            icon: <LayoutDashboard size={18} /> },
      { label: 'Tickets',          to: '/admin/tickets',    icon: <Ticket size={18} /> },
      { label: 'Utilisateurs',     to: '/admin/users',      icon: <Users size={18} /> },
      { label: 'Paramètres',       to: '/admin/settings',   icon: <Settings size={18} /> },
    )
  }

  if (role === 'super_admin') {
    base.push(
      { label: 'Organisations',    to: '/super',            icon: <Building2 size={18} /> },
      { label: 'Tous les users',   to: '/super/users',      icon: <Users size={18} /> },
      { label: 'Feedbacks',        to: '/super/feedback',   icon: <ShieldCheck size={18} /> },
    )
  }

  return base
}

const ROLE_LABELS: Record<UserRole, string> = {
  client:      'Usager',
  agent:       'Agent',
  expert:      'Expert',
  admin:       'Administrateur',
  super_admin: 'Super Admin',
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const navItems = role ? getNavItems(role) : []

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-100 z-30',
        'flex flex-col transition-transform duration-300 ease-out',
        'lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>

        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <Ticket size={16} className="text-white" />
            </div>
            <span className="font-display text-xl text-slate-900">TickView</span>
          </div>
          <button onClick={onClose} className="lg:hidden btn-ghost p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length <= 2}
              onClick={() => window.innerWidth < 1024 && onClose()}
              className={({ isActive }) => clsx(isActive ? 'nav-item-active' : 'nav-item')}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <Avatar name={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-slate-500">{role ? ROLE_LABELS[role] : ''}</p>
            </div>
          </div>
          <NavLink
            to="/profile"
            onClick={() => window.innerWidth < 1024 && onClose()}
            className={({ isActive }) => clsx('btn-ghost w-full justify-start mt-2', isActive && 'bg-slate-100')}
          >
            <Settings size={16} />
            Mon Profil
          </NavLink>
          <button
            onClick={handleSignOut}
            className="btn-ghost w-full mt-1 justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile } = useAuth()

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-4 sticky top-0 z-10">
      <button onClick={onMenuClick} className="lg:hidden btn-ghost p-2 rounded-xl">
        <Menu size={20} />
      </button>
      <div className="flex-1" />
      <NotificationMenu />
      <Link to="/profile" className="flex items-center gap-2 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
        <Avatar name={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`} size="sm" />
        <span className="text-sm font-medium text-slate-700 hidden sm:block">
          {profile?.first_name}
        </span>
      </Link>
    </header>
  )
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
