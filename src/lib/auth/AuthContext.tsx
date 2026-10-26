import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, typeLienAuth, parametresArrivee } from '../supabase'

export interface Profile {
  id: string
  email: string
  nom_complet: string
  couleur: string
  role: string
  telephone?: string | null
  created_at: string
  objectif_mensuel?: number | null
  organisation_id?: string | null
  manager_id?: string | null
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
  /** Vrai quand l'utilisateur arrive d'une invitation ou d'un lien « mot de passe oublié ». */
  doitDefinirMotDePasse: boolean
  definirMotDePasse: (motDePasse: string) => Promise<{ error: string | null }>
  envoyerLienMotDePasse: (email: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const requestId = useRef(0)
  const [lienMotDePasse, setLienMotDePasse] = useState(typeLienAuth === 'invite' || typeLienAuth === 'recovery')

  const loadProfile = useCallback(async (userId: string) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setProfileError(null)
    try {
      // Keep the app usable against databases that have not yet received
      // the multi-organisation migration. The fallback is temporary compatibility:
      // manager/team features remain unavailable until the migration is applied.
      let { data, error } = await supabase
        .from('profiles')
        .select('id,email,nom_complet,couleur,role,telephone,created_at,objectif_mensuel,organisation_id,manager_id')
        .eq('id', userId)
        .maybeSingle()

      if (error && /organisation_id|manager_id|column .* does not exist|schema cache/i.test(error.message)) {
        const fallback = await supabase
          .from('profiles')
          .select('id,email,nom_complet,couleur,role,telephone,created_at,objectif_mensuel')
          .eq('id', userId)
          .maybeSingle()
        data = fallback.data as (typeof data)
        error = fallback.error
      }

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
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY') setLienMotDePasse(true)
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

    // Lien d'invitation Renova OS : ?token_hash=…&type=invite|magiclink|recovery → on valide le jeton.
    const valider = async () => {
      try {
        const params = parametresArrivee
        const tokenHash = params.get('token_hash')
        const type = params.get('type') as 'invite' | 'magiclink' | 'recovery' | 'signup' | 'email' | null
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
          if (error) setProfileError('Ce lien d’activation a expiré ou a déjà été utilisé. Demandez une nouvelle invitation.')
          if (type === 'invite' || type === 'recovery') setLienMotDePasse(true)
          params.delete('token_hash')
        }
      } catch (error) {
        console.error('[RENOVA OS] Validation du lien impossible:', error)
      }
    }

    void valider().then(() => supabase.auth.getSession()).then(({ data, error }) => {
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

  async function definirMotDePasse(motDePasse: string) {
    const { error } = await supabase.auth.updateUser({ password: motDePasse, data: { mot_de_passe_a_definir: false } })
    if (error) return { error: traduireErreur(error.message) }
    setLienMotDePasse(false)
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    return { error: null }
  }

  async function envoyerLienMotDePasse(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/` })
    return { error: error ? traduireErreur(error.message) : null }
  }

  const doitDefinirMotDePasse = !!session && (lienMotDePasse || session.user.user_metadata?.mot_de_passe_a_definir === true)

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
    <AuthContext.Provider value={{ session, profile, loading, profileError, signIn, signUp, signOut, refreshProfile, doitDefinirMotDePasse, definirMotDePasse, envoyerLienMotDePasse }}>
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
  if (/should be different/i.test(msg)) return 'Choisissez un mot de passe différent de l’ancien.'
  if (/rate limit|too many/i.test(msg)) return 'Trop de demandes : patientez quelques minutes avant de réessayer.'
  return msg
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>')
  return ctx
}
