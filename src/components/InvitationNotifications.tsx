import { useEffect, useState } from 'react'
import { BellRing, X, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'
import { abonnementActif, activerNotifications, pushDisponible } from '../lib/push'

const CLE_REFUS = 'renova_invitation_notifications_masquee'

/** Bandeau proposant d'activer les notifications (récap du matin, relances), tant qu'elles ne le sont pas. */
export function InvitationNotifications() {
  const { profile } = useAuth()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let masquee = false
    try { masquee = Number(localStorage.getItem(CLE_REFUS) || 0) > Date.now() } catch { /* stockage indisponible */ }
    if (masquee || !pushDisponible() || Notification.permission === 'denied') return
    void abonnementActif().then(actif => setVisible(!actif))
  }, [])

  if (!visible) return null

  async function activer() {
    if (!profile?.id) return
    setBusy(true); setMessage('')
    try {
      await activerNotifications(profile.id)
      setMessage('C’est activé : vous recevrez votre récap chaque matin et les relances importantes.')
      window.setTimeout(() => setVisible(false), 3500)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Activation impossible.')
    } finally { setBusy(false) }
  }

  function plusTard() {
    try { localStorage.setItem(CLE_REFUS, String(Date.now() + 7 * 86400000)) } catch { /* stockage indisponible */ }
    setVisible(false)
  }

  return (
    <div className="invit-notif" role="region" aria-label="Activer les notifications">
      <span className="invit-notif-icone"><BellRing size={18} /></span>
      <div className="invit-notif-texte">
        <strong>Ne ratez plus une relance</strong>
        <span>{message || 'Activez les notifications : récap de votre journée à 7 h, devis à relancer, nouveaux prospects et messages.'}</span>
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void activer()} disabled={busy}>
        {busy ? <Loader2 size={14} className="spin" /> : 'Activer'}
      </button>
      <button type="button" className="invit-notif-fermer" onClick={plusTard} aria-label="Plus tard"><X size={16} /></button>
    </div>
  )
}
