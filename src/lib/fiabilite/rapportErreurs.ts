/** Remontée des erreurs de l'application vers le journal (consultable dans « Santé du système »). */
import { supabase } from '../supabase'

export interface ErreurNormalisee { message: string; pile: string; signature: string }

// Bruit sans conséquence pour l'utilisateur : extensions de navigateur, annulations, coupures réseau.
const BRUIT = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /AbortError|The user aborted a request|signal is aborted/i,
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /Non-Error promise rejection captured/i,
  /Load failed$|Failed to fetch$|NetworkError when attempting to fetch/i,
]

export function normaliserErreur(e: unknown): ErreurNormalisee {
  let message = '', pile = ''
  if (e instanceof Error) { message = `${e.name && e.name !== 'Error' ? `${e.name}: ` : ''}${e.message}`; pile = e.stack || '' }
  else if (typeof e === 'string') message = e
  else if (e && typeof e === 'object' && 'message' in e) message = String((e as { message: unknown }).message)
  else if (e != null) { try { message = JSON.stringify(e) ?? '' } catch { message = String(e) } }
  message = message.trim().slice(0, 500) || 'Erreur inconnue'
  // Signature stable : on retire nombres, identifiants et hachages de fichiers pour regrouper les répétitions.
  const premiereLigne = pile.split('\n').find(l => /at |@/.test(l)) || ''
  const signature = `${message}|${premiereLigne}`.replace(/[0-9a-f]{8,}|\d+/gi, '#').slice(0, 300)
  return { message, pile: pile.slice(0, 4000), signature }
}

export function estDuBruit(n: ErreurNormalisee): boolean {
  return BRUIT.some(r => r.test(n.message) || r.test(n.pile.split('\n')[1] || ''))
}

/** Après un déploiement, un ancien onglet peut demander un fichier qui n'existe plus : on recharge une fois. */
export function estChunkPerime(n: ErreurNormalisee): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(n.message)
}

const dejaVues = new Map<string, number>()
let envoyees = 0
const MAX_PAR_SESSION = 20

export async function signalerErreur(e: unknown, contexte: Record<string, string | undefined> = {}): Promise<void> {
  const n = normaliserErreur(e)
  if (estDuBruit(n)) return
  if (estChunkPerime(n)) {
    try {
      if (typeof window !== 'undefined' && !sessionStorage.getItem('renova:rechargement-chunk')) { sessionStorage.setItem('renova:rechargement-chunk', '1'); window.location.reload(); return }
    } catch { /* stockage indisponible */ }
  }
  const vu = dejaVues.get(n.signature) || 0
  dejaVues.set(n.signature, vu + 1)
  if (vu > 0 || envoyees >= MAX_PAR_SESSION) return
  envoyees++
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  const win = typeof window !== 'undefined' ? window : undefined
  const details: Record<string, string> = {
    pile: n.pile,
    page: win ? win.location.pathname + win.location.hash : '',
    navigateur: nav?.userAgent || '',
    ecran: win ? `${win.innerWidth}x${win.innerHeight}` : '',
    en_ligne: String(nav?.onLine ?? ''),
  }
  for (const [k, v] of Object.entries(contexte)) if (v !== undefined) details[k] = v
  try {
    await supabase.rpc('signaler_erreur_client', { p_message: n.message, p_details: details })
  } catch { /* le rapport d'erreur ne doit jamais provoquer d'erreur */ }
}

let installe = false
export function installerRapportErreurs(): void {
  if (installe || typeof window === 'undefined') return
  installe = true
  window.addEventListener('error', ev => { void signalerErreur(ev.error ?? ev.message, { source: 'window.onerror', fichier: ev.filename ? `${ev.filename}:${ev.lineno}:${ev.colno}` : undefined }) })
  window.addEventListener('unhandledrejection', ev => { void signalerErreur(ev.reason, { source: 'promesse non gérée' }) })
}

/** Réinitialisation pour les tests. */
export function _reinitialiser() { dejaVues.clear(); envoyees = 0 }
