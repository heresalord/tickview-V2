import { useEffect, useState, useMemo, useRef } from 'react'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Download, TicketIcon, Clock, Star, AlertOctagon, CheckCircle2, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react'
import { format, subDays, isAfter, differenceInHours } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase, type TicketFull } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'
import { Spinner } from '../../../components/ui'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

// Colors for charts
const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']
const STATUS_COLORS: Record<string, string> = {
  ouvert: '#64748b', en_cours: '#0ea5e9', en_attente: '#f59e0b',
  reassigne: '#8b5cf6', resolu: '#10b981', cloture: '#334155'
}

export function AdminDashboard() {
  const { profile } = useAuth()
  const [tickets, setTickets] = useState<TicketFull[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'7d' | '1m' | '3m' | '1y' | 'all'>('1m')
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    async function loadData() {
      if (!profile?.organization_id) return
      const { data } = await supabase
        .from('v_tickets_full')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: true })
      setTickets((data ?? []) as TicketFull[])
      setLoading(false)
    }
    loadData()
  }, [profile])

  const filteredTickets = useMemo(() => {
    if (timeframe === 'all') return tickets
    const now = new Date()
    let days = 30
    if (timeframe === '7d') days = 7
    if (timeframe === '1m') days = 30
    if (timeframe === '3m') days = 90
    if (timeframe === '1y') days = 365
    
    const cutoff = subDays(now, days)
    return tickets.filter(t => isAfter(new Date(t.created_at), cutoff))
  }, [tickets, timeframe])

  // --- Calculations ---
  const kpis = useMemo(() => {
    let openCount = 0
    let resolvedCount = 0
    let slaBreached = 0
    let totalScore = 0
    let scoreCount = 0
    let totalResolutionHours = 0
    let resolvedWithTime = 0

    filteredTickets.forEach(t => {
      if (!['resolu', 'cloture'].includes(t.status)) openCount++
      if (['resolu', 'cloture'].includes(t.status)) resolvedCount++
      if (t.sla_breached) slaBreached++
      
      if (t.satisfaction_score) {
        totalScore += t.satisfaction_score
        scoreCount++
      }

      if (t.resolved_at) {
        const hours = differenceInHours(new Date(t.resolved_at), new Date(t.created_at))
        totalResolutionHours += hours
        resolvedWithTime++
      }
    })

    return {
      total: filteredTickets.length,
      open: openCount,
      resolved: resolvedCount,
      breached: slaBreached,
      csat: scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : '-',
      avgResolution: resolvedWithTime > 0 ? Math.round(totalResolutionHours / resolvedWithTime) : '-'
    }
  }, [filteredTickets])

  const volumeData = useMemo(() => {
    if (filteredTickets.length === 0) return []
    const map = new Map<string, number>()
    const now = new Date()

    if (timeframe === '1y' || timeframe === 'all') {
      const months = timeframe === '1y' ? 12 : 24
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        map.set(format(d, 'MMM yy', { locale: fr }), 0)
      }
      filteredTickets.forEach(t => {
        const key = format(new Date(t.created_at), 'MMM yy', { locale: fr })
        if (map.has(key)) map.set(key, map.get(key)! + 1)
      })
    } else {
      let days = 30
      if (timeframe === '7d') days = 7
      if (timeframe === '1m') days = 30
      if (timeframe === '3m') days = 90
      
      for (let i = days - 1; i >= 0; i--) {
        const d = subDays(now, i)
        map.set(format(d, 'dd MMM', { locale: fr }), 0)
      }
      filteredTickets.forEach(t => {
        const key = format(new Date(t.created_at), 'dd MMM', { locale: fr })
        if (map.has(key)) map.set(key, map.get(key)! + 1)
      })
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, tickets: count }))
  }, [filteredTickets, timeframe])

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredTickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredTickets])

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { basse: 0, normale: 0, haute: 0, urgente: 0 }
    filteredTickets.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++ })
    return Object.entries(counts).map(([name, value]) => ({ name, count: value }))
  }, [filteredTickets])

  const exportCSV = () => {
    const headers = ['ID', 'Référence', 'Titre', 'Statut', 'Priorité', 'Créé le', 'Client', 'SLA Dépassé']
    const rows = filteredTickets.map(t => [
      t.id, t.reference, `"${t.title.replace(/"/g, '""')}"`,
      t.status, t.priority, t.created_at, `"${t.client_name}"`,
      t.sla_breached ? 'Oui' : 'Non'
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `export_tickets_${format(new Date(), 'yyyyMMdd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setExportOpen(false)
  }

  const exportPDF = () => {
    // Build a simple printable HTML page and trigger the browser's print dialog
    const rows = filteredTickets.map(t =>
      `<tr>
        <td>${t.reference}</td>
        <td>${t.title}</td>
        <td>${t.client_name}</td>
        <td>${t.status}</td>
        <td>${t.priority}</td>
        <td>${t.sla_breached ? 'Oui' : 'Non'}</td>
        <td>${format(new Date(t.created_at), 'dd/MM/yyyy', { locale: fr })}</td>
      </tr>`
    ).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Export Tickets</title>
      <style>body{font-family:sans-serif;font-size:12px;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f1f5f9;font-weight:600}tr:nth-child(even){background:#f8fafc}</style>
      </head><body><h2>Export Tickets TickView — ${format(new Date(), 'dd/MM/yyyy')}</h2><table>
      <thead><tr><th>Référence</th><th>Titre</th><th>Client</th><th>Statut</th><th>Priorité</th><th>SLA Dépassé</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.print() }
    setExportOpen(false)
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 leading-snug">
            {getGreeting()},{' '}
            <span className="text-brand-600">{profile?.first_name}</span> 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">Voici l'analyse des performances de votre support client.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeframe} 
            onChange={e => setTimeframe(e.target.value as any)}
            className="field-select text-sm font-medium bg-white"
          >
            <option value="7d">7 derniers jours</option>
            <option value="1m">30 derniers jours</option>
            <option value="3m">3 derniers mois</option>
            <option value="1y">12 derniers mois</option>
            <option value="all">Historique complet</option>
          </select>
          <div className="relative" ref={exportRef}>
            <button onClick={() => setExportOpen(o => !o)} className="btn-secondary">
              <Download size={15} /> Exporter <ChevronDown size={14} className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden animate-fade-in">
                <button onClick={exportCSV} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <FileSpreadsheet size={16} className="text-emerald-600" /> Exporter CSV
                </button>
                <button onClick={exportPDF} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100">
                  <FileText size={16} className="text-red-500" /> Exporter PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4 space-y-1">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TicketIcon size={16} /> <h3 className="text-xs font-medium uppercase tracking-wider">Total Tickets</h3>
          </div>
          <p className="text-3xl font-semibold text-slate-800">{kpis.total}</p>
        </div>
        <div className="card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sky-600 mb-2">
            <AlertOctagon size={16} /> <h3 className="text-xs font-medium uppercase tracking-wider">Ouverts</h3>
          </div>
          <p className="text-3xl font-semibold text-slate-800">{kpis.open}</p>
        </div>
        <div className="card p-4 space-y-1">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <CheckCircle2 size={16} /> <h3 className="text-xs font-medium uppercase tracking-wider">Résolus</h3>
          </div>
          <p className="text-3xl font-semibold text-slate-800">{kpis.resolved}</p>
        </div>
        <div className="card p-4 space-y-1">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Clock size={16} /> <h3 className="text-xs font-medium uppercase tracking-wider">Tps Résolution</h3>
          </div>
          <p className="text-3xl font-semibold text-slate-800">{kpis.avgResolution} <span className="text-base font-normal text-slate-400">h</span></p>
        </div>
        <div className="card p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <Star size={16} /> <h3 className="text-xs font-medium uppercase tracking-wider">CSAT</h3>
          </div>
          <p className="text-3xl font-semibold text-slate-800">{kpis.csat} <span className="text-base font-normal text-slate-400">/ 5</span></p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Area Chart */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 mb-6">Volume de tickets (30 derniers jours)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 500 }}
                />
                <Area type="monotone" dataKey="tickets" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorTickets)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Répartition par statut</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Custom Legend */}
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {statusData.map(entry => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] || '#ccc' }} />
                <span className="capitalize">{entry.name.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Bar Chart */}
        <div className="card lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-800 mb-6">Répartition par priorité</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', textTransform: 'capitalize' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => {
                    const fills: Record<string, string> = { basse: '#94a3b8', normale: '#3b82f6', haute: '#f59e0b', urgente: '#ef4444' }
                    return <Cell key={`cell-${index}`} fill={fills[entry.name] || COLORS[0]} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
