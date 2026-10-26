import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, CheckCircle2, ChevronRight, Clock3, Gift, Loader2, Plus, RefreshCw, Send, Share2, Trophy, UserPlus, Wallet, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import type { PageKey } from '../types'

interface Recommandation {
  id: string; client: string; ville: string | null; statut: string; etape: string
  cree_le: string; derniere_activite: string | null; montant_signe_ht: number | null; commission: number | null; commission_statut: string | null
}

const ETAPES = ['Reçu', 'Contacté', 'Visite technique', 'Devis envoyé', 'Signé', 'Installé']
const PROJETS = ['Pompe à chaleur', 'Isolation', 'Panneaux solaires', 'Fenêtres', 'Chauffe-eau', 'Climatisation', 'Rénovation globale', 'Autre']
const RAPPELS = ['Le matin', 'Le midi', 'L’après-midi', 'Le soir', 'Le samedi']
const euro = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const VIDE = { prenom: '', nom: '', telephone: '', email: '', adresse: '', code_postal: '', ville: '', commentaire: '' }

/** Espace de l'apporteur d'affaires : recommander un client en 30 secondes et suivre ses recommandations. */
export function EspaceApporteurPage({ onNavigate }: { onNavigate?: (p: PageKey) => void }) {
  const { profile } = useAuth()
  const [liste, setListe] = useState<Recommandation[]>([])
  const [chargement, setChargement] = useState(true)
  const [formulaire, setFormulaire] = useState(false)
  const [champs, setChamps] = useState(VIDE)
  const [projets, setProjets] = useState<string[]>([])
  const [rappel, setRappel] = useState('')
  const [accord, setAccord] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')

  async function charger() {
    setChargement(true)
    const { data } = await supabase.rpc('mes_recommandations')
    setListe((data || []) as Recommandation[])
    setChargement(false)
  }
  useEffect(() => { void charger() }, [])

  const stats = useMemo(() => {
    const signees = liste.filter(r => r.etape === 'Signé' || r.etape === 'Installé')
    return {
      total: liste.length,
      enCours: liste.filter(r => !['Signé', 'Installé', 'Sans suite'].includes(r.etape)).length,
      signees: signees.length,
      commissions: liste.reduce((s, r) => s + (Number(r.commission) || 0), 0),
    }
  }, [liste])

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    setErreur('')
    if (!accord) { setErreur('Confirmez que le client est d’accord pour être contacté.'); return }
    setEnvoi(true)
    const { error } = await supabase.rpc('recommander_client', {
      p_prenom: champs.prenom, p_nom: champs.nom, p_telephone: champs.telephone, p_email: champs.email, p_adresse: champs.adresse,
      p_code_postal: champs.code_postal, p_ville: champs.ville, p_besoins: projets, p_commentaire: champs.commentaire, p_rappel: rappel,
    })
    setEnvoi(false)
    if (error) { setErreur(error.message || 'Envoi impossible, réessayez.'); return }
    setSucces(`Merci ! ${champs.prenom || champs.nom} sera rappelé(e) rapidement. Vous suivez l’avancement ci-dessous.`)
    setChamps(VIDE); setProjets([]); setRappel(''); setAccord(false); setFormulaire(false)
    void charger()
  }

  async function partagerApp() {
    const texte = `Je travaille avec ${profile?.nom_complet ? `l’équipe de ${profile.nom_complet.split(' ')[0]}` : 'une entreprise'} pour la rénovation énergétique (pompe à chaleur, isolation, solaire…). Si un de vos proches a un projet, dites-le-moi : étude et aides à la clé !`
    if (navigator.share) { try { await navigator.share({ text: texte }) } catch { /* annulé */ } }
    else window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, '_blank', 'noopener')
  }

  const maj = (k: keyof typeof VIDE, v: string) => setChamps(c => ({ ...c, [k]: v }))
  const prenom = (profile?.nom_complet || '').split(' ')[0]

  return (
    <div className="page eap">
      <header className="eap-hero">
        <div>
          <span className="eap-sur">Espace apporteur</span>
          <h1>Bonjour {prenom || 'et bienvenue'} 👋</h1>
          <p>Recommandez un proche, un voisin ou un client : nous le rappelons, et vous suivez chaque étape jusqu’à votre commission.</p>
        </div>
        <div className="eap-hero-actions">
          <button type="button" className="eap-cta" onClick={() => { setFormulaire(true); setSucces('') }}><UserPlus size={20} /> Recommander un client</button>
          <button type="button" className="eap-lien" onClick={() => void partagerApp()}><Share2 size={16} /> Message à envoyer à mes contacts</button>
        </div>
      </header>

      {succes && <div className="eap-succes" role="status"><CheckCircle2 size={18} /> {succes}</div>}

      <section className="eap-stats">
        <div><Send size={18} /><strong>{stats.total}</strong><small>Recommandations</small></div>
        <div><Clock3 size={18} /><strong>{stats.enCours}</strong><small>En cours</small></div>
        <div><Trophy size={18} /><strong>{stats.signees}</strong><small>Signées</small></div>
        <button type="button" onClick={() => onNavigate?.('commissions')}><Wallet size={18} /><strong>{euro(stats.commissions)}</strong><small>Commissions <ChevronRight size={13} /></small></button>
      </section>

      <section className="eap-liste">
        <div className="eap-liste-tete"><h2>Mes recommandations</h2><button type="button" onClick={() => void charger()} aria-label="Actualiser"><RefreshCw size={16} className={chargement ? 'spin' : ''} /></button></div>
        {!chargement && liste.length === 0 && (
          <div className="eap-vide"><Gift size={30} /><strong>Votre première recommandation vous attend</strong><span>Un voisin qui se plaint de sa facture de chauffage ? Un ami qui veut des panneaux solaires ? Touchez « Recommander un client ».</span></div>
        )}
        {liste.map(r => {
          const index = Math.max(0, ETAPES.indexOf(r.etape))
          const sansSuite = r.etape === 'Sans suite'
          return (
            <article key={r.id} className={`eap-reco${sansSuite ? ' perdue' : ''}`}>
              <div className="eap-reco-tete">
                <div><strong>{r.client}</strong><small>{r.ville || '—'} · recommandé le {new Date(r.cree_le).toLocaleDateString('fr-FR')}</small></div>
                <span className={`eap-badge e-${index}`}>{r.etape}</span>
              </div>
              {!sansSuite && (
                <ol className="eap-etapes" aria-label="Avancement">
                  {ETAPES.map((e, i) => <li key={e} className={i < index ? 'fait' : i === index ? 'actuel' : ''} title={e}><span>{i < index ? <Check size={11} /> : null}</span><em>{e}</em></li>)}
                </ol>
              )}
              {(r.montant_signe_ht || r.commission) ? (
                <div className="eap-reco-pied">
                  {r.montant_signe_ht ? <span>Projet signé : <b>{euro(Number(r.montant_signe_ht))} HT</b></span> : null}
                  {r.commission ? <span className="com">Votre commission : <b>{euro(Number(r.commission))}</b>{r.commission_statut ? ` · ${r.commission_statut.replace(/_/g, ' ')}` : ''}</span> : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </section>

      {formulaire && (
        <div className="eap-voile" role="dialog" aria-modal="true" aria-label="Recommander un client" onClick={e => { if (e.target === e.currentTarget) setFormulaire(false) }}>
          <form className="eap-feuille" onSubmit={envoyer}>
            <div className="eap-feuille-tete"><h2><UserPlus size={20} /> Recommander un client</h2><button type="button" onClick={() => setFormulaire(false)} aria-label="Fermer"><X size={18} /></button></div>
            <div className="eap-grille">
              <label><span>Prénom</span><input value={champs.prenom} onChange={e => maj('prenom', e.target.value)} autoComplete="off" /></label>
              <label><span>Nom *</span><input value={champs.nom} onChange={e => maj('nom', e.target.value)} autoComplete="off" /></label>
              <label><span>Téléphone *</span><input type="tel" inputMode="tel" value={champs.telephone} onChange={e => maj('telephone', e.target.value)} placeholder="06…" /></label>
              <label><span>E-mail</span><input type="email" value={champs.email} onChange={e => maj('email', e.target.value)} /></label>
              <label className="large"><span>Adresse</span><input value={champs.adresse} onChange={e => maj('adresse', e.target.value)} /></label>
              <label><span>Code postal</span><input inputMode="numeric" value={champs.code_postal} onChange={e => maj('code_postal', e.target.value)} /></label>
              <label><span>Ville</span><input value={champs.ville} onChange={e => maj('ville', e.target.value)} /></label>
            </div>
            <div className="eap-choix"><span>Son projet</span><div>{PROJETS.map(p => <button key={p} type="button" className={projets.includes(p) ? 'on' : ''} aria-pressed={projets.includes(p)} onClick={() => setProjets(x => x.includes(p) ? x.filter(y => y !== p) : [...x, p])}>{p}</button>)}</div></div>
            <div className="eap-choix"><span>Meilleur moment pour le rappeler</span><div>{RAPPELS.map(p => <button key={p} type="button" className={rappel === p ? 'on' : ''} aria-pressed={rappel === p} onClick={() => setRappel(r => r === p ? '' : p)}>{p}</button>)}</div></div>
            <label className="eap-commentaire"><span>Un mot sur la situation (facultatif)</span><textarea rows={3} value={champs.commentaire} onChange={e => maj('commentaire', e.target.value)} placeholder="Chaudière fioul en panne, maison de 120 m²…" /></label>
            <label className="eap-accord"><input type="checkbox" checked={accord} onChange={e => setAccord(e.target.checked)} /><span>Le client est d’accord pour être contacté au sujet de son projet.</span></label>
            {erreur && <div className="eap-erreur" role="alert">{erreur}</div>}
            <button type="submit" className="eap-cta plein" disabled={envoi}>{envoi ? <Loader2 size={18} className="spin" /> : <Send size={18} />} Envoyer la recommandation</button>
          </form>
        </div>
      )}
      {!formulaire && <button type="button" className="eap-fab" onClick={() => { setFormulaire(true); setSucces('') }} aria-label="Recommander un client"><Plus size={24} /></button>}
    </div>
  )
}
