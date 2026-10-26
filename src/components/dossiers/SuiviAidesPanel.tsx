import { useMemo, useState } from 'react'
import { AlertOctagon, CheckCircle2, Circle, Clock3, ListPlus, Mail, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { BoutonEspaceClient } from '../partage/BoutonEspaceClient'
import { alertesDossier, etapesDossier, messageDemandePieces, piecesAAjouter, type Aide, type Etape, type PieceDossier, type SuiviAides } from '../../lib/dossiers/suiviAides'

interface Props {
  dossier: { id: string; reference?: string | null; prospect_id: string | null; aides?: string[] | null; suivi_aides?: SuiviAides | null; date_installation?: string | null; date_installation_prevue?: string | null }
  prospect?: { prenom?: string | null; email?: string | null; telephone?: string | null; fiches_cee?: string[] | null } | null
  signatureDevis?: string | null
  pieces: PieceDossier[]
  /** Recharge les pièces et le dossier après une modification. */
  onChange: () => void
}

const ICONE: Record<Etape['etat'], typeof Circle> = { fait: CheckCircle2, a_faire: Circle, en_retard: Clock3, bloquant: AlertOctagon }
const dateFr = (iso?: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('fr-FR') : '')

/** Suivi des aides du dossier : aides concernées, dates clés, échéances, pièces obligatoires et demande au client. */
export function SuiviAidesPanel({ dossier, prospect, signatureDevis, pieces, onChange }: Props) {
  const [aides, setAides] = useState<Aide[]>(((dossier.aides || []) as Aide[]).filter(a => a === 'cee' || a === 'mpr'))
  const [suivi, setSuivi] = useState<SuiviAides>(dossier.suivi_aides || {})
  const [message, setMessage] = useState('')
  const [occupe, setOccupe] = useState(false)

  const fiches = prospect?.fiches_cee || []
  const etapes = useMemo(() => etapesDossier({ aides, suivi, signatureDevis, installation: dossier.date_installation, installationPrevue: dossier.date_installation_prevue, pieces }), [aides, suivi, signatureDevis, dossier.date_installation, dossier.date_installation_prevue, pieces])
  const alertes = alertesDossier(etapes)
  const aAjouter = piecesAAjouter(aides, fiches, pieces)
  const manquantes = pieces.filter(p => !(p.recu || p.url))

  async function enregistrer(nouvellesAides: Aide[], nouveauSuivi: SuiviAides) {
    setAides(nouvellesAides); setSuivi(nouveauSuivi)
    const { error } = await supabase.from('dossiers').update({ aides: nouvellesAides, suivi_aides: nouveauSuivi }).eq('id', dossier.id)
    if (error) setMessage(`Enregistrement impossible : ${error.message}`)
  }
  const basculerAide = (a: Aide) => void enregistrer(aides.includes(a) ? aides.filter(x => x !== a) : [...aides, a], suivi)
  const majDate = (aide: 'cee' | 'mpr' | 'facture', champ: string, valeur: string) => {
    const suivant: SuiviAides = aide === 'facture' ? { ...suivi, facture: valeur || undefined } : { ...suivi, [aide]: { ...(suivi[aide] || {}), [champ]: valeur || undefined } }
    void enregistrer(aides, suivant)
  }

  async function ajouterPieces() {
    setOccupe(true); setMessage('')
    const lignes = aAjouter.map(p => ({ dossier_id: dossier.id, prospect_id: dossier.prospect_id, nom: p.nom, type: p.type, categorie: p.categorie, recu: false, obligatoire: true, etape: p.etape }))
    const { error } = await supabase.from('documents').insert(lignes)
    // Les pièces déjà présentes de la liste attendue deviennent obligatoires et datées par étape.
    if (!error) {
      for (const p of pieces) {
        const attendue = piecesAAjouter(aides, fiches, []).find(x => x.type === p.type)
        if (attendue && p.id && (!p.obligatoire || !p.etape)) await supabase.from('documents').update({ obligatoire: true, etape: attendue.etape }).eq('id', p.id)
      }
    }
    setOccupe(false)
    setMessage(error ? `Ajout impossible : ${error.message}` : `${lignes.length} pièce(s) ajoutée(s) à la liste.`)
    onChange()
  }

  async function demanderAuClient() {
    if (!dossier.prospect_id || !manquantes.length) return
    const aDemander = manquantes.filter(p => !['facture', 'cee_offre', 'mpr_depot', 'mpr_accord', 'attestation_honneur', 'note_dimensionnement', 'certificat_rge', 'photos'].includes(p.type || ''))
    if (!aDemander.length) { setMessage('Les pièces manquantes sont à produire par l’entreprise, pas par le client.'); return }
    setOccupe(true); setMessage('')
    const corps = messageDemandePieces(prospect?.prenom, aDemander, dossier.reference)
    const { data, error } = await supabase.functions.invoke('envoyer-email-prospect', { body: { prospect_id: dossier.prospect_id, sujet: `Documents pour votre dossier${dossier.reference ? ` ${dossier.reference}` : ''}`, message: corps, modele: 'demande_pieces' } })
    let erreur = error || data?.error ? (data?.error || error?.message) : ''
    if (erreur) { try { const j = await (error as any)?.context?.json?.(); if (j?.error) erreur = j.error } catch { /* ignoré */ } }
    if (erreur) {
      setOccupe(false)
      if (prospect?.email) window.location.href = `mailto:${prospect.email}?subject=${encodeURIComponent('Documents pour votre dossier')}&body=${encodeURIComponent(corps)}`
      setMessage(`Envoi automatique impossible (${erreur}) : votre messagerie s’ouvre avec le message prêt.`)
    }
    const maintenant = new Date().toISOString()
    await supabase.from('documents').update({ demande_le: maintenant }).in('id', aDemander.map(p => p.id!).filter(Boolean))
    setOccupe(false)
    if (!erreur) setMessage(`Demande envoyée à ${prospect?.email} (${aDemander.length} pièce(s)). Relance proposée dans 7 jours.`)
    onChange()
  }

  const champDate = (aide: 'cee' | 'mpr', champ: string, label: string) => (
    <label className="sa-date"><span>{label}</span><input type="date" value={(suivi[aide] as any)?.[champ] || ''} onChange={e => majDate(aide, champ, e.target.value)} /></label>
  )

  return (
    <section className="sa">
      <div className="sa-tete">
        <div className="sa-titre"><ShieldCheck size={17} /> Suivi des aides</div>
        <div className="sa-aides" role="group" aria-label="Aides du dossier">
          {(['cee', 'mpr'] as Aide[]).map(a => <button key={a} type="button" className={aides.includes(a) ? 'on' : ''} aria-pressed={aides.includes(a)} onClick={() => basculerAide(a)}>{a === 'cee' ? 'Prime CEE' : 'MaPrimeRénov’'}</button>)}
        </div>
      </div>

      {aides.length === 0 && <p className="sa-vide">Indiquez les aides du dossier pour suivre les pièces obligatoires et les échéances.</p>}

      {alertes.length > 0 && (
        <div className="sa-alertes" role="alert">
          {alertes.map(a => <div key={a.id} className={`sa-alerte ${a.etat}`}><AlertOctagon size={15} /> <b>{a.label}</b>{a.detail ? ` — ${a.detail}` : ''}</div>)}
        </div>
      )}

      {aides.length > 0 && <>
        <ol className="sa-etapes">
          {etapes.map(e => {
            const Icone = ICONE[e.etat]
            return (
              <li key={e.id} className={`sa-etape ${e.etat}`}>
                <Icone size={17} />
                <div>
                  <strong>{e.label}</strong>
                  <small>{e.date ? `Fait le ${dateFr(e.date)}` : e.echeance ? `Échéance : ${dateFr(e.echeance)}` : ''}{e.detail && e.etat !== 'en_retard' && e.etat !== 'bloquant' ? `${e.date || e.echeance ? ' · ' : ''}${e.detail}` : ''}</small>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="sa-dates">
          <label className="sa-date"><span>Date de facture</span><input type="date" value={suivi.facture || ''} onChange={e => majDate('facture', '', e.target.value)} /></label>
          {aides.includes('cee') && <>
            {champDate('cee', 'offre_acceptee', 'Offre CEE acceptée')}
            {champDate('cee', 'depot', 'Dossier CEE déposé')}
            {champDate('cee', 'paiement', 'Prime CEE versée')}
          </>}
          {aides.includes('mpr') && <>
            {champDate('mpr', 'depot', 'Demande MPR déposée')}
            {champDate('mpr', 'accord', 'Accord MPR')}
            {champDate('mpr', 'demande_solde', 'Solde demandé')}
            {champDate('mpr', 'paiement', 'MPR versée')}
          </>}
        </div>

        <div className="sa-actions">
          {aAjouter.length > 0 && <button type="button" className="sa-btn" onClick={() => void ajouterPieces()} disabled={occupe}><ListPlus size={15} /> Ajouter les {aAjouter.length} pièce(s) obligatoire(s) manquante(s) à la liste</button>}
          {manquantes.length > 0 && <button type="button" className="sa-btn prim" onClick={() => void demanderAuClient()} disabled={occupe || !prospect?.email}><Mail size={15} /> Demander les pièces au client</button>}
          {dossier.prospect_id && <BoutonEspaceClient prospect={{ id: dossier.prospect_id, prenom: prospect?.prenom, telephone: (prospect as any)?.telephone, email: prospect?.email }} dossierId={dossier.id} motif="pieces" className="sa-btn" libelle="Espace client (dépôt en ligne)" />}
          {!prospect?.email && manquantes.length > 0 && <small className="sa-note">Ajoutez l’e-mail du client pour lui demander les pièces.</small>}
        </div>
      </>}
      {message && <p className="sa-message" role="status">{message}</p>}
    </section>
  )
}
