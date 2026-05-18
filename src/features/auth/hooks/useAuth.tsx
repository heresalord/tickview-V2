import {
  createContext, useContext, useEffect, useRef, useState, useCallback,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabaseAuth, type Profile, type UserRole } from '../../../lib/supabase'

interface AuthState {
  session:  Session | null
  user:     User    | null
  profile:  Profile | null
  role:     UserRole | null
  loading:  boolean
}

interface AuthContextValue extends AuthState {
  signIn:         (email: string, password: string) => Promise<{ error: Error | null }>
  signUp:         (email: string, password: string, meta: Record<string, string>) => Promise<{ error: Error | null }>
  signOut:        () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const t = () => new Date().toISOString().slice(11, 23)

// ─── Profile fetch ────────────────────────────────────────────────────────────
// IMPORTANT: This must NEVER be called from inside an onAuthStateChange callback.
// Supabase v2 holds an internal async lock while firing auth events; calling any
// DB query from inside the callback tries to re-acquire that lock → deadlock →
// the query hangs forever. Always defer with setTimeout before calling this.
async function fetchProfileWithRetry(userId: string, maxRetries = 2): Promise<Profile | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabaseAuth
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error) {
        console.log(`[${t()}] fetchProfile OK role=${data?.role}`)
        return (data as Profile) ?? null
      }

      if (error.code === 'PGRST116') {
        console.warn(`[${t()}] fetchProfile: no profile row for`, userId)
        return null
      }

      console.warn(`[${t()}] fetchProfile attempt ${attempt + 1} failed:`, error.code, error.message)
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
    } catch (e) {
      console.error(`[${t()}] fetchProfile EXCEPTION attempt ${attempt + 1}`, e)
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
    }
  }
  return null
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null, user: null, profile: null, role: null, loading: true,
  })

  const initialized = useRef(false)

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabaseAuth.auth.getSession()
    if (!session?.user) return
    const profile = await fetchProfileWithRetry(session.user.id)
    if (profile) setState(s => ({ ...s, profile, role: profile.role }))
  }, [])

  useEffect(() => {
    console.log(`[${t()}] AuthProvider MOUNT`)
    initialized.current = false

    // Processes an auth event after being deferred out of the onAuthStateChange
    // callback to avoid the Supabase internal lock deadlock.
    const handleAuthEvent = async (event: string, session: Session | null) => {
      console.log(`[${t()}] handleAuthEvent EVENT=${event}`, session?.user?.email ?? 'no session')

      if (event === 'SIGNED_OUT' || !session?.user) {
        initialized.current = true
        setState({ session: null, user: null, profile: null, role: null, loading: false })
        return
      }

      // TOKEN_REFRESHED: session is still valid — just update the session token,
      // no need to re-fetch the profile from the DB.
      if (event === 'TOKEN_REFRESHED') {
        setState(s => s.profile ? { ...s, session } : s)
        return
      }

      // SIGNED_IN / INITIAL_SESSION: fetch the profile (safe to call here because
      // we're already outside the onAuthStateChange lock via setTimeout).
      console.log(`[${t()}] Fetching profile...`)
      const profile = await fetchProfileWithRetry(session.user.id)

      if (!profile) {
        console.warn(`[${t()}] No profile found for userId=${session.user.id}`)
        initialized.current = true
        setState({ session: null, user: null, profile: null, role: null, loading: false })
        supabaseAuth.auth.signOut().catch(() => {})
        return
      }

      console.log(`[${t()}] Auth resolved. role=${profile.role}`)
      initialized.current = true
      setState({ session, user: session.user, profile, role: profile.role, loading: false })
    }

    // Subscribe — but immediately defer ALL async work with setTimeout(0) to
    // escape the Supabase internal lock that is held during this callback.
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
      (event, session) => {
        // Do NOT await anything here. Schedule work for the next task queue tick.
        setTimeout(() => handleAuthEvent(event, session), 0)
      }
    )

    // Safety: if onAuthStateChange never fires (network completely down, etc.)
    const safety = setTimeout(() => {
      if (!initialized.current) {
        console.error(`[${t()}] SAFETY TIMEOUT — resolving as logged out`)
        initialized.current = true
        setState(s => ({ ...s, loading: false }))
      }
    }, 10_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(safety)
      initialized.current = false
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, meta: Record<string, string>) => {
    const { error } = await supabaseAuth.auth.signUp({ email, password, options: { data: meta } })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabaseAuth.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
