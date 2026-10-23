import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
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
  profileError: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, nomComplet: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const requestId = useRef(0)

  const loadProfile = useCallback(async (userId: string) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setProfileError(null)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,nom_complet,couleur,role,telephone,created_at,objectif_mensuel')
        .eq('id', userId)
        .maybeSingle()

      if (currentRequest !== requestId.current) return
      if (error) throw error
      if (!data) {
        setProfile(null)
        setProfileError("Aucun profil Renova OS n'est associé à ce compte. Contactez l'administrateur.")
        return
      }
      setProfile(data as Profile)
    } catch (error) {
      if (currentRequest !== requestId.current) return
      console.error('[RENOVA OS] Chargement du profil impossible:', error)
      setProfile(null)
      setProfileError("Impossible de charger votre profil. Vérifiez votre connexion puis réessayez.")
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const userId = session?.user.id
    if (userId) await loadProfile(userId)
  }, [session?.user.id, loadProfile])

  useEffect(() => {
    let active = true
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (nextSession) {
        // Defer database work until after the auth callback returns.
        Promise.resolve().then(() => {
          if (active) void loadProfile(nextSession.user.id)
        })
      } else {
        requestId.current += 1
        setProfile(null)
        setProfileError(null)
        setLoading(false)
      }
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setSession(null)
        setProfile(null)
        setProfileError('Impossible de vérifier la session. Rechargez la page.')
        setLoading(false)
        return
      }
      setSession(data.session)
      if (data.session) void loadProfile(data.session.user.id)
      else setLoading(false)
    }).catch((error: unknown) => {
      if (!active) return
      console.error('[RENOVA OS] Vérification de session impossible:', error)
      setProfileError('Impossible de vérifier la session. Rechargez la page.')
      setLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
      requestId.current += 1
    }
  }, [loadProfile])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return { error: error ? traduireErreur(error.message) : null }
  }

  async function signUp(email: string, password: string, nomComplet: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nom_complet: nomComplet.trim() } },
    })
    if (error) return { error: traduireErreur(error.message) }
    if (data.session) {
      setSession(data.session)
      await loadProfile(data.session.user.id)
    }
    return { error: null }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    requestId.current += 1
    setSession(null)
    setProfile(null)
    setProfileError(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, profileError, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

function traduireErreur(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.'
  if (/user already registered/i.test(msg)) return 'Un compte existe déjà avec cet email.'
  if (/password.*at least/i.test(msg)) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (/email.*invalid/i.test(msg)) return 'Adresse email invalide.'
  if (/email not confirmed/i.test(msg)) return 'Confirmez votre adresse email avant de vous connecter.'
  return msg
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>')
  return ctx
}
