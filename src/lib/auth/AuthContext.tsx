import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'

export interface Profile {
  id: string
  email: string
  nom_complet: string
  couleur: string
  role: string
  telephone?: string | null
  created_at: string
  objectif_mensuel?: number | null
}

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, nomComplet: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data as Profile | null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else setProfile(null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? traduireErreur(error.message) : null }
  }

  async function signUp(email: string, password: string, nomComplet: string) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nom_complet: nomComplet } },
    })
    if (error) return { error: traduireErreur(error.message) }
    // Si la confirmation email est désactivée, la session est déjà active.
    if (data.session) {
      setSession(data.session)
      await loadProfile(data.session.user.id)
    }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

function traduireErreur(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.'
  if (/user already registered/i.test(msg)) return 'Un compte existe déjà avec cet email.'
  if (/password.*at least/i.test(msg)) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (/email.*invalid/i.test(msg)) return 'Adresse email invalide.'
  return msg
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>')
  return ctx
}
