import {
  createContext, useContext, useEffect, useRef, useState, useCallback,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type Profile, type UserRole } from '../../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  session:  Session | null
  user:     User    | null
  profile:  Profile | null
  role:     UserRole | null
  loading:  boolean
}

interface AuthContextValue extends AuthState {
  signIn:  (email: string, password: string) => Promise<{ error: Error | null }>
  signUp:  (email: string, password: string, meta: { first_name: string; last_name: string }) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null, user: null, profile: null, role: null, loading: true,
  })

  // Tracks whether the initial getSession() bootstrap has completed,
  // so that onAuthStateChange doesn't race against it.
  const initialized = useRef(false)

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) console.error('fetchProfile error:', error)
      return (data as Profile | null) ?? null
    } catch (e) {
      console.error('fetchProfile exception:', e)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!state.user) return
    const profile = await fetchProfile(state.user.id)
    setState(s => ({ ...s, profile, role: profile?.role ?? null }))
  }, [state.user, fetchProfile])

  useEffect(() => {
    let cancelled = false

    // ── Step 1: bootstrap from stored session ──────────────────────────────
    const bootstrap = async () => {
      try {
        const res = await supabase.auth.getSession()
        if (cancelled) return

        const session = res.data?.session ?? null

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (cancelled) return
          setState({
            session,
            user: session.user,
            profile,
            role: profile?.role ?? null,
            loading: false,
          })
        } else {
          setState({ session: null, user: null, profile: null, role: null, loading: false })
        }
      } catch (err) {
        console.error('getSession error:', err)
        if (!cancelled) {
          setState({ session: null, user: null, profile: null, role: null, loading: false })
        }
      } finally {
        if (!cancelled) initialized.current = true
      }
    }

    bootstrap()

    // ── Step 2: listen for subsequent auth changes ─────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip events that arrive before or during bootstrap to avoid the race.
      // Once initialized, process all events normally.
      if (!initialized.current) return

      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (cancelled) return
        setState({
          session,
          user: session.user,
          profile,
          role: profile?.role ?? null,
          loading: false,
        })
      } else {
        if (!cancelled) {
          setState({ session: null, user: null, profile: null, role: null, loading: false })
        }
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // ── Auth actions ───────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUp = async (
    email: string,
    password: string,
    meta: { first_name: string; last_name: string },
  ) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: meta },
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
