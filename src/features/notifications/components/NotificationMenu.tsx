import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Ticket as TicketIcon } from 'lucide-react'
import { supabase, type Notification } from '../../../lib/supabase'
import { useAuth } from '../../auth/hooks/useAuth'
import { clsx } from 'clsx'

export function NotificationMenu() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profile) return

    const loadNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('channel', 'in_app')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) setNotifications(data as Notification[])
    }

    loadNotifications()

    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        const newNotif = payload.new as Notification
        if (newNotif.channel === 'in_app') {
          setNotifications(prev => [newNotif, ...prev])
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRead = async (notif: Notification) => {
    // Mark as read locally
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    
    // Mark as read in DB
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notif.id)

    setOpen(false)

    // Navigate to ticket if available
    if (notif.ticket_id) {
      navigate(`/${profile?.role}/tickets/${notif.ticket_id}`)
    }
  }

  const handleMarkAllRead = async () => {
    const ids = notifications.map(n => n.id)
    setNotifications([])
    if (ids.length > 0) {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', ids)
    }
    setOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setOpen(!open)}
        className={clsx(
          "btn-ghost p-2 rounded-xl relative transition-colors",
          open && "bg-slate-100"
        )}
      >
        <Bell size={20} className={notifications.length > 0 ? "text-brand-600" : "text-slate-600"} />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 border-2 border-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-slide-up origin-top-right">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {notifications.length > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Check size={14} /> Tout lire
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                  <Bell size={20} className="text-slate-300" />
                </div>
                <p className="text-sm text-slate-500">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleRead(n)}
                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex gap-3 group"
                  >
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-brand-50 flex-shrink-0 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                      <TicketIcon size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 line-clamp-1">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-2 uppercase tracking-wide">
                        {new Date(n.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
