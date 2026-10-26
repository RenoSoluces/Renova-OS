import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Download, FileText, Mail, PenLine, X } from 'lucide-react'
import { SignaturePad } from '../shared/SignaturePad'
import './signature.css'

export interface ConsentementsSignature {
  cgv_acceptees: boolean
  bordereau_remis: boolean
  execution_anticipee: boolean
  envoyer_copie: boolean
}

export interface ResultatSignature {
  ok: boolean
  erreur?: string
  pdfArchive?: boolean
  emailEnvoyeA?: string | null
  erreurEmail?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  numero: string
  client: string
  emailClient?: string | null
  lignes: { designation: string; quantite: number; montant_ht: number }[]
  totalHT: number
  totalTTC: number
  remiseHT: number
  aides: { libelle: string; montant: number }[]
  resteACharge: number
  cgv: string
  horsEtablissement: boolean
  nomParDefaut: string
  onSigner: (nom: string, signature: string, consentements: ConsentementsSignature) => Promise<ResultatSignature>
  onTelecharger: () => void
}

const euro = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

/**
 * Signature du devis chez le client, sur tablette : récapitulatif lisible, conditions générales,
 * consentements (CGV, bordereau de rétractation, exécution anticipée), signature manuscrite, puis
 * archivage du PDF signé et envoi d'une copie au client.
 */
export function SignatureSurPlace(props: Props) {
  const { open, onClose, numero, client, emailClient, lignes, totalHT, totalTTC, remiseHT, aides, resteACharge, cgv, horsEtablissement, nomParDefaut, onSigner, onTelecharger } = props
  const [etape, setEtape] = useState<1 | 2 | 3>(1)
  const [nom, setNom] = useState(nomParDefaut)
  const [signature, setSignature] = useState<string | null>(null)
  const [cgvOuvertes, setCgvOuvertes] = useState(false)
  const [consent, setConsent] = useState<ConsentementsSignature>({ cgv_acceptees: false, bordereau_remis: false, execution_anticipee: false, envoyer_copie: !!emailClient })
  const [envoi, setEnvoi] = useState(false)
  const [resultat, setResultat] = useState<ResultatSignature | null>(null)

  useEffect(() => {
    if (!open) return
    setEtape(1); setNom(nomParDefaut); setSignature(null); setResultat(null); setCgvOuvertes(false)
    setConsent({ cgv_acceptees: false, bordereau_remis: false, execution_anticipee: false, envoyer_copie: !!emailClient })
  }, [open, nomParDefaut, emailClient])

  useEffect(() => {
    if (!open) return
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = precedent }
  }, [open])

  if (!open) return null

  const totalAides = aides.reduce((s, a) => s + a.montant, 0)
  const cgvTexte = cgv.trim()
  const peutSigner = !!signature && nom.trim().length > 1 && consent.cgv_acceptees && (!horsEtablissement || consent.bordereau_remis) && !envoi

  async function signer() {
    if (!peutSigner || !signature) return
    setEnvoi(true)
    const r = await onSigner(nom.trim(), signature, consent)
    setEnvoi(false)
    setResultat(r)
    if (r.ok) setEtape(3)
  }

  const coche = (cle: keyof ConsentementsSignature, libelle: React.ReactNode, obligatoire = false) => (
    <label className={`ssp-coche${consent[cle] ? ' on' : ''}`}>
      <input type="checkbox" checked={consent[cle]} onChange={e => setConsent(c => ({ ...c, [cle]: e.target.checked }))} />
      <span className="ssp-case" aria-hidden="true"><Check size={14} /></span>
      <span>{libelle}{obligatoire && <em> obligatoire</em>}</span>
    </label>
  )

  return (
    <div className="ssp" role="dialog" aria-modal="true" aria-label={`Signature du devis ${numero}`}>
      <header className="ssp-tete">
        <div>
          <div className="ssp-sur">Devis {numero}</div>
          <h2>{etape === 3 ? 'Devis signé' : `Proposition pour ${client || 'le client'}`}</h2>
        </div>
        <ol className="ssp-etapes" aria-label="Étapes">
          {['Récapitulatif', 'Accord et signature', 'Terminé'].map((l, i) => (
            <li key={l} className={etape === i + 1 ? 'actif' : etape > i + 1 ? 'fait' : ''}><span>{etape > i + 1 ? <Check size={12} /> : i + 1}</span>{l}</li>
          ))}
        </ol>
        <button className="ssp-fermer" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
      </header>

      <div className="ssp-corps">
        {etape === 1 && (
          <div className="ssp-recap">
            <section className="ssp-carte">
              <h3>Votre projet</h3>
              <ul className="ssp-lignes">
                {lignes.map((l, i) => (
                  <li key={i}><span>{l.designation}{l.quantite !== 1 ? <small> × {l.quantite.toLocaleString('fr-FR')}</small> : null}</span><b>{euro(l.montant_ht)}</b></li>
                ))}
              </ul>
              {remiseHT > 0 && <div className="ssp-ligne-tot"><span>Remise commerciale</span><b>− {euro(remiseHT)}</b></div>}
              <div className="ssp-ligne-tot"><span>Total HT</span><b>{euro(totalHT)}</b></div>
              <div className="ssp-ligne-tot fort"><span>Total TTC</span><b>{euro(totalTTC)}</b></div>
            </section>
            <section className="ssp-carte ssp-financement">
              <h3>Financement</h3>
              {aides.length === 0 && <p className="ssp-mute">Aucune aide déduite sur ce devis.</p>}
              {aides.map((a, i) => <div key={i} className="ssp-ligne-tot"><span>{a.libelle}</span><b>− {euro(a.montant)}</b></div>)}
              <div className="ssp-reste">
                <span>Reste à votre charge</span>
                <strong>{euro(totalAides > 0 ? resteACharge : totalTTC)}</strong>
                {totalAides > 0 && <small>soit {euro(totalAides)} d’aides estimées</small>}
              </div>
              {horsEtablissement && <p className="ssp-mute">Vous disposez de 14 jours pour changer d’avis après la signature (bordereau de rétractation joint au devis). Aucun paiement ne peut être demandé avant 7 jours.</p>}
            </section>
            <section className="ssp-carte ssp-cgv">
              <button className="ssp-cgv-tete" onClick={() => setCgvOuvertes(o => !o)} aria-expanded={cgvOuvertes}>
                <FileText size={18} /> <span>Conditions générales de vente</span><small>{cgvTexte ? (cgvOuvertes ? 'Masquer' : 'Lire') : 'Non renseignées'}</small>
              </button>
              {cgvOuvertes && cgvTexte && <div className="ssp-cgv-texte">{cgvTexte}</div>}
              {!cgvTexte && <p className="ssp-alerte">Les CGV ne sont pas renseignées (Paramètres → Devis). Le devis signé ne les contiendra pas.</p>}
            </section>
          </div>
        )}

        {etape === 2 && (
          <div className="ssp-accord">
            <div className="ssp-consent">
              {coche('cgv_acceptees', 'J’ai lu et j’accepte le devis et les conditions générales de vente (consultables à l’étape précédente).', true)}
              {horsEtablissement && coche('bordereau_remis', 'J’ai reçu les informations sur mon droit de rétractation de 14 jours et le bordereau de rétractation.', true)}
              {horsEtablissement && coche('execution_anticipee', 'Je demande que les travaux commencent avant la fin du délai de rétractation (facultatif).')}
              {emailClient
                ? coche('envoyer_copie', <>Recevoir le devis signé par e-mail à <b>{emailClient}</b>.</>)
                : <p className="ssp-mute"><Mail size={14} /> Pas d’e-mail renseigné : remettez une copie papier ou ajoutez l’e-mail sur la fiche client.</p>}
            </div>
            <label className="ssp-champ">
              <span>Nom et prénom du signataire</span>
              <input value={nom} onChange={e => setNom(e.target.value)} autoComplete="name" />
            </label>
            <div className="ssp-champ">
              <span>Signature précédée de la mention « Bon pour accord »</span>
              <div className="ssp-pad"><SignaturePad onChange={setSignature} height={230} /></div>
            </div>
            {resultat && !resultat.ok && <p className="ssp-alerte" role="alert">{resultat.erreur || 'La signature n’a pas pu être enregistrée.'}</p>}
          </div>
        )}

        {etape === 3 && resultat && (
          <div className="ssp-fin">
            <div className="ssp-fin-icone"><Check size={40} strokeWidth={2.5} /></div>
            <h3>Merci {nom.split(' ')[0]} !</h3>
            <p>Le devis {numero} est signé et verrouillé.</p>
            <ul className="ssp-etat">
              <li className={resultat.pdfArchive ? 'ok' : 'ko'}>{resultat.pdfArchive ? <Check size={16} /> : <X size={16} />} PDF signé {resultat.pdfArchive ? 'archivé dans le dossier client' : 'non archivé : téléchargez-le'}</li>
              {consent.envoyer_copie && emailClient && (
                <li className={resultat.emailEnvoyeA ? 'ok' : 'ko'}>{resultat.emailEnvoyeA ? <Check size={16} /> : <X size={16} />} {resultat.emailEnvoyeA ? `Copie envoyée à ${resultat.emailEnvoyeA}` : `E-mail non envoyé${resultat.erreurEmail ? ` : ${resultat.erreurEmail}` : ''}`}</li>
              )}
              <li className="ok"><Check size={16} /> Dossier client ouvert, pièces à collecter listées</li>
            </ul>
          </div>
        )}
      </div>

      <footer className="ssp-pied">
        {etape === 1 && <>
          <button className="ssp-btn sec" onClick={onClose}>Revenir au devis</button>
          <button className="ssp-btn prim" onClick={() => setEtape(2)} disabled={lignes.length === 0}>Continuer vers la signature <ChevronRight size={18} /></button>
        </>}
        {etape === 2 && <>
          <button className="ssp-btn sec" onClick={() => setEtape(1)} disabled={envoi}><ChevronLeft size={18} /> Récapitulatif</button>
          <button className="ssp-btn prim" onClick={() => void signer()} disabled={!peutSigner}><PenLine size={18} /> {envoi ? 'Signature en cours…' : 'Signer le devis'}</button>
        </>}
        {etape === 3 && <>
          <button className="ssp-btn sec" onClick={onTelecharger}><Download size={18} /> Télécharger le PDF</button>
          <button className="ssp-btn prim" onClick={onClose}>Terminer</button>
        </>}
      </footer>
    </div>
  )
}
