import { useState } from 'react'
import { Globe, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PartageMessage } from './PartageMessage'

interface Props {
  prospect: { id: string; prenom?: string | null; nom?: string | null; telephone?: string | null; email?: string | null }
  dossierId?: string | null
  devisId?: string | null
  /** Contexte du message : signature d'un devis ou envoi de pièces. */
  motif?: 'devis' | 'pieces' | 'suivi'
  className?: string
  libelle?: string
}

/** Crée le lien de l'espace client (sans compte) et propose de l'envoyer par WhatsApp, SMS ou e-mail. */
export function BoutonEspaceClient({ prospect, dossierId, devisId, motif = 'suivi', className = 'btn btn-secondary', libelle = 'Espace client' }: Props) {
  const [lien, setLien] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState('')

  async function ouvrir() {
    setOccupe(true); setErreur('')
    const { data, error } = await supabase.rpc('creer_lien_portail', { p_prospect_id: prospect.id, p_dossier_id: dossierId || null, p_devis_id: devisId || null })
    setOccupe(false)
    if (error || !data) { setErreur(error?.message || 'Lien indisponible.'); return }
    setLien(`${window.location.origin}/portail/${data}`)
  }

  const prenom = prospect.prenom || ''
  const intro = `Bonjour${prenom ? ` ${prenom}` : ''},`
  const corps = motif === 'devis'
    ? `Votre devis est disponible dans votre espace personnel. Vous pouvez le consulter et le signer en ligne en 2 minutes (un code de sécurité vous sera envoyé par e-mail) :`
    : motif === 'pieces'
      ? `Pour avancer sur votre dossier d’aides, vous pouvez nous envoyer vos documents directement depuis votre espace personnel (une photo prise avec votre téléphone suffit) :`
      : `Suivez l’avancement de votre projet, envoyez vos documents et consultez votre devis depuis votre espace personnel :`

  return (
    <>
      <button type="button" className={className} onClick={() => void ouvrir()} disabled={occupe} title={erreur || 'Lien personnel du client : suivi, documents, signature en ligne'}>
        {occupe ? <Loader2 size={15} className="spin" /> : <Globe size={15} />} {libelle}
      </button>
      {lien && (
        <PartageMessage
          titre="Espace client"
          sousTitre="Lien personnel, sans mot de passe, valable 120 jours"
          sujet="Votre espace projet"
          telephone={prospect.telephone}
          email={prospect.email}
          message={`${intro}\n\n${corps}\n${lien}\n\nÀ votre disposition pour toute question.`}
          onFermer={() => setLien(null)}
          onEnvoye={canal => { void supabase.from('interactions').insert({ prospect_id: prospect.id, type: 'note', contenu: `Lien de l’espace client envoyé (${canal}).`, meta: { canal: 'portail_client', envoi: canal } }) }}
        />
      )}
    </>
  )
}
