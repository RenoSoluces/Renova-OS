import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/**
 * Type du lien d'authentification par lequel l'utilisateur arrive (« invite », « recovery »…).
 * Lu avant la création du client : supabase-js efface ensuite le fragment de l'URL.
 */
export const typeLienAuth: string | null = (() => {
  try {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const requete = new URLSearchParams(window.location.search)
    return fragment.get('type') || requete.get('type')
  } catch {
    return null
  }
})()

/** Paramètres de l'URL d'arrivée, lus avant que l'app ne réécrive l'adresse (/app/…). */
export const parametresArrivee: URLSearchParams = (() => {
  try { return new URLSearchParams(window.location.search) } catch { return new URLSearchParams() }
})()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
