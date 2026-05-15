import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '../features/auth/hooks/useAuth'
import { AppShell } from '../components/layout/AppShell'
import { ProtectedRoute, RoleRoute } from './routes/ProtectedRoute'
import { PageLoader } from '../components/ui'

// Auth
import { LoginPage }          from '../features/auth/pages/LoginPage'
import { RegisterPage }       from '../features/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage }  from '../features/auth/pages/ResetPasswordPage'

// Client
import { ClientDashboard } from '../features/dashboard/pages/ClientDashboard'
import { NewTicketPage }   from '../features/tickets/pages/NewTicketPage'
import { TicketDetailPage } from '../features/tickets/pages/TicketDetailPage'

// Agent
import { AgentDashboard } from '../features/dashboard/pages/AgentDashboard'

// Expert
import { ExpertDashboard } from '../features/dashboard/pages/ExpertDashboard'

// Admin
import { UserManagementPage } from '../features/users/pages/UserManagementPage'
import { AdminDashboard } from '../features/dashboard/pages/AdminDashboard'
import { SettingsPage } from '../features/settings/pages/SettingsPage'

// Placeholders (Day 3–4)
import {
  SuperAdminDashboard,
} from '../components/feedback/Placeholders'

import type { UserRole } from '../lib/supabase'

import { LandingPage } from '../features/landing/pages/LandingPage'
import { ProfilePage } from '../features/users/pages/ProfilePage'

const ROLE_HOME: Record<UserRole, string> = {
  client:      '/client',
  agent:       '/agent',
  expert:      '/expert',
  admin:       '/admin',
  super_admin: '/super',
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
            },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/"                element={<LandingPage />} />

          {/* Protected shell */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            {/* ── Client ── */}
            <Route path="/client"
              element={<RoleRoute roles={['client']}><ClientDashboard /></RoleRoute>}
            />
            <Route path="/client/new"
              element={<RoleRoute roles={['client']}><NewTicketPage /></RoleRoute>}
            />
            <Route path="/client/tickets/:id"
              element={<RoleRoute roles={['client']}><TicketDetailPage /></RoleRoute>}
            />
            <Route path="/client/faq"
              element={<RoleRoute roles={['client']}><div className="card"><p className="text-slate-500">FAQ — Jour 3</p></div></RoleRoute>}
            />

            {/* ── Agent ── */}
            <Route path="/agent"
              element={<RoleRoute roles={['agent']}><AgentDashboard /></RoleRoute>}
            />
            <Route path="/agent/tickets"
              element={<RoleRoute roles={['agent']}><AgentDashboard /></RoleRoute>}
            />
            <Route path="/agent/tickets/:id"
              element={<RoleRoute roles={['agent', 'admin']}><TicketDetailPage /></RoleRoute>}
            />

            {/* ── Expert ── */}
            <Route path="/expert"
              element={<RoleRoute roles={['expert']}><ExpertDashboard /></RoleRoute>}
            />
            <Route path="/expert/tickets"
              element={<RoleRoute roles={['expert']}><ExpertDashboard /></RoleRoute>}
            />
            <Route path="/expert/tickets/:id"
              element={<RoleRoute roles={['expert', 'admin']}><TicketDetailPage /></RoleRoute>}
            />

            {/* ── Admin ── */}
            <Route path="/admin"
              element={<RoleRoute roles={['admin']}><AdminDashboard /></RoleRoute>}
            />
            <Route path="/admin/tickets"
              element={<RoleRoute roles={['admin']}><AgentDashboard /></RoleRoute>}
            />
            <Route path="/admin/tickets/:id"
              element={<RoleRoute roles={['admin']}><TicketDetailPage /></RoleRoute>}
            />
            <Route path="/admin/users"
              element={<RoleRoute roles={['admin']}><UserManagementPage /></RoleRoute>}
            />
            <Route path="/admin/settings"
              element={<RoleRoute roles={['admin']}><SettingsPage /></RoleRoute>}
            />

            {/* ── Super Admin ── */}
            <Route path="/super"
              element={<RoleRoute roles={['super_admin']}><SuperAdminDashboard /></RoleRoute>}
            />
            <Route path="/super/users"
              element={<RoleRoute roles={['super_admin']}><div className="card"><p className="text-slate-500">Tous les utilisateurs — Jour 3</p></div></RoleRoute>}
            />

            {/* ── Shared ── */}
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
