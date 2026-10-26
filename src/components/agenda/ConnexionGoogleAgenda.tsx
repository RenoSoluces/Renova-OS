import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Link2, Unlink, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase, parametresArrivee } from '../../lib/supabase'

type Etat = { connecte: boolean; google_email: string | null; derniere_synchro: string | null; derniere_erreur: string | null }

/** Délai minimal entre deux synchronisations automatiques à l'ouverture de l'agenda. */
const DELAI_AUTO_MS = 10 * 60 * 1000
const retourGoogle = parametresArrivee.get('google')
const detailGoogle = parametresArrivee.get('detail')

async function appeler(action: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('google-agenda', { body: { action, ...extra } })
  if (!error) return { data, erreur: null as string | null }
  const contexte = (error as { context?: Response }).context
  const detail = contexte && typeof contexte.json === 'function' ? await contexte.json().catch(() => null) : null
  return { data: null, erreur: (detail?.erreur || detail?.error || error.message) as string }
}

/** Connexion et synchronisation dans les deux sens avec Google Agenda. */
export function ConnexionGoogleAgenda({ onSynchronise }: { onSynchronise?: () => void }) {
  const [etat, setEtat] = useState<Etat | null>(null)
  const [action, setAction] = useState<'' | 'connexion' | 'synchro' | 'deconnexion'>('')
  const [message, setMessage] = useState(
    retourGoogle === 'ok' ? 'Google Agenda est connecté : vos rendez-vous sont synchronisés.'
      : retourGoogle === 'refuse' ? 'Connexion annulée : l’accès à Google Agenda n’a pas été autorisé.'
      : retourGoogle === 'erreur' ? `La connexion à Google Agenda a échoué.${detailGoogle ? ` Détail : ${detailGoogle}` : ' Réessayez ; si le problème persiste, vérifiez que votre adresse Gmail figure parmi les utilisateurs autorisés.'}`
      : '')
  const autoFaite = useRef(false)
  // Rappel du parent conservé dans une référence : il change à chaque rendu de la page.
  const rappel = useRef(onSynchronise)
  rappel.current = onSynchronise

  const lireEtat = useCallback(async () => {
    const { data } = await supabase.rpc('etat_google_agenda')
    const ligne = (Array.isArray(data) ? data[0] : data) as Etat | undefined
    setEtat(ligne ?? { connecte: false, google_email: null, derniere_synchro: null, derniere_erreur: null })
    return ligne
  }, [])

  const synchroniser = useCallback(async (silencieux = false) => {
    setAction('synchro')
    const { data, erreur } = await appeler('synchroniser')
    setAction('')
    if (erreur) setMessage(erreur)
    else if (!silencieux) setMessage(`Synchronisé : ${data?.envoyes ?? 0} RDV envoyés vers Google, ${data?.importes ?? 0} nouveaux événements Google importés.`)
    await lireEtat()
    rappel.current?.()
  }, [lireEtat])

  useEffect(() => {
    void lireEtat().then(ligne => {
      if (autoFaite.current || !ligne?.connecte) return
      autoFaite.current = true
      const ancienne = !ligne.derniere_synchro || Date.now() - new Date(ligne.derniere_synchro).getTime() > DELAI_AUTO_MS
      if (ancienne) void synchroniser(true)
      else if (retourGoogle === 'ok') rappel.current?.()
    })
  }, [lireEtat, synchroniser])

  async function connecter() {
    setAction('connexion'); setMessage('')
    const { data, erreur } = await appeler('demarrer', { retour: `${window.location.origin}/app/planning` })
    if (erreur || !data?.url) { setAction(''); setMessage(erreur || 'Connexion impossible pour le moment.'); return }
    window.location.href = data.url
  }

  async function deconnecter() {
    if (!confirm('Déconnecter Google Agenda ? Les événements Google importés disparaîtront de Renova OS, et les RDV Renova OS ne seront plus envoyés vers Google.')) return
    setAction('deconnexion')
    const { erreur } = await appeler('deconnecter')
    setAction('')
    setMessage(erreur || 'Google Agenda est déconnecté.')
    await lireEtat()
    rappel.current?.()
  }

  if (!etat) return null
  return (
    <div className="card google-agenda">
      <div className="google-agenda-ligne">
        <span className="google-agenda-logo" aria-hidden>31</span>
        <div className="google-agenda-texte">
          <strong>Google Agenda</strong>
          {etat.connecte
            ? <small>
                <CheckCircle2 size={13} /> Connecté{etat.google_email ? ` à ${etat.google_email}` : ''}
                {etat.derniere_synchro ? ` · dernière synchronisation ${new Date(etat.derniere_synchro).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
              </small>
            : <small>Vos RDV Renova OS apparaissent dans Google Agenda, et vos événements Google (rendez-vous perso, congés…) s’affichent ici pour éviter les doublons de créneaux.</small>}
        </div>
        <div className="google-agenda-actions">
          {etat.connecte ? <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void synchroniser()} disabled={!!action}>
              {action === 'synchro' ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Synchroniser
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void deconnecter()} disabled={!!action}><Unlink size={14} /> Déconnecter</button>
          </> : (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void connecter()} disabled={!!action}>
              {action === 'connexion' ? <Loader2 size={14} className="spin" /> : <Link2 size={14} />} Connecter mon Google Agenda
            </button>
          )}
        </div>
      </div>
      {(message || etat.derniere_erreur) && (
        <p className={`google-agenda-message ${etat.derniere_erreur && !message ? 'erreur' : ''}`}>
          {etat.derniere_erreur && !message && <AlertTriangle size={13} />} {message || etat.derniere_erreur}
        </p>
      )}
    </div>
  )
}
