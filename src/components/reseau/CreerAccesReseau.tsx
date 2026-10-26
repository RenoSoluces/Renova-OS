import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Building2, Check, Copy, Eye, EyeOff, KeyRound, Link2, Loader2, Mail, MessageCircle, Share2, Smartphone, UserPlus, Users, Wand2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { LIBELLES_ACCES, genererMotDePasse, messageAcces, motDePasseValide, numeroWhatsApp, type TypeAcces } from '../../lib/reseau/acces'

interface AccesCree {
  type: TypeAcces
  prenom: string
  nomComplet: string
  email: string
  telephone: string
  motDePasse: string | null
  lien: string
  entreprise: string
  emailEnvoye: boolean
}

/** Création d'un accès (apporteur, partenaire, commercial) puis partage des identifiants en un geste. */
export function CreerAccesReseau({ onCree }: { onCree?: () => void }) {
  const { profile } = useAuth()
  const role = profile?.role || ''
  const estAdmin = role === 'admin'
  const typesPossibles: TypeAcces[] = estAdmin ? ['apporteur', 'partenaire', 'commercial'] : ['apporteur', 'commercial']
  const [type, setType] = useState<TypeAcces>('apporteur')
  const [societe, setSociete] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [mode, setMode] = useState<'mot_de_passe' | 'lien'>('mot_de_passe')
  const [motDePasse, setMotDePasse] = useState(() => genererMotDePasse())
  const [voir, setVoir] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [cree, setCree] = useState<AccesCree | null>(null)
  const [organisations, setOrganisations] = useState<{ id: string; nom: string; type: string }[]>([])

  useEffect(() => {
    if (!estAdmin) return
    supabase.from('organisations').select('id,nom,type').eq('actif', true).order('nom').then(({ data }) => setOrganisations((data || []) as any))
  }, [estAdmin])

  const peutCreer = ['admin', 'manager', 'commercial_manager', 'partner_admin', 'company_admin'].includes(role)
  const interne = useMemo(() => organisations.find(o => o.type === 'interne'), [organisations])
  if (!peutCreer) return null

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreur('')
    const nomComplet = `${prenom.trim()} ${nom.trim()}`.trim()
    if (!nomComplet) { setErreur('Renseignez au moins le prénom ou le nom.'); return }
    if (type === 'partenaire' && !societe.trim()) { setErreur('Renseignez le nom de la société partenaire.'); return }
    if (mode === 'mot_de_passe' && !motDePasseValide(motDePasse)) { setErreur('Mot de passe provisoire : 12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.'); return }
    setEnvoi(true)
    const orgExistante = type === 'partenaire' ? organisations.find(o => o.nom.trim().toLowerCase() === societe.trim().toLowerCase()) : null
    const { data, error } = await supabase.functions.invoke('invite-organisation-user', {
      body: {
        email: email.trim(), nom_complet: nomComplet, role: LIBELLES_ACCES[type].role, telephone: telephone.trim() || undefined,
        mode, mot_de_passe: mode === 'mot_de_passe' ? motDePasse : undefined,
        organisation_id: estAdmin ? (type === 'partenaire' ? orgExistante?.id || null : profile?.organisation_id || interne?.id || null) : undefined,
        organisation_nom: estAdmin && type === 'partenaire' && !orgExistante ? societe.trim() : undefined,
        manager_id: type === 'partenaire' ? null : profile?.id || null,
      },
    })
    setEnvoi(false)
    if (error || !data?.success) {
      let detail = data?.error as string | undefined
      try { const j = await (error as any)?.context?.json?.(); if (j?.error) detail = j.error } catch { /* ignoré */ }
      setErreur(detail || 'Création de l’accès impossible. Vérifiez l’adresse e-mail puis réessayez.')
      return
    }
    setCree({
      type, prenom: prenom.trim() || nomComplet.split(' ')[0], nomComplet, email: data.user.email, telephone: telephone.trim(),
      motDePasse: data.mode === 'mot_de_passe' ? motDePasse : null, lien: data.lien,
      entreprise: data.organisation?.nom || societe || 'Renova OS', emailEnvoye: !!data.email_envoye,
    })
    setPrenom(''); setNom(''); setEmail(''); setTelephone(''); setSociete(''); setMotDePasse(genererMotDePasse())
    onCree?.()
  }

  return (
    <section className="acc card">
      <div className="acc-tete">
        <span className="acc-icone"><UserPlus size={19} /></span>
        <div><h2>Créer un accès</h2><p>Le compte est créé tout de suite ; vous envoyez les identifiants par WhatsApp, SMS ou e-mail.</p></div>
      </div>
      <form onSubmit={creer} className="acc-form">
        <div className="acc-types" role="radiogroup" aria-label="Type d’accès">
          {typesPossibles.map(t => {
            const Icone = t === 'partenaire' ? Building2 : t === 'apporteur' ? Users : UserPlus
            return (
              <button key={t} type="button" role="radio" aria-checked={type === t} className={`acc-type${type === t ? ' on' : ''}`} onClick={() => setType(t)}>
                <Icone size={18} /><span><strong>{LIBELLES_ACCES[t].label}</strong><small>{LIBELLES_ACCES[t].description}</small></span>
              </button>
            )
          })}
        </div>

        <div className="acc-grille">
          {type === 'partenaire' && (
            <label className="field acc-large"><span className="field-label">Société partenaire *</span>
              <input list="acc-societes" value={societe} onChange={e => setSociete(e.target.value)} placeholder="Ex. Primy Solutions" />
              <datalist id="acc-societes">{organisations.filter(o => o.type === 'partenaire').map(o => <option key={o.id} value={o.nom} />)}</datalist>
            </label>
          )}
          <label className="field"><span className="field-label">Prénom</span><input value={prenom} onChange={e => setPrenom(e.target.value)} autoComplete="off" /></label>
          <label className="field"><span className="field-label">Nom</span><input value={nom} onChange={e => setNom(e.target.value)} autoComplete="off" /></label>
          <label className="field"><span className="field-label">E-mail * <small>(identifiant)</small></span><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@exemple.fr" autoComplete="off" /></label>
          <label className="field"><span className="field-label">Téléphone <small>(pour WhatsApp)</small></span><input type="tel" inputMode="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 12 34 56 78" autoComplete="off" /></label>
        </div>

        <div className="acc-mode">
          <div className="acc-mode-choix" role="radiogroup" aria-label="Mode d’accès">
            <button type="button" role="radio" aria-checked={mode === 'mot_de_passe'} className={mode === 'mot_de_passe' ? 'on' : ''} onClick={() => setMode('mot_de_passe')}><KeyRound size={15} /> Mot de passe provisoire</button>
            <button type="button" role="radio" aria-checked={mode === 'lien'} className={mode === 'lien' ? 'on' : ''} onClick={() => setMode('lien')}><Link2 size={15} /> Lien d’activation</button>
          </div>
          {mode === 'mot_de_passe' ? (
            <div className="acc-mdp">
              <div className="acc-mdp-champ">
                <input type={voir ? 'text' : 'password'} value={motDePasse} onChange={e => setMotDePasse(e.target.value)} aria-label="Mot de passe provisoire" spellCheck={false} autoComplete="new-password" />
                <button type="button" onClick={() => setVoir(v => !v)} aria-label={voir ? 'Masquer' : 'Afficher'}>{voir ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setMotDePasse(genererMotDePasse())}><Wand2 size={15} /> Générer</button>
              <small className={motDePasseValide(motDePasse) ? 'ok' : ''}>{motDePasseValide(motDePasse) ? <><Check size={13} /> Conforme · à changer à la première connexion</> : '12 car. min · 1 maj · 1 chiffre · 1 spécial'}</small>
            </div>
          ) : <p className="acc-note">La personne reçoit un lien personnel pour choisir elle-même son mot de passe (validité limitée).</p>}
        </div>

        {erreur && <div className="acc-erreur" role="alert">{erreur}</div>}
        <div className="acc-actions">
          <button type="submit" className="btn btn-primary btn-lg" disabled={envoi || !email.trim()}>{envoi ? <Loader2 size={17} className="spin" /> : <UserPlus size={17} />} Créer l’accès</button>
        </div>
      </form>

      {cree && <PartageAcces acces={cree} invitePar={profile?.nom_complet || 'Votre contact'} onFermer={() => setCree(null)} />}
    </section>
  )
}

function PartageAcces({ acces, invitePar, onFermer }: { acces: AccesCree; invitePar: string; onFermer: () => void }) {
  const initial = useMemo(() => messageAcces({ prenom: acces.prenom, type: acces.type, email: acces.email, motDePasse: acces.motDePasse, lien: acces.lien, entreprise: acces.entreprise, invitePar }), [acces, invitePar])
  const [message, setMessage] = useState(initial)
  const [copie, setCopie] = useState<string | null>(null)
  const partageNatif = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const wa = numeroWhatsApp(acces.telephone)

  async function copier(texte: string, quoi: string) {
    try { await navigator.clipboard.writeText(texte) } catch {
      const zone = document.createElement('textarea'); zone.value = texte; document.body.appendChild(zone); zone.select(); document.execCommand('copy'); zone.remove()
    }
    setCopie(quoi); window.setTimeout(() => setCopie(c => (c === quoi ? null : c)), 1800)
  }
  async function partager() {
    try { await navigator.share({ title: 'Votre accès Renova OS', text: message }) } catch { /* partage annulé */ }
  }

  return (
    <div className="acc-voile" role="dialog" aria-modal="true" aria-label="Partager l’accès" onClick={e => { if (e.target === e.currentTarget) onFermer() }}>
      <div className="acc-pop">
        <button type="button" className="acc-fermer" onClick={onFermer} aria-label="Fermer"><X size={18} /></button>
        <div className="acc-ok"><Check size={26} strokeWidth={2.6} /></div>
        <h3>Accès créé pour {acces.nomComplet}</h3>
        <p className="acc-sous">{LIBELLES_ACCES[acces.type].label} · {acces.entreprise}{acces.emailEnvoye ? ' · e-mail d’invitation envoyé' : ''}</p>

        <div className="acc-identifiants">
          <div><small>Identifiant</small><b>{acces.email}</b><button type="button" onClick={() => void copier(acces.email, 'email')} aria-label="Copier l’identifiant">{copie === 'email' ? <Check size={15} /> : <Copy size={15} />}</button></div>
          {acces.motDePasse && <div><small>Mot de passe provisoire</small><b className="mono">{acces.motDePasse}</b><button type="button" onClick={() => void copier(acces.motDePasse!, 'mdp')} aria-label="Copier le mot de passe">{copie === 'mdp' ? <Check size={15} /> : <Copy size={15} />}</button></div>}
          <div><small>{acces.motDePasse ? 'Adresse de connexion' : 'Lien d’activation'}</small><b className="lien">{acces.lien}</b><button type="button" onClick={() => void copier(acces.lien, 'lien')} aria-label="Copier le lien">{copie === 'lien' ? <Check size={15} /> : <Copy size={15} />}</button></div>
        </div>

        <label className="acc-message"><span>Message prêt à envoyer</span><textarea rows={8} value={message} onChange={e => setMessage(e.target.value)} /></label>

        <div className="acc-partage">
          {partageNatif && <button type="button" className="acc-btn principal" onClick={() => void partager()}><Share2 size={18} /> Partager…</button>}
          <a className="acc-btn whatsapp" href={`https://wa.me/${wa || ''}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} /> WhatsApp{wa ? '' : ' (choisir le contact)'}</a>
          {acces.telephone && <a className="acc-btn" href={`sms:${acces.telephone.replace(/\s+/g, '')}?&body=${encodeURIComponent(message)}`}><Smartphone size={18} /> SMS</a>}
          <a className="acc-btn" href={`mailto:${acces.email}?subject=${encodeURIComponent('Votre accès Renova OS')}&body=${encodeURIComponent(message)}`}><Mail size={18} /> E-mail</a>
          <button type="button" className="acc-btn" onClick={() => void copier(message, 'message')}>{copie === 'message' ? <Check size={18} /> : <Copy size={18} />} {copie === 'message' ? 'Copié' : 'Copier le message'}</button>
        </div>
        <p className="acc-note">Le mot de passe provisoire n’est affiché qu’ici : transmettez-le maintenant. Il devra être changé à la première connexion.</p>
      </div>
    </div>
  )
}
