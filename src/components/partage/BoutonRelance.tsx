import { useState } from 'react'
import { Loader2, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { modelesRelance, type ContexteRelance, type InfosRelance } from '../../lib/crm/messagesRelance'
import { PartageMessage } from './PartageMessage'

interface Props {
  prospect: { id: string; prenom?: string | null; nom?: string | null; civilite?: string | null; telephone?: string | null; email?: string | null } | null | undefined
  contexte: ContexteRelance
  infos?: InfosRelance
  /** Joint au message le lien de l'espace client (créé au besoin). */
  espace?: { dossierId?: string | null; devisId?: string | null }
  className?: string
  libelle?: string
}

const TITRES: Record<ContexteRelance, string> = { installation: 'Prévenir le client de la pose', relance: 'Relancer le client', rdv: 'Message avant le rendez-vous', apres_rdv: 'Message après le rendez-vous', devis: 'Relancer le devis', pieces: 'Demander les pièces' }

/** Bouton « Message » : choisit un modèle adapté à la situation et l'envoie par WhatsApp, SMS ou e-mail. */
export function BoutonRelance({ prospect, contexte, infos, espace, className = 'btn btn-sm btn-secondary', libelle = 'Message' }: Props) {
  const { profile } = useAuth()
  const [ouvert, setOuvert] = useState(false)
  const [lien, setLien] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  if (!prospect || (!prospect.telephone && !prospect.email)) return null

  async function ouvrir() {
    if (espace && !lien) {
      setOccupe(true)
      const { data } = await supabase.rpc('creer_lien_portail', { p_prospect_id: prospect!.id, p_dossier_id: espace.dossierId || null, p_devis_id: espace.devisId || null })
      setOccupe(false)
      if (data) setLien(`${window.location.origin}/portail/${data}`)
    }
    setOuvert(true)
  }

  const modeles = modelesRelance(contexte, {
    prenomClient: prospect.prenom, nomClient: prospect.nom, civilite: prospect.civilite, commercial: profile?.nom_complet, ...infos, lienEspace: lien || infos?.lienEspace,
  })

  return (
    <>
      <button type="button" className={className} onClick={() => void ouvrir()} disabled={occupe}>{occupe ? <Loader2 size={14} className="spin" /> : <MessageCircle size={14} />} {libelle}</button>
      {ouvert && (
        <PartageMessage
          key={lien || 'sans-lien'}
          titre={TITRES[contexte]}
          sousTitre={`${prospect.prenom || ''} ${prospect.nom || ''}`.trim()}
          message={modeles[0].message}
          modeles={modeles}
          telephone={prospect.telephone}
          email={prospect.email}
          onFermer={() => setOuvert(false)}
          onEnvoye={(canal, texte) => {
            void supabase.from('interactions').insert({
              prospect_id: prospect.id, type: canal === 'email' ? 'email' : 'message', auteur: profile?.nom_complet || null,
              contenu: `Message ${canal === 'whatsapp' ? 'WhatsApp' : canal === 'sms' ? 'SMS' : canal === 'email' ? 'e-mail' : 'partagé'} : ${texte}`.slice(0, 2000),
              meta: { canal, contexte },
            })
          }}
        />
      )}
    </>
  )
}
