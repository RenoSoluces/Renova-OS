import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from 'react'
import { Building2, Network, UserRound, RefreshCw, Clock, KeyRound, Wand2, Eye, EyeOff, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import { genererMotDePasse, motDePasseValide } from '../lib/reseau/acces'
import { PartageAcces, type AccesCree } from '../components/reseau/CreerAccesReseau'
import { ModaleRenvoi, typeAccesDuRole, type AccesReseau } from '../components/reseau/ListeAcces'
import '../styles/apporteurs.css'

type Organisation = { id: string; nom: string; type: string }
type Member = { id: string; nom_complet: string; role: string; organisation_id: string | null; manager_id: string | null }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Grand Admin',
  manager: 'Manager',
  commercial_manager: 'Responsable commercial',
  partner_admin: 'Dirigeant',
  company_admin: 'Direction',
  commercial: 'Commercial',
  apporteur: "Apporteur d'affaires",
  teleconseiller: 'Téléconseiller',
}

export function OrganisationPage() {
  const { profile } = useAuth()
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('commercial')
  const [inviteOrganisationId, setInviteOrganisationId] = useState('')
  const [inviteManagerId, setInviteManagerId] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const [motDePasse, setMotDePasse] = useState(() => genererMotDePasse())
  const [voirMdp, setVoirMdp] = useState(true)
  const [inviteTelephone, setInviteTelephone] = useState('')
  const [partage, setPartage] = useState<AccesCree | null>(null)
  const [acces, setAcces] = useState<Map<string, AccesReseau>>(new Map())
  const [renvoiPour, setRenvoiPour] = useState<AccesReseau | null>(null)
  const [newOrganisationName, setNewOrganisationName] = useState('')
  const [creatingOrganisation, setCreatingOrganisation] = useState(false)
  const [organisationMessage, setOrganisationMessage] = useState('')
  const [hasDirectReports, setHasDirectReports] = useState(false)
  const isGlobalAdmin = profile?.role === 'admin'

  async function load() {
    setLoading(true)
    setError('')
    const [orgResult, memberResult, accesResult] = await Promise.all([
      supabase.from('organisations').select('id, nom, type').eq('actif', true).order('nom'),
      supabase.from('profiles').select('id, nom_complet, role, organisation_id, manager_id').order('nom_complet'),
      supabase.rpc('acces_reseau'),
    ])
    setAcces(new Map(((accesResult.data || []) as AccesReseau[]).map(a => [a.id, a])))
    if (orgResult.error || memberResult.error) {
      setError("Impossible de charger l'organigramme. Vérifiez les droits de votre compte.")
      setOrganisations([])
      setMembers([])
      setHasDirectReports(false)
    } else {
      const nextOrganisations = (orgResult.data || []) as Organisation[]
      setOrganisations(nextOrganisations)
      const nextMembers = (memberResult.data || []) as Member[]
      setMembers(nextMembers)
      setHasDirectReports(nextMembers.some(member => member.manager_id === profile?.id))
      if (!inviteOrganisationId && isGlobalAdmin && nextOrganisations.length > 0) {
        setInviteOrganisationId(nextOrganisations[0].id)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.id && profile.role !== 'admin') setInviteManagerId(profile.id)
    void load()
  }, [profile?.id, profile?.role])

  const membersByOrg = useMemo(() => {
    const result: Record<string, Member[]> = {}
    members.forEach(member => {
      const key = member.organisation_id || 'unassigned'
      ;(result[key] ||= []).push(member)
    })
    return result
  }, [members])

  const selectedInviteOrganisation = organisations.find(org => org.id === inviteOrganisationId)
  const isCompanyLeader = ['partner_admin', 'company_admin'].includes(profile?.role || '')
  const isManager = ['manager', 'commercial_manager'].includes(profile?.role || '')
  const roleOptions = isGlobalAdmin
    ? [
        { value: 'admin', label: 'Grand Admin' },
        { value: 'manager', label: 'Manager interne' },
        { value: 'commercial_manager', label: 'Responsable commercial' },
        { value: 'partner_admin', label: 'Dirigeant (autre entreprise)' },
        { value: 'company_admin', label: 'Direction' },
        { value: 'commercial', label: 'Commercial' },
        { value: 'apporteur', label: "Apporteur d'affaires" },
        { value: 'teleconseiller', label: 'Téléconseiller' },
      ].filter(role => selectedInviteOrganisation?.type === 'interne'
        ? !['partner_admin', 'company_admin'].includes(role.value)
        : !['admin', 'manager'].includes(role.value))
    : isCompanyLeader
      ? [
          { value: 'commercial_manager', label: 'Responsable commercial' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'apporteur', label: "Apporteur d'affaires" },
          { value: 'teleconseiller', label: 'Téléconseiller' },
        ]
      : [
          { value: 'commercial', label: 'Commercial' },
          { value: 'apporteur', label: "Apporteur d'affaires" },
          { value: 'teleconseiller', label: 'Téléconseiller' },
        ]

  async function createOrganisation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nom = newOrganisationName.trim()
    if (!nom || !isGlobalAdmin) return
    setCreatingOrganisation(true)
    setOrganisationMessage('')
    const { data, error: createError } = await supabase
      .from('organisations')
      .insert({ nom, type: 'partenaire', actif: true })
      .select('id, nom, type')
      .single()
    if (createError || !data) {
      setOrganisationMessage(createError?.code === '23505'
        ? 'Une organisation porte déjà ce nom.'
        : 'Impossible de créer le partenaire. Vérifiez les droits administrateur.')
    } else {
      setOrganisations(current => [...current, data as Organisation].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))
      setInviteOrganisationId(data.id)
      setInviteRole('partner_admin')
      setNewOrganisationName('')
      setOrganisationMessage('Organisation « ' + data.nom + ' » créée. Vous pouvez maintenant inviter son dirigeant.')
    }
    setCreatingOrganisation(false)
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!motDePasseValide(motDePasse)) { setInviteMessage('Mot de passe provisoire : 12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.'); return }
    setInviteLoading(true)
    setInviteMessage('')
    const nomInvite = inviteName.trim()
    const { data, error: inviteError } = await supabase.functions.invoke('invite-organisation-user', {
      body: {
        email: inviteEmail.trim(),
        nom_complet: nomInvite,
        role: inviteRole,
        organisation_id: isGlobalAdmin ? inviteOrganisationId : profile?.organisation_id,
        manager_id: inviteManagerId || null,
        mode: 'mot_de_passe',
        mot_de_passe: motDePasse,
        telephone: inviteTelephone.trim() || undefined,
      },
    })
    if (inviteError || !data?.success) {
      let detail = data?.error as string | undefined
      const contexte = (inviteError as { context?: Response } | null)?.context
      if (!detail && contexte && typeof contexte.json === 'function') {
        detail = await contexte.json().then((b: { error?: string }) => b?.error).catch(() => undefined)
      }
      setInviteMessage(detail || "Invitation impossible. Vérifiez l'adresse e-mail puis réessayez.")
    } else {
      setPartage({
        type: typeAccesDuRole(inviteRole), prenom: nomInvite.split(' ')[0], nomComplet: nomInvite, email: data.user.email,
        telephone: inviteTelephone.trim(), motDePasse, lien: data.lien, entreprise: data.organisation?.nom || 'Renova OS',
        emailEnvoye: !!data.email_envoye, renvoi: !!data.renvoi,
        autreEntreprise: !!data.organisation?.id && data.organisation.id !== profile?.organisation_id,
      })
      setInviteName('')
      setInviteEmail('')
      setInviteTelephone('')
      setMotDePasse(genererMotDePasse())
      await load()
    }
    setInviteLoading(false)
  }

  function renderMember(member: Member, seen = new Set<string>()): ReactNode {
    if (seen.has(member.id)) return null
    const nextSeen = new Set(seen)
    nextSeen.add(member.id)
    const etat = acces.get(member.id)
    const children = (membersByOrg[member.organisation_id || 'unassigned'] || [])
      .filter(candidate => candidate.manager_id === member.id)
    return (
      <li key={member.id} style={{ listStyle: 'none', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border, #d9e0e7)', borderRadius: 10, padding: '10px 12px', background: 'var(--surface, #fff)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--primary-50, #eef5f1)', color: 'var(--primary-700, #245b45)', flexShrink: 0 }}><UserRound size={17} /></div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{member.nom_complet || 'Utilisateur sans nom'}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{ROLE_LABELS[member.role] || member.role}</div>
          </div>
          {etat && !etat.active && <span className="org-attente"><Clock size={13} /> Jamais connecté</span>}
          {etat && !etat.active && peutRenvoyer(member) && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setRenvoiPour(etat)}><KeyRound size={14} /> Renvoyer l’accès</button>
          )}
        </div>
        {children.length > 0 && (
          <ul style={{ margin: '0 0 0 18px', padding: '0 0 0 14px', borderLeft: '1px solid var(--border, #d9e0e7)' }}>
            {children.map(child => renderMember(child, nextSeen))}
          </ul>
        )}
      </li>
    )
  }

  function peutRenvoyer(member: Member) {
    if (member.id === profile?.id) return false
    if (isGlobalAdmin) return true
    if (isCompanyLeader) return member.organisation_id === profile?.organisation_id
    return member.manager_id === profile?.id
  }

  if (!['admin', 'manager', 'partner_admin', 'company_admin'].includes(profile?.role || '') && !hasDirectReports) {
    return <div className="page"><div className="card card-pad">L'organigramme est réservé à la direction et aux managers autorisés.</div></div>
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}><Network size={23} /> Organigramme</h1>
          <p className="text-muted" style={{ margin: '6px 0 0' }}>Structure dynamique des entreprises, responsables et équipes visibles selon vos droits.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Actualiser</button>
      </div>
      {error && <div className="card card-pad" role="alert">{error}</div>}
      {!loading && isGlobalAdmin && (
        <section className="card card-pad" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 17 }}>Créer une organisation partenaire</h2>
          <p className="text-muted" style={{ margin: '0 0 14px', fontSize: 13 }}>Créez d’abord l’entreprise, puis invitez son dirigeant et rattachez ses commerciaux ou apporteurs.</p>
          <form onSubmit={createOrganisation} style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, flex: '1 1 260px' }}>
              Nom du partenaire
              <input className="pipeline-inline-input" value={newOrganisationName} onChange={e => setNewOrganisationName(e.target.value)} required maxLength={160} placeholder="Ex. Nom de l’entreprise partenaire" />
            </label>
            <button className="btn btn-primary" type="submit" disabled={creatingOrganisation || !newOrganisationName.trim()}>
              {creatingOrganisation ? 'Création…' : 'Créer le partenaire'}
            </button>
          </form>
          {organisationMessage && <p className="text-muted" role="status" style={{ margin: '10px 0 0', fontSize: 13 }}>{organisationMessage}</p>}
        </section>
      )}
      {!loading && (
        <section className="card card-pad" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 17 }}>Inviter un membre</h2>
          <p className="text-muted" style={{ margin: '0 0 14px', fontSize: 13 }}>Le rôle et l'entreprise sont attribués côté serveur ; un membre ne peut pas choisir ses propres droits.</p>
          <form onSubmit={inviteMember} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>
              Nom complet
              <input className="pipeline-inline-input" value={inviteName} onChange={e => setInviteName(e.target.value)} required maxLength={120} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>
              E-mail professionnel
              <input className="pipeline-inline-input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required maxLength={254} />
            </label>
            {isGlobalAdmin && (
              <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>
                Entreprise
                <select className="pipeline-inline-input" value={inviteOrganisationId} onChange={e => { setInviteOrganisationId(e.target.value); setInviteManagerId('') }} required>
                  <option value="">Choisir une entreprise…</option>
                  {organisations.map(org => <option key={org.id} value={org.id}>{org.nom}</option>)}
                </select>
              </label>
            )}
            <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>
              Rôle
              <select className="pipeline-inline-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)} required>
                {roleOptions.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>
              Responsable hiérarchique
              <select className="pipeline-inline-input" value={inviteManagerId} onChange={e => setInviteManagerId(e.target.value)}>
                {isGlobalAdmin && <option value="">Aucun (direction)</option>}
                {members
                  .filter(member => member.organisation_id === (isGlobalAdmin ? inviteOrganisationId : profile?.organisation_id))
                  .filter(member => ['admin', 'manager', 'commercial_manager', 'partner_admin', 'company_admin'].includes(member.role))
                  .map(member => <option key={member.id} value={member.id}>{member.nom_complet} — {ROLE_LABELS[member.role] || member.role}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>
              Téléphone (pour WhatsApp)
              <input className="pipeline-inline-input" type="tel" inputMode="tel" value={inviteTelephone} onChange={e => setInviteTelephone(e.target.value)} placeholder="06 12 34 56 78" maxLength={30} />
            </label>
            <label className="org-mdp-champ" style={{ display: 'grid', gap: 5, fontSize: 12 }}>
              Mot de passe provisoire
              <span className="org-mdp">
                <input className="pipeline-inline-input" type={voirMdp ? 'text' : 'password'} value={motDePasse} onChange={e => setMotDePasse(e.target.value)} spellCheck={false} autoComplete="new-password" />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVoirMdp(v => !v)} aria-label={voirMdp ? 'Masquer' : 'Afficher'}>{voirMdp ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMotDePasse(genererMotDePasse())}><Wand2 size={14} /> Générer</button>
              </span>
              <small className={motDePasseValide(motDePasse) ? 'org-mdp-ok' : 'text-muted'}>{motDePasseValide(motDePasse) ? <><Check size={12} /> Conforme · à changer à la première connexion</> : '12 car. min · 1 maj · 1 chiffre · 1 spécial'}</small>
            </label>
            <div>
              <button className="btn btn-primary" type="submit" disabled={inviteLoading || (isGlobalAdmin && !inviteOrganisationId) || !roleOptions.some(role => role.value === inviteRole)}>
                {inviteLoading ? 'Création…' : 'Créer et partager l’accès'}
              </button>
            </div>
          </form>
          {inviteMessage && <p className="text-muted" role="status" style={{ margin: '10px 0 0', fontSize: 13 }}>{inviteMessage}</p>}
        </section>
      )}
      {loading ? <div className="card card-pad">Chargement de l'organigramme…</div> : (
        <div style={{ display: 'grid', gap: 16 }}>
          {organisations.map(org => {
            const orgMembers = membersByOrg[org.id] || []
            const roots = orgMembers.filter(member => !member.manager_id || !orgMembers.some(candidate => candidate.id === member.manager_id))
            const visibleRoots = roots.length ? roots : orgMembers
            return (
              <section key={org.id} className="card card-pad">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--border, #d9e0e7)' }}>
                  <Building2 size={19} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17 }}>{org.nom}</h2>
                    <div className="text-muted" style={{ fontSize: 12 }}>{isGlobalAdmin ? `${org.type === 'interne' ? 'Entreprise interne' : 'Entreprise distincte'} · ` : ''}{orgMembers.length} membre{orgMembers.length > 1 ? 's' : ''} visible{orgMembers.length > 1 ? 's' : ''}</div>
                  </div>
                </div>
                {orgMembers.length === 0 ? <p className="text-muted">Aucun membre visible pour cette entreprise.</p> : (
                  <ul style={{ padding: 0, margin: '4px 0 0' }}>
                    {visibleRoots.map(member => renderMember(member))}
                  </ul>
                )}
              </section>
            )
          })}
          {organisations.length === 0 && <div className="card card-pad">Aucune entreprise visible pour ce compte.</div>}
        </div>
      )}
      {renvoiPour && <ModaleRenvoi acces={renvoiPour} onFermer={() => setRenvoiPour(null)} onRenvoye={r => { setRenvoiPour(null); setPartage(r); void load() }} />}
      {partage && <PartageAcces acces={partage} invitePar={profile?.nom_complet || 'Votre contact'} onFermer={() => setPartage(null)} />}
    </div>
  )
}
