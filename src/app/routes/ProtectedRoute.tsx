import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { PageLoader } from '../../components/ui'
import type { UserRole } from '../../lib/supabase'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export function RoleRoute({
  children,
  roles,
}: {
  children: React.ReactNode
  roles: UserRole[]
}) {
  const { role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!role || !roles.includes(role)) {
    const HOME: Record<UserRole, string> = {
      client:      '/client',
      agent:       '/agent',
      expert:      '/expert',
      admin:       '/admin',
      super_admin: '/super',
    }
    const dest = role ? HOME[role] : '/login'
    return <Navigate to={dest} state={{ from: location }} replace />
  }

  return <>{children}</>
}
