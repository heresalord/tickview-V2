// Placeholder pages — replaced progressively across Day 2–4
// ExpertDashboard is now real → see features/dashboard/pages/ExpertDashboard.tsx

import { LayoutDashboard, Building2 } from 'lucide-react'


export function SuperAdminDashboard() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Super Administrateur</h1>
        <p className="page-subtitle">Gestion multi-organisations — Jour 3</p>
      </div>
      <div className="card flex flex-col items-center py-16 text-slate-400 gap-3">
        <Building2 size={40} className="opacity-30" />
        <p className="text-sm">La gestion des organisations arrive en Jour 3.</p>
      </div>
    </div>
  )
}
