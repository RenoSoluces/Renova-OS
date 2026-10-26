import { useState } from 'react'
import { CalendarPlus, Copy, Check, RefreshCw, ChevronDown, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/**
 * Abonnement de l'agenda personnel à Google Agenda, Outlook ou Apple Calendrier (flux ICS).
 * Le lien contient un jeton secret propre à l'utilisateur ; il peut être réinitialisé à tout moment.
 */
export function AbonnementAgenda() {
  const [ouvert, setOuvert] = useState(false)
  const [jeton, setJeton] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [copie, setCopie] = useState(false)

  const base = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const https = jeton ? `${base}/functions/v1/agenda-ics?jeton=${jeton}` : ''
  const webcal = https.replace(/^https:/, 'webcal:')

  async function obtenir(regenerer = false) {
    if (regenerer && !confirm('Réinitialiser le lien ? Les agendas déjà abonnés cesseront de se mettre à jour : il faudra les abonner à nouveau.')) return
    setChargement(true); setErreur('')
    const { data, error } = await supabase.rpc('obtenir_jeton_agenda', { p_regenerer: regenerer })
    setChargement(false)
    if (error || !data) { setErreur('Lien d’agenda indisponible pour le moment. Réessayez.'); return }
    setJeton(String(data)); setCopie(false)
  }

  async function basculer() {
    const suivant = !ouvert
    setOuvert(suivant)
    if (suivant && !jeton) await obtenir()
  }

  return (
    <div className="card abo-agenda">
      <button type="button" className="abo-agenda-tete" onClick={() => void basculer()} aria-expanded={ouvert}>
        <span className="abo-agenda-icone"><CalendarPlus size={18} /></span>
        <span className="abo-agenda-texte">
          <strong>Voir mes rendez-vous dans mon agenda de téléphone</strong>
          <small>Google Agenda, Outlook ou Apple Calendrier : vos RDV Renova OS s’y affichent automatiquement.</small>
        </span>
        <ChevronDown size={18} className={ouvert ? 'tourne' : ''} />
      </button>
      {ouvert && (
        <div className="abo-agenda-corps">
          {chargement && !jeton && <p className="text-sm text-muted"><Loader2 size={14} className="spin" /> Préparation de votre lien…</p>}
          {erreur && <p className="text-sm" style={{ color: 'var(--c-error)' }}>{erreur}</p>}
          {jeton && <>
            <div className="abo-agenda-boutons">
              <a className="btn btn-primary btn-sm" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">Google Agenda</a>
              <a className="btn btn-secondary btn-sm" href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${encodeURIComponent('Renova OS')}`} target="_blank" rel="noreferrer">Outlook</a>
              <a className="btn btn-secondary btn-sm" href={webcal}>iPhone / Apple Calendrier</a>
            </div>
            <label className="abo-agenda-lien">
              <span>Ou copiez ce lien d’abonnement dans votre agenda (« Ajouter un agenda à partir d’une URL ») :</span>
              <span className="abo-agenda-copie">
                <code>{https}</code>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { void navigator.clipboard?.writeText(https).then(() => setCopie(true)) }}>
                  {copie ? <Check size={14} /> : <Copy size={14} />} {copie ? 'Copié' : 'Copier'}
                </button>
              </span>
            </label>
            <p className="text-xs text-muted">
              Synchronisation en lecture seule : les RDV créés dans Renova OS apparaissent dans votre agenda (mise à jour toutes les heures environ ; Google peut prendre jusqu’à 12 h).
              Ce lien est personnel : ne le partagez pas.{' '}
              <button type="button" className="abo-agenda-reset" onClick={() => void obtenir(true)}><RefreshCw size={12} /> Réinitialiser le lien</button>
            </p>
          </>}
        </div>
      )}
    </div>
  )
}
