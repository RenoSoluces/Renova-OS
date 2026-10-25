import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Search, Users, Save, Mail, Phone, MapPin, Building2, CheckCircle2, Clock3, UserRound, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import { Button } from '../components/ui/Button'
import '../styles/apporteurs.css'

type Apporteur = {
  id: string; organisation_id: string; nom: string; contact: string | null
  email: string | null; telephone: string | null; ville: string | null
  statut: 'a_contacter' | 'contacte' | 'actif' | 'inactif'; notes: string | null
}
type Organisation = { id: string; nom: string }
type MembreEquipe = { id: string; nom_complet: string; role: string; email?: string | null }
const STATUTS = [
  { value: 'a_contacter', label: 'À contacter' },
  { value: 'contacte', label: 'Contacté' },
  { value: 'actif', label: 'Actif' },
  { value: 'inactif', label: 'Inactif' },
] as const
const ROLE_LABELS: Record<string, string> = {
  commercial: 'Commercial', apporteur: 'Apporteur d’affaires',
  teleconseiller: 'Téléconseiller', commercial_manager: 'Responsable commercial',
  manager: 'Responsable', partner: 'Partenaire',
}
const INITIAL_FORM = { nom: '', contact: '', email: '', telephone: '', ville: '', statut: 'a_contacter', notes: '', organisation_id: '' }

export function ApporteursPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Apporteur[]>([])
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [equipe, setEquipe] = useState<MembreEquipe[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'tous' | Apporteur['statut']>('tous')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const canManage = ['admin', 'manager', 'partner'].includes(profile?.role || '')
  const isGlobalAdmin = profile?.role === 'admin'

  async function load() {
    setLoading(true)
    setError('')
    const [a, o, e] = await Promise.all([
      supabase.from('apporteurs_affaires').select('*').order('nom'),
      supabase.from('organisations').select('id,nom').eq('actif', true).order('nom'),
      profile?.id
        ? supabase.from('profiles').select('id,nom_complet,role,email').eq('manager_id', profile.id).order('nom_complet')
        : Promise.resolve({ data: [], error: null }),
    ])
    if (a.error) setError("Impossible de charger les apporteurs. Vérifiez les droits d’accès à votre réseau.")
    else setRows((a.data || []) as Apporteur[])
    if (o.error) setError(current => current || "Impossible de charger la liste des sociétés.")
    if (e.error) {
      setError(current => current || "Impossible de charger l’équipe rattachée.")
      setEquipe([])
    } else setEquipe((e.data || []) as MembreEquipe[])
    setOrganisations((o.data || []) as Organisation[])
    setLoading(false)
  }
  useEffect(() => { if (profile?.id) void load() }, [profile?.id])

  const filtered = useMemo(() => rows.filter(r =>
    (statusFilter === 'tous' || r.statut === statusFilter) &&
    `${r.nom} ${r.contact || ''} ${r.email || ''} ${r.ville || ''} ${r.telephone || ''}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [rows, search, statusFilter])
  const stats = useMemo(() => ({
    total: rows.length,
    actifs: rows.filter(r => r.statut === 'actif').length,
    aContacter: rows.filter(r => r.statut === 'a_contacter').length,
    villes: new Set(rows.map(r => r.ville?.trim()).filter(Boolean)).size,
  }), [rows])

  function edit(row: Apporteur) {
    setEditing(row.id)
    setForm({ nom: row.nom, contact: row.contact || '', email: row.email || '', telephone: row.telephone || '', ville: row.ville || '', statut: row.statut, notes: row.notes || '', organisation_id: row.organisation_id })
    setFormOpen(true)
    setSuccess('')
    setError('')
  }
  function reset() {
    setEditing(null)
    setForm({ ...INITIAL_FORM, organisation_id: profile?.organisation_id || '' })
    setFormOpen(false)
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!form.nom.trim()) { setError('Le nom de l’apporteur est obligatoire.'); return }
    const organisation_id = isGlobalAdmin ? form.organisation_id : profile?.organisation_id
    if (!organisation_id) { setError('L’organisation de cet apporteur est introuvable.'); return }
    setSaving(true)
    const payload = {
      organisation_id, nom: form.nom.trim(), contact: form.contact.trim() || null,
      email: form.email.trim() || null, telephone: form.telephone.trim() || null,
      ville: form.ville.trim() || null, statut: form.statut, notes: form.notes.trim() || null,
    }
    const result = editing
      ? await supabase.from('apporteurs_affaires').update(payload).eq('id', editing)
      : await supabase.from('apporteurs_affaires').insert({ ...payload, created_by: profile?.id })
    setSaving(false)
    if (result.error) { setError(result.error.message); return }
    setSuccess(editing ? 'Apporteur mis à jour.' : 'Apporteur ajouté au réseau.')
    reset()
    await load()
  }
  async function changeStatus(row: Apporteur, statut: Apporteur['statut']) {
    const { error } = await supabase.from('apporteurs_affaires').update({ statut }).eq('id', row.id)
    if (error) setError(error.message)
    else setRows(current => current.map(item => item.id === row.id ? { ...item, statut } : item))
  }

  return <div className="page apporteurs-page">
    <header className="apporteurs-hero">
      <div className="apporteurs-hero-copy">
        <span className="apporteurs-eyebrow"><Users size={14}/> DÉVELOPPEMENT COMMERCIAL</span>
        <h1 className="page-title">Mon réseau</h1>
        <p className="page-subtitle">Centralisez les personnes qui recommandent des clients et suivez les prochaines actions à mener.</p>
      </div>
      {canManage && <Button variant="primary" onClick={() => { if (formOpen && !editing) reset(); else { reset(); setFormOpen(true) } setError(''); setSuccess('') }}><Plus size={17}/> Nouvel apporteur</Button>}
    </header>

    <section className="apporteurs-stats" aria-label="Synthèse du réseau">
      <article className="apporteur-stat"><span className="apporteur-stat-icon"><Users size={18}/></span><div><small>Apporteurs référencés</small><strong>{stats.total}</strong></div></article>
      <article className="apporteur-stat"><span className="apporteur-stat-icon is-green"><CheckCircle2 size={18}/></span><div><small>Actifs</small><strong>{stats.actifs}</strong></div></article>
      <article className="apporteur-stat"><span className="apporteur-stat-icon is-amber"><Clock3 size={18}/></span><div><small>À contacter</small><strong>{stats.aContacter}</strong></div></article>
      <article className="apporteur-stat"><span className="apporteur-stat-icon is-blue"><MapPin size={18}/></span><div><small>Villes couvertes</small><strong>{stats.villes}</strong></div></article>
    </section>

    <section className="apporteurs-team card">
      <div className="apporteurs-section-head">
        <div className="apporteurs-section-icon"><Building2 size={18}/></div>
        <div><h2>Mon équipe rattachée</h2><p>Collaborateurs directement rattachés à votre compte, distincts des apporteurs externes.</p></div>
        <span className="apporteurs-count">{equipe.length}</span>
      </div>
      {equipe.length > 0 ? <div className="apporteurs-team-grid">
        {equipe.map(m => <div className="apporteur-team-member" key={m.id}>
          <span className="apporteur-team-avatar">{(m.nom_complet || '?').split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase()}</span>
          <div className="apporteur-team-info"><strong>{m.nom_complet || 'Utilisateur sans nom'}</strong><span>{ROLE_LABELS[m.role] || m.role}</span>{m.email && <small>{m.email}</small>}</div>
        </div>)}
      </div> : <p className="apporteurs-team-empty">{loading ? 'Chargement de votre équipe…' : 'Aucun collaborateur directement rattaché à votre compte.'}</p>}
    </section>

    {error && <div className="status status-error apporteurs-feedback" role="alert">{error}</div>}
    {success && <div className="status status-success apporteurs-feedback" role="status">{success}</div>}

    {canManage && formOpen && <form className="card apporteurs-form" onSubmit={save}>
      <div className="apporteurs-section-head">
        <div className="apporteurs-section-icon"><UserRound size={18}/></div>
        <div><h2>{editing ? 'Modifier la fiche' : 'Nouvel apporteur'}</h2><p>Renseignez les coordonnées utiles pour le suivi commercial.</p></div>
        <button className="apporteurs-close" type="button" aria-label="Fermer le formulaire" onClick={reset}><X size={18}/></button>
      </div>
      <div className="form-grid apporteurs-form-grid">
        <label className="field"><span>Nom / société *</span><input required value={form.nom} onChange={e => setForm(v => ({...v, nom:e.target.value}))} placeholder="Nom de la personne ou de la société"/></label>
        <label className="field"><span>Contact principal</span><input value={form.contact} onChange={e => setForm(v => ({...v, contact:e.target.value}))} placeholder="Prénom et nom"/></label>
        <label className="field"><span>E-mail</span><input type="email" value={form.email} onChange={e => setForm(v => ({...v, email:e.target.value}))} placeholder="contact@exemple.fr"/></label>
        <label className="field"><span>Téléphone</span><input value={form.telephone} onChange={e => setForm(v => ({...v, telephone:e.target.value}))} placeholder="06…"/></label>
        <label className="field"><span>Ville</span><input value={form.ville} onChange={e => setForm(v => ({...v, ville:e.target.value}))} placeholder="Ville"/></label>
        <label className="field"><span>Statut du réseau</span><select value={form.statut} onChange={e => setForm(v => ({...v, statut:e.target.value}))}>{STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
        {isGlobalAdmin && <label className="field"><span>Société de rattachement</span><select required value={form.organisation_id} onChange={e => setForm(v => ({...v, organisation_id:e.target.value}))}><option value="">Choisir une société</option>{organisations.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}</select></label>}
        <label className="field apporteurs-notes-field"><span>Notes de suivi</span><textarea rows={2} value={form.notes} onChange={e => setForm(v => ({...v, notes:e.target.value}))} placeholder="Origine du contact, spécialité, prochaine action…"/></label>
      </div>
      <div className="apporteurs-form-actions"><Button type="button" variant="secondary" onClick={reset}>Annuler</Button><Button type="submit" variant="primary" disabled={saving}><Save size={15}/>{saving ? 'Enregistrement…' : 'Enregistrer l’apporteur'}</Button></div>
    </form>}

    <section className="apporteurs-directory">
      <div className="apporteurs-directory-head">
        <div><h2>Apporteurs d’affaires</h2><p>Votre carnet de contacts et de partenaires prescripteurs.</p></div>
        <div className="apporteurs-directory-tools">
          <div className="apporteurs-status-filters" aria-label="Filtrer par statut">
            {[{ value: 'tous', label: 'Tous' }, ...STATUTS].map(option => <button key={option.value} type="button" className={statusFilter === option.value ? 'active' : ''} aria-pressed={statusFilter === option.value} onClick={() => setStatusFilter(option.value as typeof statusFilter)}>{option.label}</button>)}
          </div>
          <div className="apporteurs-search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, e-mail, téléphone, ville…"/><span>{filtered.length}</span></div>
        </div>
      </div>
      {loading ? <div className="card apporteurs-empty">Chargement du réseau…</div> : filtered.length === 0 ? <div className="card apporteurs-empty"><Users size={30}/><h3>{search || statusFilter !== 'tous' ? 'Aucun résultat' : 'Votre réseau commence ici'}</h3><p>{search || statusFilter !== 'tous' ? 'Modifiez le texte recherché ou choisissez un autre statut.' : 'Ajoutez les personnes ou sociétés susceptibles de vous apporter des prospects.'}</p>{canManage && !search && <Button variant="primary" onClick={() => setFormOpen(true)}><Plus size={16}/> Ajouter un apporteur</Button>}</div> :
        <div className="apporteurs-cards">
          {filtered.map(row => <article className="apporteur-card" key={row.id}>
            <div className="apporteur-card-top">
              <span className="apporteur-card-avatar">{row.nom.split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase()}</span>
              <div className="apporteur-card-title"><h3>{row.nom}</h3>{row.contact && <p>{row.contact}</p>}</div>
              <span className={`apporteur-status status-${row.statut}`}>{STATUTS.find(s => s.value === row.statut)?.label || row.statut}</span>
            </div>
            <div className="apporteur-card-details">
              {row.email ? <a href={`mailto:${row.email}`}><Mail size={15}/><span>{row.email}</span></a> : <span className="is-missing"><Mail size={15}/>E-mail non renseigné</span>}
              {row.telephone ? <a href={`tel:${row.telephone.replace(/\s+/g, '')}`}><Phone size={15}/><span>{row.telephone}</span></a> : <span className="is-missing"><Phone size={15}/>Téléphone non renseigné</span>}
              <span><MapPin size={15}/>{row.ville || 'Ville non renseignée'}</span>
            </div>
            {row.notes && <p className="apporteur-card-notes">{row.notes}</p>}
            <footer className="apporteur-card-footer">
              {canManage ? <><label className="apporteur-status-select"><span>Statut</span><select aria-label={`Statut de ${row.nom}`} value={row.statut} onChange={e => void changeStatus(row, e.target.value as Apporteur['statut'])}>{STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label><Button variant="secondary" size="sm" onClick={() => edit(row)}>Modifier</Button></> : <span className="apporteur-card-readonly">Fiche réseau</span>}
            </footer>
          </article>)}
        </div>}
    </section>
  </div>
}
