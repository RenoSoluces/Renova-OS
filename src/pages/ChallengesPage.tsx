import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Award, Plus, Trophy, Save, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import { Button } from '../components/ui/Button'

type Organisation = { id: string; nom: string }
type Member = { id: string; nom_complet: string; role: string; organisation_id: string | null }
type Challenge = { id: string; organisation_id: string; nom: string; description: string | null; date_debut: string; date_fin: string; objectif: string | null; statut: string }
type Score = { id: string; challenge_id: string; participant_id: string; points: number; commentaire: string | null; updated_at: string }
const dateToday = () => new Date().toISOString().slice(0, 10)
const canManageRole = (role?: string) => ['admin','manager','partner_admin','company_admin'].includes(role || '')

export function ChallengesPage() {
  const { profile } = useAuth()
  const isGlobalAdmin = profile?.role === 'admin'
  const canManage = canManageRole(profile?.role)
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [participantId, setParticipantId] = useState('')
  const [points, setPoints] = useState('0')
  const [commentaire, setCommentaire] = useState('')
  const [scoreEditingId, setScoreEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nom: '', description: '', date_debut: dateToday(), date_fin: dateToday(), objectif: '', organisation_id: '' })

  async function loadBase() {
    setLoading(true); setError('')
    const [o, m, c] = await Promise.all([
      supabase.from('organisations').select('id,nom').eq('actif', true).order('nom'),
      supabase.from('profiles').select('id,nom_complet,role,organisation_id').order('nom_complet'),
      supabase.from('challenges').select('*').order('date_debut', { ascending: false }),
    ])
    if (o.error || m.error || c.error) setError("Impossible de charger les challenges. Vérifiez que la migration multi-entreprise est appliquée.")
    setOrganisations((o.data || []) as Organisation[])
    setMembers((m.data || []) as Member[])
    const next = (c.data || []) as Challenge[]
    setChallenges(next)
    setSelectedId(current => next.some(item => item.id === current) ? current : next[0]?.id || '')
    setLoading(false)
  }
  async function loadScores(challengeId: string) {
    if (!challengeId) { setScores([]); return }
    const { data, error } = await supabase.from('challenge_scores').select('*').eq('challenge_id', challengeId).order('points', { ascending: false })
    if (error) { setError(error.message); setScores([]); return }
    setScores((data || []) as Score[])
  }
  useEffect(() => { void loadBase() }, [])
  useEffect(() => { void loadScores(selectedId) }, [selectedId])
  const selected = challenges.find(c => c.id === selectedId) || null
  const participants = useMemo(() => {
    if (!selected) return []
    return members.filter(m => m.organisation_id === selected.organisation_id && m.role !== 'admin')
  }, [members, selected])
  const ranked = useMemo(() => [...scores].sort((a,b) => Number(b.points)-Number(a.points)), [scores])
  const memberName = (id: string) => members.find(m => m.id === id)?.nom_complet || 'Compte indisponible'
  const organisationName = (id: string) => organisations.find(o => o.id === id)?.nom || 'Société'

  function startCreate() {
    setForm({ nom: '', description: '', date_debut: dateToday(), date_fin: dateToday(), objectif: '', organisation_id: profile?.organisation_id || '' })
    setShowCreate(true); setError(''); setSuccess('')
  }
  async function createChallenge(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!form.nom.trim()) { setError('Le nom du challenge est obligatoire.'); return }
    const organisation_id = isGlobalAdmin ? form.organisation_id : profile?.organisation_id
    if (!organisation_id) { setError('Choisissez une société pour ce challenge.'); return }
    setSaving(true)
    const { data, error } = await supabase.from('challenges').insert({
      organisation_id, nom: form.nom.trim(), description: form.description.trim() || null,
      date_debut: form.date_debut, date_fin: form.date_fin, objectif: form.objectif.trim() || null,
      statut: form.date_fin < dateToday() ? 'termine' : form.date_debut > dateToday() ? 'a_venir' : 'en_cours',
      created_by: profile?.id,
    }).select('*').single()
    setSaving(false)
    if (error || !data) { setError(error?.message || 'Création impossible.'); return }
    setChallenges(current => [data as Challenge, ...current])
    setSelectedId(data.id); setShowCreate(false); setSuccess('Challenge créé pour la société sélectionnée.')
  }
  async function saveScore(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!selected || !participantId) { setError('Sélectionnez un participant.'); return }
    const amount = Number(points)
    if (!Number.isFinite(amount) || amount < 0) { setError('Le score doit être un nombre positif ou nul.'); return }
    setSaving(true)
    const { error } = await supabase.from('challenge_scores').upsert({
      challenge_id: selected.id, participant_id: participantId, points: amount,
      commentaire: commentaire.trim() || null, updated_by: profile?.id, updated_at: new Date().toISOString(),
    }, { onConflict: 'challenge_id,participant_id' })
    setSaving(false)
    if (error) { setError(error.message); return }
    setSuccess('Classement mis à jour.')
    setScoreEditingId(null); setParticipantId(''); setPoints('0'); setCommentaire('')
    await loadScores(selected.id)
  }
  function editScore(score: Score) {
    setScoreEditingId(score.id); setParticipantId(score.participant_id); setPoints(String(score.points)); setCommentaire(score.commentaire || '')
  }
  async function refresh() { await loadBase(); if (selectedId) await loadScores(selectedId) }

  return <div className="page">
    <div className="page-header"><div><h1 className="page-title">Challenges & classements</h1><p className="page-subtitle">Créez des challenges indépendants par société. Les participants et scores restent isolés dans leur organisation.</p></div><div className="page-actions"><Button variant="secondary" onClick={() => void refresh()}><RefreshCw size={15}/> Actualiser</Button>{canManage && <Button variant="primary" onClick={startCreate}><Plus size={16}/> Créer un challenge</Button>}</div></div>
    {error && <div className="status status-error" role="alert">{error}</div>}{success && <div className="status status-success" role="status">{success}</div>}
    {showCreate && <form className="card card-pad" onSubmit={createChallenge} style={{marginBottom:16}}><h3>Nouveau challenge</h3><div className="form-grid">
      <label className="field"><span>Nom du challenge *</span><input required value={form.nom} onChange={e=>setForm(v=>({...v,nom:e.target.value}))} placeholder="Ex. Sprint commercial de novembre"/></label>
      <label className="field"><span>Objectif / indicateur</span><input value={form.objectif} onChange={e=>setForm(v=>({...v,objectif:e.target.value}))} placeholder="Ex. dossiers installés, points, CA…"/></label>
      <label className="field"><span>Date de début</span><input type="date" required value={form.date_debut} onChange={e=>setForm(v=>({...v,date_debut:e.target.value}))}/></label>
      <label className="field"><span>Date de fin</span><input type="date" required min={form.date_debut} value={form.date_fin} onChange={e=>setForm(v=>({...v,date_fin:e.target.value}))}/></label>
      {isGlobalAdmin && <label className="field"><span>Société concernée *</span><select required value={form.organisation_id} onChange={e=>setForm(v=>({...v,organisation_id:e.target.value}))}><option value="">Choisir une société</option>{organisations.map(o=><option key={o.id} value={o.id}>{o.nom}</option>)}</select></label>}
      <label className="field" style={{gridColumn:'1 / -1'}}><span>Description et règles</span><textarea rows={2} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))}/></label>
    </div><div className="page-actions" style={{marginTop:12}}><Button type="submit" variant="primary" disabled={saving}><Save size={15}/>{saving?'Création…':'Créer le challenge'}</Button><Button type="button" variant="secondary" onClick={()=>setShowCreate(false)}>Annuler</Button></div></form>}
    {loading ? <div className="card card-pad">Chargement des challenges…</div> : challenges.length === 0 ? <div className="card card-pad" style={{textAlign:'center'}}><Award size={30}/><h3>Aucun challenge pour le moment</h3><p className="text-muted">Créez un challenge pour une société afin de lancer son classement.</p></div> : <div className="grid-2" style={{alignItems:'start',gap:16}}>
      <div className="card card-pad"><h3>Challenges</h3><div style={{display:'grid',gap:8}}>{challenges.map(ch=><button key={ch.id} className="card card-pad" style={{textAlign:'left',border:ch.id===selectedId?'2px solid var(--c-primary,#2563eb)':undefined,cursor:'pointer'}} onClick={()=>setSelectedId(ch.id)}><strong>{ch.nom}</strong><div className="text-sm text-muted">{organisationName(ch.organisation_id)} · {ch.date_debut} → {ch.date_fin}</div><div className="text-sm">{ch.objectif || ch.description || 'Classement par points'}</div></button>)}</div></div>
      {selected && <div className="card card-pad"><div style={{display:'flex',alignItems:'start',gap:10}}><Trophy size={24}/><div><h2 style={{margin:0}}>{selected.nom}</h2><p className="text-muted">{organisationName(selected.organisation_id)} · {selected.date_debut} au {selected.date_fin}</p>{selected.description && <p>{selected.description}</p>}</div></div>
        <h3 style={{marginTop:18}}>Classement</h3>{ranked.length===0 ? <p className="text-muted">Aucun score. Ajoutez les participants et leurs points ci-dessous.</p> : <div className="table-wrap"><table><thead><tr><th>Rang</th><th>Participant</th><th>Points</th>{canManage && <th>Action</th>}</tr></thead><tbody>{ranked.map((s,index)=><tr key={s.id}><td><strong>{index+1}</strong></td><td>{memberName(s.participant_id)}{s.commentaire && <div className="text-sm text-muted">{s.commentaire}</div>}</td><td><strong>{Number(s.points).toLocaleString('fr-FR')}</strong></td>{canManage && <td><Button variant="secondary" onClick={()=>editScore(s)}>Modifier</Button></td>}</tr>)}</tbody></table></div>}
        {canManage && <form onSubmit={saveScore} style={{marginTop:18}}><h3>{scoreEditingId?'Modifier un score':'Ajouter un participant au classement'}</h3><div className="form-grid"><label className="field"><span>Participant</span><select required value={participantId} onChange={e=>setParticipantId(e.target.value)}><option value="">Choisir un membre de cette société</option>{participants.map(m=><option key={m.id} value={m.id}>{m.nom_complet} — {m.role}</option>)}</select></label><label className="field"><span>Points</span><input required type="number" min="0" step="0.01" value={points} onChange={e=>setPoints(e.target.value)}/></label><label className="field" style={{gridColumn:'1 / -1'}}><span>Commentaire</span><input value={commentaire} onChange={e=>setCommentaire(e.target.value)} placeholder="Résultat, bonus, remarque…"/></label></div><div className="page-actions" style={{marginTop:10}}><Button type="submit" variant="primary" disabled={saving}><Save size={15}/>{saving?'Enregistrement…':'Enregistrer le score'}</Button>{scoreEditingId && <Button type="button" variant="secondary" onClick={()=>{setScoreEditingId(null);setParticipantId('');setPoints('0');setCommentaire('')}}>Annuler</Button>}</div></form>}
      </div>}
    </div>}
  </div>
}
