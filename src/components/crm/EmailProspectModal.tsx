import { useMemo, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'

export interface ProspectEmail { id: string; email?: string | null; prenom?: string | null; nom?: string | null; civilite?: string | null; raison_sociale?: string | null }

interface Modele { cle: string; libelle: string; sujet: string; corps: string }

/** Modèles de suivi : {appel} (M. Dupont / Marie Dupont) {prenom} {nom} {commercial} {telephone} {date} sont remplacés à l'ouverture. */
const MODELES: Modele[] = [
  { cle: 'suite_rdv', libelle: 'Suite à notre rendez-vous', sujet: 'Suite à notre rendez-vous',
    corps: `Bonjour {appel},

Merci pour le temps que vous m'avez accordé. Comme convenu, je reviens vers vous avec les prochaines étapes de votre projet de rénovation.

N'hésitez pas à me contacter pour toute question.

Bien cordialement,` },
  { cle: 'relance_devis', libelle: 'Relance de devis', sujet: 'Votre devis de rénovation énergétique',
    corps: `Bonjour {appel},

Je me permets de revenir vers vous au sujet du devis que je vous ai transmis. Avez-vous pu en prendre connaissance ?

Je reste à votre disposition pour en parler, ajuster la proposition ou répondre à vos questions sur les aides.

Bien cordialement,` },
  { cle: 'confirmation_rdv', libelle: 'Confirmation de rendez-vous', sujet: 'Confirmation de notre rendez-vous',
    corps: `Bonjour {appel},

Je vous confirme notre rendez-vous le {date}.

En cas d'empêchement, vous pouvez me joindre au {telephone}.

Bien cordialement,` },
  { cle: 'documents', libelle: 'Documents à fournir', sujet: 'Documents pour votre dossier d’aides',
    corps: `Bonjour {appel},

Pour constituer votre dossier d'aides, merci de me transmettre :
- votre dernier avis d'imposition (toutes les pages) ;
- votre dernière taxe foncière ;
- une facture d'énergie récente.

Vous pouvez simplement répondre à cet e-mail avec les documents en pièce jointe.

Bien cordialement,` },
  { cle: 'libre', libelle: 'Message libre', sujet: '', corps: `Bonjour {appel},

` },
]

interface Props {
  prospect: ProspectEmail | null
  onClose: () => void
  onEnvoye?: () => void
}

export function EmailProspectModal({ prospect, onClose, onEnvoye }: Props) {
  const { profile } = useAuth()
  const remplir = useMemo(() => (texte: string) => texte
    .replace(/\{prenom\}/g, prospect?.prenom || '')
    .replace(/\{nom\}/g, prospect?.nom || prospect?.raison_sociale || '')
    .replace(/\{appel\}/g, prospect?.civilite && prospect?.nom ? `${prospect.civilite} ${prospect.nom}` : (`${prospect?.prenom || ''} ${prospect?.nom || ''}`.trim() || prospect?.raison_sociale || 'Madame, Monsieur'))
    .replace(/\{commercial\}/g, profile?.nom_complet || '')
    .replace(/\{telephone\}/g, profile?.telephone || '')
    .replace(/\{date\}/g, '…')
    .replace(/ {2,}/g, ' '), [prospect, profile])
  const [cle, setCle] = useState(MODELES[0].cle)
  const [sujet, setSujet] = useState(() => remplir(MODELES[0].sujet))
  const [corps, setCorps] = useState(() => remplir(MODELES[0].corps))
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  if (!prospect) return null

  function choisir(c: string) {
    const m = MODELES.find(x => x.cle === c) || MODELES[0]
    setCle(m.cle); setSujet(remplir(m.sujet)); setCorps(remplir(m.corps)); setErreur(''); setInfo('')
  }

  async function journaliser(envoiMode: string) {
    await supabase.from('interactions').insert({
      prospect_id: prospect!.id, type: 'email', contenu: `E-mail préparé : ${sujet}\n\n${corps}`.slice(0, 4000),
      auteur: profile?.nom_complet || null, meta: { canal: 'email', modele: cle, envoi: envoiMode },
    })
  }

  function ouvrirMessagerie() {
    const lien = `mailto:${prospect!.email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`
    window.location.href = lien
    void journaliser('messagerie')
    setInfo('Votre messagerie s’est ouverte avec le message pré-rempli. L’échange est noté dans l’historique du prospect.')
    onEnvoye?.()
  }

  async function envoyer() {
    if (!sujet.trim() || !corps.trim()) { setErreur('Renseignez l’objet et le message.'); return }
    setEnvoi(true); setErreur(''); setInfo('')
    const { data, error } = await supabase.functions.invoke('envoyer-email-prospect', {
      body: { prospect_id: prospect!.id, sujet, message: corps, modele: cle },
    })
    setEnvoi(false)
    if (!error && data?.success) { onEnvoye?.(); onClose(); return }
    let detail: { error?: string; non_configure?: boolean } | null = data || null
    const contexte = (error as { context?: Response } | null)?.context
    if (contexte && typeof contexte.json === 'function') detail = await contexte.json().catch(() => detail)
    if (detail?.non_configure) { ouvrirMessagerie(); return }
    setErreur(detail?.error || 'Envoi impossible pour le moment.')
  }

  const nom = prospect.raison_sociale || `${prospect.prenom || ''} ${prospect.nom || ''}`.trim()
  return (
    <Modal open onClose={onClose} title={`E-mail à ${nom}`} width={620}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={ouvrirMessagerie}>Ouvrir dans ma messagerie</button>
        <button type="button" className="btn btn-primary" onClick={() => void envoyer()} disabled={envoi}>
          {envoi ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Envoyer
        </button>
      </>}>
      <div className="email-prospect">
        <div className="email-modeles" role="radiogroup" aria-label="Modèle">
          {MODELES.map(m => <button key={m.cle} type="button" role="radio" aria-checked={cle === m.cle} className={cle === m.cle ? 'on' : ''} onClick={() => choisir(m.cle)}>{m.libelle}</button>)}
        </div>
        <div className="email-champ"><span>À</span><b>{prospect.email}</b></div>
        <label className="email-champ"><span>Objet</span><input value={sujet} onChange={e => setSujet(e.target.value)} /></label>
        <textarea className="email-corps" value={corps} onChange={e => setCorps(e.target.value)} rows={12} />
        <p className="email-aide">{profile?.telephone ? 'Votre nom et votre téléphone sont ajoutés' : 'Votre nom est ajouté'} en signature. Les réponses du client arrivent dans votre boîte e-mail, et l’envoi est noté dans l’historique du prospect.</p>
        {erreur && <div className="login-error">{erreur}</div>}
        {info && <div className="login-info">{info}</div>}
      </div>
    </Modal>
  )
}
