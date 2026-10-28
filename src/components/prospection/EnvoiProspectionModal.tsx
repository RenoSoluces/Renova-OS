import { useEffect, useState } from 'react'
import { PhoneCall } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface Membre { id: string; nom_complet: string }

const CLE_ASSIGNE = 'renova.listeAppels.assigne'
const lireAssigne = () => { try { return localStorage.getItem(CLE_ASSIGNE) || '' } catch { return '' } }
const garderAssigne = (id: string) => { try { localStorage.setItem(CLE_ASSIGNE, id) } catch { /* stockage indisponible */ } }

/** Rôles autorisés à envoyer des prospects dans la liste d'appels de quelqu'un. */
export const peutEnvoyerEnProspection = (role?: string | null) =>
  ['admin', 'manager', 'commercial_manager', 'partner_admin', 'company_admin'].includes(role || '')

/**
 * Envoie un ou plusieurs prospects du CRM dans la liste « Prospection téléphone » d'une personne.
 * Le commercial attribué ne change pas.
 */
export function EnvoiProspectionModal({ ids, libelle, onClose, onEnvoye }: {
  ids: string[]
  /** Ce qui est envoyé, en clair (« ce prospect », « les 242 prospects affichés »…). */
  libelle: string
  onClose: () => void
  onEnvoye?: (n: number, nom: string) => void
}): JSX.Element {
  const { profile } = useAuth()
  const [membres, setMembres] = useState<Membre[]>([])
  const [assigne, setAssigne] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  useEffect(() => {
    const org = (profile as { organisation_id?: string | null } | null)?.organisation_id || null
    let q = supabase.from('profiles').select('id,nom_complet').in('role', ['admin', 'manager', 'commercial', 'commercial_manager', 'company_admin'])
    if (org) q = q.eq('organisation_id', org)
    void q.order('nom_complet').then(({ data }) => {
      const liste = (data || []) as Membre[]
      setMembres(liste)
      const memorise = lireAssigne()
      // Par défaut : le dernier choix, sinon la personne qui fait le phoning si on la reconnaît, sinon soi-même.
      const phoning = liste.find(m => /melissa/i.test(m.nom_complet))
      setAssigne(liste.some(m => m.id === memorise) ? memorise : phoning?.id || profile?.id || '')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const personne = membres.find(m => m.id === assigne)

  async function envoyer() {
    if (!assigne || !ids.length) return
    setEnvoi(true); setMessage(null)
    let total = 0
    for (let i = 0; i < ids.length; i += 500) {
      const { data, error } = await supabase.rpc('ajouter_liste_appels', { p_ids: ids.slice(i, i + 500), p_assigne: assigne })
      if (error) { setMessage({ ok: false, texte: `Envoi interrompu : ${error.message}` }); setEnvoi(false); return }
      total += Number(data) || 0
    }
    garderAssigne(assigne)
    setEnvoi(false)
    setMessage({ ok: true, texte: `${total} prospect${total > 1 ? 's' : ''} envoyé${total > 1 ? 's' : ''} dans la Prospection téléphone de ${personne?.nom_complet || 'la personne choisie'}.` })
    onEnvoye?.(total, personne?.nom_complet || '')
  }

  return <Modal open onClose={onClose} title="Envoyer en prospection téléphonique" width={520}
    footer={message?.ok
      ? <Button variant="primary" onClick={onClose}>Fermer</Button>
      : <>
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={() => void envoyer()} disabled={envoi || !assigne || !ids.length}>
          <PhoneCall size={16} /> {envoi ? 'Envoi…' : `Envoyer${personne ? ` à ${personne.nom_complet}` : ''}`}
        </Button>
      </>}>
    <div className="la">
      <p className="ep-intro">Vous envoyez <strong>{libelle}</strong> dans la liste « À appeler » de la Prospection téléphone.</p>
      <label className="field"><span>Qui appelle ?</span>
        <select className="input" value={assigne} onChange={e => setAssigne(e.target.value)} disabled={envoi || message?.ok}>
          {membres.map(m => <option key={m.id} value={m.id}>{m.nom_complet}</option>)}
        </select>
      </label>
      {message && <div className={`pt-message ${message.ok ? 'ok' : 'erreur'}`} role="status">{message.texte}</div>}
      <p className="pt-aide">Le commercial attribué ne change pas. La personne choisie peut appeler, noter le résultat et programmer un rappel ; tout reste dans l’historique du prospect. Seuls les prospects qui ont un numéro de téléphone sont envoyés ; un prospect déjà dans une liste passe simplement dans celle-ci.</p>
    </div>
  </Modal>
}
