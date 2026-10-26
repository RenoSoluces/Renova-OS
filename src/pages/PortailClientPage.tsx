import { useEffect, useRef, useState } from 'react'
import { Check, CheckCircle2, ChevronDown, FileText, Loader2, Mail, Phone, PenLine, ShieldCheck, Upload, X } from 'lucide-react'
import { SignaturePad } from '../components/shared/SignaturePad'
import '../styles/portail.css'

interface DonneesPortail {
  client: { prenom: string | null; nom: string | null; email_masque: string | null }
  entreprise: { nom: string; telephone: string | null; email: string | null; logo: string | null }
  conseiller: { nom: string | null; telephone: string | null; email: string | null } | null
  etapes: { id: string; label: string; fait: boolean; date?: string | null }[]
  dossier: { reference: string | null; installation_prevue: string | null } | null
  pieces: { id: string; nom: string; recu: boolean; obligatoire: boolean }[]
  devis: null | {
    numero: string; statut: string; montant_ht: number; montant_tva: number; montant_ttc: number; montant_aides: number | null; reste_a_charge: number | null
    remise_ht: number | null; date_validite: string | null; conditions_paiement: string | null; signe: boolean; signature_date: string | null; signataire: string | null
    lignes: { designation: string; quantite: number; montant_ht: number }[]; aides: { libelle: string; montant: number }[]
    cgv: string; hors_etablissement: boolean; signable: boolean; pdf: string | null
  }
}

const euro = (n: number | null | undefined) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0)
const dateFr = (iso?: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const URL_FONCTION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portail-client`

async function appeler<T = any>(corps: Record<string, unknown>): Promise<T> {
  const r = await fetch(URL_FONCTION, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY }, body: JSON.stringify(corps) })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d?.error || 'Service momentanément indisponible.')
  return d as T
}

const lireBase64 = (f: File) => new Promise<string>((resolve, reject) => {
  const l = new FileReader()
  l.onload = () => resolve(String(l.result).split(',')[1] || '')
  l.onerror = reject
  l.readAsDataURL(f)
})

/** Espace client public (sans compte) : avancement du projet, pièces à envoyer, devis et signature à distance. */
export function PortailClientPage() {
  const jeton = window.location.pathname.split('/')[2] || ''
  const [d, setD] = useState<DonneesPortail | null>(null)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [detail, setDetail] = useState(false)
  const [cgv, setCgv] = useState(false)
  const [signature, setSignature] = useState(false)
  const fichierRef = useRef<HTMLInputElement>(null)
  const cible = useRef<string | null>(null)

  async function charger() {
    try { setD(await appeler<DonneesPortail>({ jeton, action: 'charger' })) } catch (e) { setErreur(e instanceof Error ? e.message : 'Lien invalide.') }
  }
  useEffect(() => { document.title = 'Mon projet de rénovation'; void charger() }, [])

  async function deposer(fichier: File) {
    const pieceId = cible.current
    setEnvoi(pieceId || 'libre'); setMessage('')
    try {
      await appeler({ jeton, action: 'deposer', piece_id: pieceId, nom_fichier: fichier.name, type_mime: fichier.type || 'application/octet-stream', contenu_base64: await lireBase64(fichier) })
      setMessage('Merci, document bien reçu ✅')
      await charger()
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Envoi impossible.') }
    setEnvoi(null)
    if (fichierRef.current) fichierRef.current.value = ''
  }
  const choisir = (pieceId: string | null) => { cible.current = pieceId; fichierRef.current?.click() }

  if (erreur) return <div className="ptl ptl-centre"><div className="ptl-carte ptl-erreur"><ShieldCheck size={30} /><h1>Lien indisponible</h1><p>{erreur}</p></div></div>
  if (!d) return <div className="ptl ptl-centre"><Loader2 size={30} className="spin" /></div>

  const manquantes = d.pieces.filter(p => !p.recu)
  const etapeActuelle = d.etapes.findIndex(e => !e.fait)

  return (
    <div className="ptl">
      <header className="ptl-tete">
        {d.entreprise.logo ? <img src={d.entreprise.logo} alt={d.entreprise.nom} /> : <strong>{d.entreprise.nom}</strong>}
      </header>
      <main className="ptl-corps">
        <section className="ptl-hero">
          <h1>Bonjour {d.client.prenom || d.client.nom} 👋</h1>
          <p>Voici l’avancement de votre projet{d.dossier?.reference ? ` (dossier ${d.dossier.reference})` : ''}.</p>
          <ol className="ptl-etapes">
            {d.etapes.map((e, i) => (
              <li key={e.id} className={e.fait ? 'fait' : i === etapeActuelle ? 'actuel' : ''}>
                <span>{e.fait ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                <div><strong>{e.label}</strong>{e.date && <small>{dateFr(e.date)}</small>}</div>
              </li>
            ))}
          </ol>
        </section>

        {message && <div className="ptl-message" role="status">{message}</div>}

        {d.pieces.length > 0 && (
          <section className="ptl-carte">
            <h2><FileText size={18} /> Documents à nous transmettre</h2>
            <p className="ptl-aide">{manquantes.length ? `Il nous manque ${manquantes.length} document${manquantes.length > 1 ? 's' : ''}. Une photo nette prise avec votre téléphone suffit.` : 'Merci, nous avons tous vos documents.'}</p>
            <ul className="ptl-pieces">
              {d.pieces.map(p => (
                <li key={p.id} className={p.recu ? 'ok' : ''}>
                  <span className="ptl-pastille">{p.recu ? <Check size={14} strokeWidth={3} /> : null}</span>
                  <span className="ptl-nom">{p.nom}</span>
                  {p.recu ? <em>Reçu</em> : <button type="button" onClick={() => choisir(p.id)} disabled={!!envoi}>{envoi === p.id ? <Loader2 size={16} className="spin" /> : <Upload size={16} />} Envoyer</button>}
                </li>
              ))}
            </ul>
            <button type="button" className="ptl-lien" onClick={() => choisir(null)} disabled={!!envoi}>{envoi === 'libre' ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} Envoyer un autre document</button>
            <input ref={fichierRef} type="file" accept="image/*,application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void deposer(f) }} />
          </section>
        )}

        {d.devis && (
          <section className="ptl-carte">
            <h2><PenLine size={18} /> Votre devis {d.devis.numero}</h2>
            <div className="ptl-montants">
              <div><small>Total TTC</small><strong>{euro(d.devis.montant_ttc)}</strong></div>
              {d.devis.aides.length > 0 && <div><small>Aides estimées</small><strong>− {euro(d.devis.aides.reduce((s, a) => s + Number(a.montant), 0))}</strong></div>}
              {d.devis.aides.length > 0 && <div className="fort"><small>Reste à votre charge</small><strong>{euro(d.devis.reste_a_charge)}</strong></div>}
            </div>
            <button type="button" className="ptl-depli" onClick={() => setDetail(x => !x)} aria-expanded={detail}>Détail de la proposition <ChevronDown size={16} style={{ transform: detail ? 'rotate(180deg)' : undefined }} /></button>
            {detail && (
              <div className="ptl-detail">
                <ul>{d.devis.lignes.map((l, i) => <li key={i}><span>{l.designation}{Number(l.quantite) !== 1 ? ` × ${l.quantite}` : ''}</span><b>{euro(l.montant_ht)} HT</b></li>)}</ul>
                {Number(d.devis.remise_ht) > 0 && <div className="ptl-ligne"><span>Remise</span><b>− {euro(d.devis.remise_ht)} HT</b></div>}
                <div className="ptl-ligne"><span>Total HT</span><b>{euro(d.devis.montant_ht)}</b></div>
                <div className="ptl-ligne"><span>TVA</span><b>{euro(d.devis.montant_tva)}</b></div>
                {d.devis.aides.map((a, i) => <div key={i} className="ptl-ligne"><span>{a.libelle}</span><b>− {euro(a.montant)}</b></div>)}
                {d.devis.conditions_paiement && <p className="ptl-aide">Paiement : {d.devis.conditions_paiement}</p>}
              </div>
            )}
            {d.devis.cgv && (
              <>
                <button type="button" className="ptl-depli" onClick={() => setCgv(x => !x)} aria-expanded={cgv}>Conditions générales de vente <ChevronDown size={16} style={{ transform: cgv ? 'rotate(180deg)' : undefined }} /></button>
                {cgv && <div className="ptl-cgv">{d.devis.cgv}</div>}
              </>
            )}
            {d.devis.signe ? (
              <div className="ptl-signe"><CheckCircle2 size={20} /> Devis signé{d.devis.signataire ? ` par ${d.devis.signataire}` : ''} le {dateFr(d.devis.signature_date)}{d.devis.pdf && <a href={d.devis.pdf} target="_blank" rel="noopener noreferrer">Télécharger le PDF</a>}</div>
            ) : d.devis.signable ? (
              <button type="button" className="ptl-cta" onClick={() => setSignature(true)}><PenLine size={19} /> Signer mon devis en ligne</button>
            ) : d.devis.statut === 'envoye' ? <p className="ptl-aide">Pour signer ce devis, contactez votre conseiller.</p> : null}
          </section>
        )}

        <section className="ptl-carte ptl-contact">
          <h2>Une question ?</h2>
          <p>{d.conseiller?.nom ? `${d.conseiller.nom}, votre conseiller` : d.entreprise.nom}</p>
          <div>
            {(d.conseiller?.telephone || d.entreprise.telephone) && <a href={`tel:${(d.conseiller?.telephone || d.entreprise.telephone)!.replace(/\s+/g, '')}`}><Phone size={17} /> Appeler</a>}
            {(d.conseiller?.email || d.entreprise.email) && <a href={`mailto:${d.conseiller?.email || d.entreprise.email}`}><Mail size={17} /> Écrire</a>}
          </div>
        </section>
        <footer className="ptl-pied">Espace sécurisé · {d.entreprise.nom}</footer>
      </main>

      {signature && d.devis && <SignatureDistance jeton={jeton} devis={d.devis} emailMasque={d.client.email_masque} nomParDefaut={`${d.client.prenom || ''} ${d.client.nom || ''}`.trim()} onFermer={() => setSignature(false)} onSigne={() => { setSignature(false); setMessage('Merci ! Votre devis est signé. Votre conseiller revient vers vous très vite.'); void charger() }} />}
    </div>
  )
}

function SignatureDistance({ jeton, devis, emailMasque, nomParDefaut, onFermer, onSigne }: { jeton: string; devis: NonNullable<DonneesPortail['devis']>; emailMasque: string | null; nomParDefaut: string; onFermer: () => void; onSigne: () => void }) {
  const [nom, setNom] = useState(nomParDefaut)
  const [image, setImage] = useState<string | null>(null)
  const [consent, setConsent] = useState({ cgv: false, bordereau: false, anticipee: false })
  const [code, setCode] = useState('')
  const [codeEnvoye, setCodeEnvoye] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState('')
  const pret = nom.trim().length > 1 && !!image && consent.cgv && (!devis.hors_etablissement || consent.bordereau)

  async function demanderCode() {
    setOccupe(true); setErreur('')
    try { const r = await appeler<{ email: string }>({ jeton, action: 'code' }); setCodeEnvoye(r.email) } catch (e) { setErreur(e instanceof Error ? e.message : 'Envoi impossible.') }
    setOccupe(false)
  }
  async function signer() {
    setOccupe(true); setErreur('')
    try {
      await appeler({ jeton, action: 'signer', code, nom: nom.trim(), signature: image, consentements: { cgv_acceptees: consent.cgv, bordereau_remis: consent.bordereau, execution_anticipee: consent.anticipee } })
      onSigne()
    } catch (e) { setErreur(e instanceof Error ? e.message : 'Signature impossible.') }
    setOccupe(false)
  }
  const coche = (cle: keyof typeof consent, texte: string) => (
    <label className={`ptl-coche${consent[cle] ? ' on' : ''}`}><input type="checkbox" checked={consent[cle]} onChange={e => setConsent(c => ({ ...c, [cle]: e.target.checked }))} /><span>{texte}</span></label>
  )

  return (
    <div className="ptl-voile" role="dialog" aria-modal="true" aria-label="Signature du devis">
      <div className="ptl-feuille">
        <div className="ptl-feuille-tete"><h2>Signature du devis {devis.numero}</h2><button type="button" onClick={onFermer} aria-label="Fermer"><X size={18} /></button></div>
        <p className="ptl-aide">Montant : <b>{euro(devis.montant_ttc)} TTC</b>{devis.reste_a_charge != null && devis.aides.length ? ` · reste à charge ${euro(devis.reste_a_charge)}` : ''}</p>
        {coche('cgv', 'J’ai lu et j’accepte le devis et les conditions générales de vente.')}
        {devis.hors_etablissement && coche('bordereau', 'J’ai été informé(e) de mon droit de rétractation de 14 jours et du bordereau de rétractation figurant dans les conditions générales.')}
        {devis.hors_etablissement && coche('anticipee', 'Je demande que les travaux commencent avant la fin du délai de rétractation (facultatif).')}
        <label className="ptl-champ"><span>Nom et prénom du signataire</span><input value={nom} onChange={e => setNom(e.target.value)} autoComplete="name" /></label>
        <div className="ptl-champ"><span>Votre signature</span><div className="ptl-pad"><SignaturePad onChange={setImage} height={180} /></div></div>
        {!codeEnvoye ? (
          <button type="button" className="ptl-cta" disabled={!pret || occupe} onClick={() => void demanderCode()}>{occupe ? <Loader2 size={18} className="spin" /> : <Mail size={18} />} Recevoir mon code de signature{emailMasque ? ` (${emailMasque})` : ''}</button>
        ) : (
          <>
            <label className="ptl-champ"><span>Code reçu par e-mail à {codeEnvoye}</span><input className="ptl-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" /></label>
            <button type="button" className="ptl-cta" disabled={code.length !== 6 || !pret || occupe} onClick={() => void signer()}>{occupe ? <Loader2 size={18} className="spin" /> : <PenLine size={18} />} Signer le devis</button>
            <button type="button" className="ptl-lien" onClick={() => void demanderCode()} disabled={occupe}>Renvoyer un code</button>
          </>
        )}
        {erreur && <div className="ptl-erreur-ligne" role="alert">{erreur}</div>}
        <p className="ptl-note"><ShieldCheck size={14} /> Signature électronique sécurisée : votre identité est vérifiée par un code envoyé sur votre e-mail ; la date, l’heure et une empreinte du devis sont conservées.</p>
      </div>
    </div>
  )
}
