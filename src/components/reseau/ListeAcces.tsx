import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Building2, CheckCircle2, Clock, KeyRound, Loader2, Send, Users, UserRound, Wand2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { genererMotDePasse, motDePasseValide, type TypeAcces } from '../../lib/reseau/acces'
import { PartageAcces, type AccesCree } from './CreerAccesReseau'
import { PartageMessage } from '../partage/PartageMessage'

export interface AccesReseau {
  id: string
  nom_complet: string | null
  email: string | null
  telephone: string | null
  role: string
  manager_id: string | null
  organisation_id: string | null
  organisation_nom: string | null
  organisation_type: string | null
  cree_le: string
  derniere_connexion: string | null
  active: boolean
}

const LIBELLE_ROLE: Record<string, string> = {
  apporteur: 'Apporteur', partner_admin: 'Partenaire', company_admin: 'Partenaire', commercial: 'Commercial',
  commercial_manager: 'Resp. commercial', manager: 'Manager', teleconseiller: 'Téléconseiller',
}
export const typeAccesDuRole = (role: string): TypeAcces =>
  role === 'apporteur' ? 'apporteur' : role === 'partner_admin' || role === 'company_admin' ? 'partenaire' : 'commercial'

const date = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const APP = 'https://renova-os.netlify.app/'

/** Accès déjà créés : état de connexion, renvoi des identifiants à ceux qui ne se sont jamais connectés. */
export function ListeAcces({ actualisation }: { actualisation: number }) {
  const { profile } = useAuth()
  const [acces, setAcces] = useState<AccesReseau[]>([])
  const [chargement, setChargement] = useState(true)
  const [cible, setCible] = useState<AccesReseau | null>(null)
  const [lienPour, setLienPour] = useState<AccesReseau | null>(null)
  const [partage, setPartage] = useState<AccesCree | null>(null)

  const charger = useCallback(async () => {
    const { data } = await supabase.rpc('acces_reseau')
    setAcces((data || []) as AccesReseau[])
    setChargement(false)
  }, [])
  useEffect(() => { void charger() }, [charger, actualisation])

  if (!chargement && acces.length === 0) return null
  const enAttente = acces.filter(a => !a.active).length

  return (
    <section className="card acl" aria-label="Accès créés">
      <div className="acl-tete">
        <h2>Accès créés <span>{acces.length}</span></h2>
        {enAttente > 0 && <p><Clock size={14} /> {enAttente} jamais connecté{enAttente > 1 ? 's' : ''} : renvoyez-leur un accès en un geste.</p>}
      </div>
      {chargement ? <p className="text-muted acl-vide"><Loader2 size={15} className="spin" /> Chargement…</p> : (
        <ul className="acl-liste">
          {acces.map(a => {
            const type = typeAccesDuRole(a.role)
            const Icone = type === 'partenaire' ? Building2 : type === 'apporteur' ? Users : UserRound
            return (
              <li key={a.id}>
                <span className={`acl-icone ${type}`}><Icone size={17} /></span>
                <span className="acl-qui">
                  <b>{a.organisation_type === 'partenaire' && a.organisation_nom ? a.organisation_nom : a.nom_complet || a.email}</b>
                  <small>{[a.organisation_type === 'partenaire' ? a.nom_complet : null, a.email].filter(Boolean).join(' · ')}</small>
                </span>
                <span className="acl-role">{LIBELLE_ROLE[a.role] || a.role}</span>
                <span className={`acl-etat ${a.active ? 'ok' : 'attente'}`}>
                  {a.active ? <><CheckCircle2 size={13} /> Connecté le {date(a.derniere_connexion!)}</> : <><Clock size={13} /> Jamais connecté</>}
                </span>
                {a.active
                  ? <button type="button" className="btn btn-secondary btn-sm acl-action" onClick={() => setLienPour(a)}><Send size={14} /> Envoyer le lien</button>
                  : <button type="button" className="btn btn-primary btn-sm acl-action" onClick={() => setCible(a)}><KeyRound size={14} /> Renvoyer l’accès</button>}
              </li>
            )
          })}
        </ul>
      )}

      {cible && <ModaleRenvoi acces={cible} onFermer={() => setCible(null)} onRenvoye={r => { setCible(null); setPartage(r); void charger() }} />}
      {partage && <PartageAcces acces={partage} invitePar={profile?.nom_complet || 'Votre contact'} onFermer={() => setPartage(null)} />}
      {lienPour && (
        <PartageMessage
          titre={`Lien de connexion — ${lienPour.nom_complet || lienPour.email}`}
          sousTitre="Compte déjà activé : la personne se connecte avec son propre mot de passe."
          telephone={lienPour.telephone} email={lienPour.email} sujet="Votre accès Renova OS"
          message={`Bonjour${lienPour.nom_complet ? ` ${lienPour.nom_complet.split(' ')[0]}` : ''} 👋\n\nVoici le lien pour vous connecter à Renova OS :\n🔗 ${APP}\n👤 Identifiant : ${lienPour.email}\n\nMot de passe oublié ? Cliquez sur « Mot de passe oublié » sur l’écran de connexion.\n\n${profile?.nom_complet || ''}`.trim()}
          onFermer={() => setLienPour(null)}
        />
      )}
    </section>
  )
}

function ModaleRenvoi({ acces, onFermer, onRenvoye }: { acces: AccesReseau; onFermer: () => void; onRenvoye: (a: AccesCree) => void }) {
  const [motDePasse, setMotDePasse] = useState(() => genererMotDePasse())
  const [telephone, setTelephone] = useState(acces.telephone || '')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const type = typeAccesDuRole(acces.role)
  const nomComplet = acces.nom_complet || acces.email || ''

  async function renvoyer(e: FormEvent) {
    e.preventDefault()
    if (!motDePasseValide(motDePasse)) { setErreur('Mot de passe provisoire : 12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.'); return }
    setEnvoi(true); setErreur('')
    const { data, error } = await supabase.functions.invoke('invite-organisation-user', {
      body: {
        email: acces.email, nom_complet: nomComplet, role: acces.role, telephone: telephone.trim() || undefined,
        mode: 'mot_de_passe', mot_de_passe: motDePasse,
        organisation_id: acces.organisation_id, manager_id: acces.manager_id,
      },
    })
    setEnvoi(false)
    if (error || !data?.success) {
      let detail = data?.error as string | undefined
      try { const j = await (error as any)?.context?.json?.(); if (j?.error) detail = j.error } catch { /* ignoré */ }
      setErreur(detail || 'Renvoi impossible. Réessayez dans un instant.')
      return
    }
    onRenvoye({
      type, prenom: nomComplet.split(' ')[0], nomComplet, email: data.user.email, telephone: telephone.trim(),
      motDePasse, lien: data.lien, entreprise: data.organisation?.nom || acces.organisation_nom || 'Renova OS',
      emailEnvoye: !!data.email_envoye, renvoi: true,
    })
  }

  return (
    <div className="acc-voile" role="dialog" aria-modal="true" aria-label="Renvoyer l’accès" onClick={e => { if (e.target === e.currentTarget) onFermer() }}>
      <form className="acc-pop acl-modale" onSubmit={renvoyer}>
        <button type="button" className="acc-fermer" onClick={onFermer} aria-label="Fermer"><X size={18} /></button>
        <h3>Renvoyer l’accès</h3>
        <p className="acc-sous">{[acces.organisation_type === 'partenaire' ? acces.organisation_nom : null, nomComplet, acces.email].filter(Boolean).join(' · ')}</p>
        <p className="acl-explication">Un nouveau mot de passe provisoire remplace l’ancienne invitation. Vous l’envoyez ensuite par WhatsApp, SMS ou e-mail.</p>
        <label className="field"><span className="field-label">Nouveau mot de passe provisoire</span>
          <div className="acl-mdp">
            <input value={motDePasse} onChange={e => setMotDePasse(e.target.value)} spellCheck={false} autoComplete="new-password" className="mono" />
            <button type="button" className="btn btn-secondary" onClick={() => setMotDePasse(genererMotDePasse())}><Wand2 size={15} /> Générer</button>
          </div>
        </label>
        <label className="field"><span className="field-label">Téléphone <small>(pour WhatsApp)</small></span>
          <input type="tel" inputMode="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 12 34 56 78" />
        </label>
        {erreur && <div className="acc-erreur" role="alert">{erreur}</div>}
        <button type="submit" className="btn btn-primary btn-lg acl-valider" disabled={envoi}>{envoi ? <Loader2 size={17} className="spin" /> : <KeyRound size={17} />} Générer et partager l’accès</button>
      </form>
    </div>
  )
}
