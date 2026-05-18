import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Ticket } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useNotifications } from '../../features/notifications/hooks/useNotifications'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { clsx } from 'clsx'

function getRolePath(role: string | null, ticketId: string): string {
  if (role === 'client') return `/client/tickets/${ticketId}`
  if (role === 'expert') return `/expert/tickets/${ticketId}`
  if (role === 'admin')  return `/admin/tickets/${ticketId}`
  return `/agent/tickets/${ticketId}`
}

export function NotificationBell() {
  const { role } = useAuth()
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleNotifClick = async (notif: { id: string; ticket_id: string | null; is_read: boolean }) => {
    if (!notif.is_read) await markOneRead(notif.id)
    if (notif.ticket_id) {
      navigate(getRolePath(role, notif.ticket_id))
    }
    setOpen(false)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative btn-ghost p-2 rounded-xl"
        aria-label="Notifications"
      >
        <Bell size={19} className={unreadCount > 0 ? 'text-brand-600' : 'text-slate-500'} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Bell size={14} className="text-brand-600" />
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600 transition-colors"
              >
                <CheckCheck size={13} /> Tout marquer lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-400">
                <Bell size={28} className="mb-2 opacity-30" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={clsx(
                    'w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors',
                    !n.is_read && 'bg-brand-50/40'
                  )}
                >
                  <div className={clsx(
                    'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    !n.is_read ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'
                  )}>
                    <Ticket size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm leading-snug', !n.is_read ? 'font-semibold text-slate-900' : 'text-slate-700')}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{n.body}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
