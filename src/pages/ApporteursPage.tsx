import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Search, Users, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import { Button } from '../components/ui/Button'

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

export function ApporteursPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Apporteur[]>([])
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [equipe, setEquipe] = useState<MembreEquipe[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ nom: '', contact: '', email: '', telephone: '', ville: '', statut: 'a_contacter', notes: '', organisation_id: '' })
  const [saving, setSaving] = useState(false)
  const canManage = Boolean(profile?.id)
  const isGlobalAdmin = profile?.role === 'admin'

  async function load() {
    setLoading(true); setError('')
    const [a, o, e] = await Promise.all([
      supabase.from('apporteurs_affaires').select('*').order('nom'),
      supabase.from('organisations').select('id,nom').eq('actif', true).order('nom'),
      profile?.id ? supabase.from('profiles').select('id,nom_complet,role,email').eq('manager_id', profile.id).order('nom_complet') : Promise.resolve({ data: [], error: null }),
    ])
    if (a.error) setError("Impossible de charger les apporteurs. Vérifiez que la migration multi-entreprise a été appliquée.")
    else setRows((a.data || []) as Apporteur[])
    setOrganisations((o.data || []) as Organisation[])
    setEquipe((e.data || []) as MembreEquipe[])
    setLoading(false)
  }
  useEffect(() => { if (profile?.id) void load() }, [profile?.id])
  const filtered = useMemo(() => rows.filter(r => `${r.nom} ${r.contact || ''} ${r.email || ''} ${r.ville || ''}`.toLowerCase().includes(search.toLowerCase())), [rows, search])
  function edit(row: Apporteur) {
    setEditing(row.id)
    setForm({ nom: row.nom, contact: row.contact || '', email: row.email || '', telephone: row.telephone || '', ville: row.ville || '', statut: row.statut, notes: row.notes || '', organisation_id: row.organisation_id })
    setSuccess('')
  }
  function reset() {
    setEditing(null)
    setForm({ nom: '', contact: '', email: '', telephone: '', ville: '', statut: 'a_contacter', notes: '', organisation_id: profile?.organisation_id || '' })
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!form.nom.trim()) { setError('Le nom de l’apporteur est obligatoire.'); return }
    const organisation_id = isGlobalAdmin ? form.organisation_id : profile?.organisation_id
    if (!organisation_id) { setError('L’organisation de cet apporteur est introuvable.'); return }
    setSaving(true)
    const payload = { organisation_id, nom: form.nom.trim(), contact: form.contact.trim() || null, email: form.email.trim() || null, telephone: form.telephone.trim() || null, ville: form.ville.trim() || null, statut: form.statut, notes: form.notes.trim() || null }
    const result = editing
      ? await supabase.from('apporteurs_affaires').update(payload).eq('id', editing)
      : await supabase.from('apporteurs_affaires').insert({ ...payload, created_by: profile?.id })
    setSaving(false)
    if (result.error) { setError(result.error.message); return }
    setSuccess(editing ? 'Apporteur mis à jour.' : 'Apporteur ajouté au réseau.')
    reset(); await load()
  }
  async function changeStatus(row: Apporteur, statut: Apporteur['statut']) {
    const { error } = await supabase.from('apporteurs_affaires').update({ statut }).eq('id', row.id)
    if (error) setError(error.message)
    else setRows(current => current.map(item => item.id === row.id ? { ...item, statut } : item))
  }

  return <div className="page">
    <div className="page-header">
      <div><h1 className="page-title">Mon réseau d’apporteurs</h1><p className="page-subtitle">Identifiez les personnes qui peuvent vous recommander des clients. Ce répertoire est distinct de celui des installateurs.</p></div>
      <div className="page-actions"><Button variant="primary" onClick={() => { reset(); setSuccess('') }}><Plus size={16}/> Nouvel apporteur</Button></div>
    </div>
    {equipe.length > 0 && <section className="card card-pad" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Mon équipe rattachée</h3>
      <p className="text-muted">Membres directement rattachés à votre compte dans l’organigramme. Cette liste est distincte du répertoire des apporteurs externes.</p>
      <div className="table-wrap"><table><thead><tr><th>Collaborateur</th><th>Rôle</th><th>E-mail</th></tr></thead><tbody>
        {equipe.map(m => <tr key={m.id}><td><strong>{m.nom_complet || 'Utilisateur sans nom'}</strong></td><td>{({ commercial: 'Commercial', apporteur: 'Apporteur d’affaires', teleconseiller: 'Téléconseiller', commercial_manager: 'Responsable commercial' } as Record<string,string>)[m.role] || m.role}</td><td>{m.email || '—'}</td></tr>)}
      </tbody></table></div>
    </section>}
    {error && <div className="status status-error" role="alert">{error}</div>}
    {success && <div className="status status-success" role="status">{success}</div>}
    <div className="toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un apporteur, une ville…"/></div><span className="text-muted">{filtered.length} apporteur(s)</span></div>
    {canManage && <form className="card card-pad" onSubmit={save} style={{ marginBottom: 16 }}>
      <h3>{editing ? 'Modifier un apporteur' : 'Ajouter un apporteur d’affaires'}</h3>
      <div className="form-grid">
        <label className="field"><span>Nom / société *</span><input required value={form.nom} onChange={e => setForm(v => ({...v, nom:e.target.value}))}/></label>
        <label className="field"><span>Contact</span><input value={form.contact} onChange={e => setForm(v => ({...v, contact:e.target.value}))}/></label>
        <label className="field"><span>E-mail</span><input type="email" value={form.email} onChange={e => setForm(v => ({...v, email:e.target.value}))}/></label>
        <label className="field"><span>Téléphone</span><input value={form.telephone} onChange={e => setForm(v => ({...v, telephone:e.target.value}))}/></label>
        <label className="field"><span>Ville</span><input value={form.ville} onChange={e => setForm(v => ({...v, ville:e.target.value}))}/></label>
        <label className="field"><span>Statut</span><select value={form.statut} onChange={e => setForm(v => ({...v, statut:e.target.value}))}>{STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
        {isGlobalAdmin && <label className="field"><span>Société</span><select required value={form.organisation_id} onChange={e => setForm(v => ({...v, organisation_id:e.target.value}))}><option value="">Choisir une société</option>{organisations.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}</select></label>}
        <label className="field" style={{gridColumn:'1 / -1'}}><span>Notes</span><textarea rows={2} value={form.notes} onChange={e => setForm(v => ({...v, notes:e.target.value}))}/></label>
      </div>
      <div className="page-actions" style={{marginTop:12}}><Button type="submit" variant="primary" disabled={saving}><Save size={15}/>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>{editing && <Button type="button" variant="secondary" onClick={reset}>Annuler</Button>}</div>
    </form>}
    {loading ? <div className="card card-pad">Chargement du réseau…</div> : filtered.length === 0 ? <div className="card card-pad" style={{textAlign:'center'}}><Users size={28}/><h3>Aucun apporteur enregistré</h3><p className="text-muted">Ajoutez les personnes ou sociétés susceptibles de vous apporter des prospects.</p></div> :
      <div className="card"><div className="table-wrap"><table><thead><tr><th>Apporteur</th><th>Contact</th><th>Coordonnées</th><th>Ville</th><th>Statut</th>{canManage && <th>Actions</th>}</tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td><strong>{row.nom}</strong>{row.notes && <div className="text-muted text-sm">{row.notes}</div>}</td><td>{row.contact || '—'}</td><td>{row.email || '—'}<div className="text-muted text-sm">{row.telephone || ''}</div></td><td>{row.ville || '—'}</td><td>{canManage ? <select aria-label={`Statut de ${row.nom}`} value={row.statut} onChange={e => void changeStatus(row, e.target.value as Apporteur['statut'])}>{STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select> : STATUTS.find(s => s.value === row.statut)?.label}</td>{canManage && <td><Button variant="secondary" onClick={() => edit(row)}>Modifier</Button></td>}</tr>)}</tbody></table></div></div>}
  </div>
}
