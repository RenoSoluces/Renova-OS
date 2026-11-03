import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { Button } from '../ui/Button'
import { FloatInput } from '../ui/FloatInput'
import { conditionsLicence } from '../../lib/licence/conditionsLicence'

/** Demande au dirigeant d'une entreprise cliente d'accepter les conditions de licence, une fois qu'elles lui ont été soumises. */
export function AcceptationConditions() {
  const { profile } = useAuth()
  const [licence, setLicence] = useState<any>(null)
  const [nom, setNom] = useState('')
  const [erreur, setErreur] = useState('')
  const dirigeant = profile && ['partner_admin', 'company_admin'].includes(profile.role)

  useEffect(() => {
    if (!dirigeant || !profile?.organisation_id) return
    void supabase.from('licences').select('*, organisation:organisations(nom)').eq('organisation_id', profile.organisation_id).maybeSingle()
      .then(({ data }) => { if (data && data.conditions_envoyees_le && !data.acceptees_le && ['essai', 'active', 'brouillon'].includes(data.statut)) setLicence(data) })
  }, [dirigeant, profile?.organisation_id])

  if (!licence) return null
  const t = conditionsLicence({
    fournisseur: 'Reno Soluces', fournisseurSiret: '', fournisseurAdresse: 'Trausse (Aude)',
    client: licence.client_raison_sociale || licence.organisation?.nom || '', clientForme: licence.client_forme || undefined, clientSiret: licence.client_siret || undefined,
    clientAdresse: [licence.client_adresse, licence.client_code_postal, licence.client_ville].filter(Boolean).join(' '),
    nbLicences: licence.nb_licences, prixHtMensuel: Number(licence.prix_ht_mensuel), formule: licence.formule, remiseAnnuellePct: Number(licence.remise_annuelle_pct), engagementMois: licence.engagement_mois, preavisJours: licence.preavis_jours, essaiJours: licence.essai_jours,
    debut: licence.debut ? new Date(licence.debut).toLocaleDateString('fr-FR') : undefined,
  })

  async function accepter() {
    setErreur('')
    const { error } = await supabase.rpc('accepter_conditions_licence', { p_nom: nom })
    if (error) { setErreur(error.message); return }
    setLicence(null)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Conditions de licence">
      <div className="modal" style={{ maxWidth: 760 }}>
        <div className="modal-header"><div className="modal-title">Conditions de licence Renova OS</div></div>
        <div className="modal-body">
          <p className="text-sm text-muted" style={{ marginTop: 0 }}>Merci de lire et d'accepter les conditions pour continuer à utiliser Renova OS.</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, maxHeight: 340, overflow: 'auto', background: 'var(--bg-soft,#f6f8f8)', padding: 12, borderRadius: 10 }}>{t.corps}</pre>
          <FloatInput label="Nom et prénom du signataire" value={nom} onChange={setNom} />
          {erreur && <p className="text-sm" role="alert" style={{ color: '#b42318' }}>{erreur}</p>}
        </div>
        <div className="modal-footer"><Button variant="primary" disabled={nom.trim().length < 3} onClick={() => void accepter()}>J'ai lu et j'accepte les conditions</Button></div>
      </div>
    </div>
  )
}
