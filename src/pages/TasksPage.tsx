import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, Circle, Phone, Mail, Calendar, RefreshCw, MapPin, MessageCircle, Navigation, UserRoundX, PhoneOff, PhoneCall, Clock3, StickyNote } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'
import { normalizeStatut } from '../lib/crm/constants'
import { supabase } from '../lib/supabase'
import type { CrmTask, Prospect } from '../types'
import { Button } from '../components/ui/Button'

type TaskRow = Omit<CrmTask, 'prospect'> & { prospect?: Prospect | null }
type PlanningRow = {
  id: string
  titre: string
  date: string
  heure: string | null
  type: string | null
  prospect_id: string | null
  adresse: string | null
  notes: string | null
  prospect?: Prospect | null
}
type Relance = Prospect & { derniere?: { created_at: string; contenu: string | null; type: string } | null; joursSansContact: number }
type DerniereInteraction = { prospect_id: string; created_at: string; contenu: string | null; type: string }
/** Étapes avant signature : un prospect y reste « à relancer » s'il n'a eu aucun contact depuis SEUIL_RELANCE jours. */
const ETAPES_A_RELANCER = ['nouveau', 'qualifie', 'visite planifiee', 'visite faite', 'dossier']
const SEUIL_RELANCE = 14
const RESULTATS_APPEL = [
  { value: 'Joint', icon: PhoneCall },
  { value: 'Pas de réponse', icon: PhoneOff },
  { value: 'Rappeler plus tard', icon: Clock3 },
]
const joursDepuis = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
const TYPE_ICON: Record<string, any> = { appel: Phone, email: Mail, rdv: Calendar, relance: RefreshCw, autre: Circle }
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sans échéance'
const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const adresseProspect = (p?: Prospect | null) => {
  if (!p) return ''
  const raw = p as Prospect & { adresse_rue?: string; code_postal?: string }
  return [raw.adresse || raw.adresse_rue, raw.code_postal, raw.ville].filter(Boolean).join(', ')
}
const whatsappNumber = (phone?: string | null) => {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('0') ? `33${digits.slice(1)}` : digits
}

export function TasksPage(): JSX.Element {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [events, setEvents] = useState<PlanningRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [error, setError] = useState('')
  const { profile } = useAuth()
  const [relances, setRelances] = useState<Relance[]>([])
  const [dernieres, setDernieres] = useState<Map<string, DerniereInteraction>>(new Map())
  const [appelOuvert, setAppelOuvert] = useState<string | null>(null)
  const [mesRdvSeulement, setMesRdvSeulement] = useState(true)

  async function load() {
    setLoading(true)
    setError('')
    const [taskResult, eventResult] = await Promise.all([
      supabase.from('tasks').select('id,prospect_id,titre,description,type,priorite,assigne,due_at,done,done_at,created_at').order('done', { ascending: true }).order('due_at', { ascending: true, nullsFirst: false }),
      supabase.from('planning_events').select('id,titre,date,heure,type,prospect_id,adresse,notes,user_id').gte('date', todayLocal()).order('date', { ascending: true }).order('heure', { ascending: true }).limit(40),
    ])
    // Mes prospects avant signature, pour repérer ceux qui n'ont plus de nouvelles.
    const mesProspects = profile?.id
      ? await supabase.from('prospects').select('id,prenom,nom,telephone,email,adresse,adresse_rue,code_postal,ville,raison_sociale,statut,categorie_mpr,created_at').eq('commercial_id', profile.id)
      : { data: [], error: null }
    if (mesProspects.error) setError(prev => [prev, `Prospects : ${mesProspects.error.message}`].filter(Boolean).join(' · '))
    if (taskResult.error) setError(`Tâches : ${taskResult.error.message}`)
    if (eventResult.error) setError(prev => [prev, `Agenda : ${eventResult.error.message}`].filter(Boolean).join(' · '))
    const taskRows = (taskResult.data || []) as CrmTask[]
    const eventRows = (eventResult.data || []) as PlanningRow[]
    const actifs = ((mesProspects.data || []) as Prospect[]).filter(p => ETAPES_A_RELANCER.includes(normalizeStatut(p.statut)))
    const ids = [...new Set([...taskRows.map(t => t.prospect_id), ...eventRows.map(e => e.prospect_id).filter((id): id is string => Boolean(id))])]
    const idsSuivi = [...new Set([...ids, ...actifs.map(p => p.id)])]
    const interactionsResult = idsSuivi.length
      ? await supabase.from('interactions').select('prospect_id,created_at,contenu,type').in('prospect_id', idsSuivi).order('created_at', { ascending: false }).limit(1000)
      : { data: [], error: null }
    const derniereParProspect = new Map<string, DerniereInteraction>()
    for (const i of (interactionsResult.data || []) as DerniereInteraction[]) if (!derniereParProspect.has(i.prospect_id)) derniereParProspect.set(i.prospect_id, i)
    setDernieres(derniereParProspect)
    setRelances(actifs
      .map(p => {
        const derniere = derniereParProspect.get(p.id) || null
        return { ...p, derniere, joursSansContact: joursDepuis(derniere?.created_at || p.created_at) }
      })
      .filter(p => p.joursSansContact >= SEUIL_RELANCE)
      .sort((a, b) => b.joursSansContact - a.joursSansContact))
    const prospectsResult = ids.length
      ? await supabase.from('prospects').select('id,prenom,nom,telephone,email,adresse,adresse_rue,code_postal,ville,raison_sociale').in('id', ids)
      : { data: [], error: null }
    if (prospectsResult.error) setError(prev => [prev, `Contacts : ${prospectsResult.error.message}`].filter(Boolean).join(' · '))
    const byId = new Map<string, Prospect>(((prospectsResult.data || []) as Prospect[]).map(p => [p.id, p]))
    setTasks(taskRows.map(t => ({ ...t, prospect: byId.get(t.prospect_id) || null })))
    setEvents(eventRows.map(e => ({ ...e, prospect: e.prospect_id ? byId.get(e.prospect_id) || null : null })))
    setLoading(false)
  }

  useEffect(() => { void load() }, [profile?.id])

  async function noterAppel(p: Relance, resultat: string) {
    const { error } = await supabase.from('interactions').insert({
      prospect_id: p.id, type: 'appel', contenu: `Appel de relance : ${resultat}`,
      auteur: profile?.nom_complet || null, meta: { canal: 'ma_journee', resultat },
    })
    if (error) { setError(`Enregistrement de l’appel impossible : ${error.message}`); return }
    setAppelOuvert(null)
    if (resultat === 'Joint') setRelances(prev => prev.filter(r => r.id !== p.id))
    else setRelances(prev => prev.map(r => r.id === p.id ? { ...r, joursSansContact: 0, derniere: { created_at: new Date().toISOString(), contenu: `Appel de relance : ${resultat}`, type: 'appel' } } : r))
  }

  async function toggle(task: TaskRow) {
    const done = !task.done
    const { error } = await supabase.from('tasks').update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', task.id)
    if (error) { setError(error.message); return }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done, done_at: done ? new Date().toISOString() : null } : t))
  }

  const now = Date.now()
  const aujourdHui = todayLocal()
  const rdvVisibles = events.filter(e => !mesRdvSeulement || !(e as PlanningRow & { user_id?: string | null }).user_id || (e as PlanningRow & { user_id?: string | null }).user_id === profile?.id)
  const rdvDuJour = rdvVisibles.filter(e => e.date === aujourdHui)
  const rdvAVenir = rdvVisibles.filter(e => e.date !== aujourdHui)
  const ficheRdv = (p?: Prospect | null) => {
    if (!p) return null
    const derniere = dernieres.get(p.id)
    const infos = [p.statut && `Étape : ${p.statut}`, p.categorie_mpr && `Profil MaPrimeRénov' : ${p.categorie_mpr}`].filter(Boolean)
    if (!infos.length && !derniere) return null
    return <div className="journee-fiche">
      {infos.length > 0 && <div>{infos.join(' · ')}</div>}
      {derniere && <div><StickyNote size={12}/> Dernier échange ({new Date(derniere.created_at).toLocaleDateString('fr-FR')}) : {(derniere.contenu || derniere.type).slice(0, 140)}</div>}
    </div>
  }
  const carteRdv = (event: PlanningRow) => {
    const address = event.adresse || adresseProspect(event.prospect)
    return <div key={event.id} style={{padding:16,borderBottom:'1px solid var(--c-border,#e5e7eb)'}}>
      <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
        <span className="dashboard-kpi-icon green"><Calendar size={18}/></span>
        <div style={{flex:1,minWidth:0}}>
          <div className="font-semibold">{event.titre || 'Rendez-vous'}</div>
          <div className="text-sm text-muted" style={{marginTop:4}}>{new Date(`${event.date}T${(event.heure || '09:00').slice(0,5)}:00`).toLocaleString('fr-FR', event.date === aujourdHui ? {timeStyle:'short'} : {dateStyle:'full',timeStyle:'short'})}</div>
          <div className="text-sm" style={{marginTop:4}}>{event.prospect ? `${event.prospect.prenom || ''} ${event.prospect.nom || ''}`.trim() : 'Prospect non renseigné'}</div>
          {address && <div className="text-sm text-muted" style={{marginTop:4}}><MapPin size={13} style={{verticalAlign:'middle',marginRight:4}}/>{address}</div>}
          {event.notes && <div className="text-sm text-muted" style={{marginTop:4}}>{event.notes}</div>}
          {ficheRdv(event.prospect)}
          {renderActions(event.prospect, address)}
        </div>
      </div>
    </div>
  }
  const visible = tasks.filter(t => showDone || !t.done)
  const ouvertes = tasks.filter(t => !t.done).length
  const enRetard = tasks.filter(t => !t.done && t.due_at && new Date(t.due_at).getTime() < now).length
  const renderActions = (prospect?: Prospect | null, address?: string | null) => {
    const phone = prospect?.telephone || ''
    const wa = whatsappNumber(phone)
    const destination = (address || adresseProspect(prospect)).trim()
    return <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
      {phone && <a className="btn btn-sm btn-secondary" href={`tel:${phone}`}><Phone size={14}/> Appeler</a>}
      {phone && <a className="btn btn-sm btn-secondary" href={`sms:${phone}`}><MessageCircle size={14}/> SMS</a>}
      {wa && <a className="btn btn-sm btn-secondary" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle size={14}/> WhatsApp</a>}
      {destination && <a className="btn btn-sm btn-secondary" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noreferrer"><Navigation size={14}/> Itinéraire</a>}
    </div>
  }

  return <div className="page">
    <div className="page-header" style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
      <div><h1 className="page-title">Ma journée</h1><p className="page-subtitle">Vos rendez-vous du jour, les prospects à relancer et vos tâches, avec appel, SMS, WhatsApp et itinéraire en un geste.</p></div>
      <Button variant="secondary" onClick={() => void load()}><RefreshCw size={15}/> Actualiser</Button>
    </div>
    {error && <div className="card card-pad text-sm" style={{color:'#b91c1c',marginBottom:12}}>{error}</div>}
    <div className="dashboard-kpis page-kpi-strip">
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><CalendarClock size={18}/></span><span className="dashboard-kpi-main"><strong>{rdvDuJour.length}</strong><span>RDV aujourd’hui</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><CheckCircle2 size={18}/></span><span className="dashboard-kpi-main"><strong>{ouvertes}</strong><span>Actions ouvertes</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><RefreshCw size={18}/></span><span className="dashboard-kpi-main"><strong>{enRetard}</strong><span>Tâches en retard</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><UserRoundX size={18}/></span><span className="dashboard-kpi-main"><strong>{relances.length}</strong><span>Prospects à relancer</span></span></div>
    </div>

    <section style={{marginTop:18}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:10,flexWrap:'wrap'}}>
        <div className="section-label">Aujourd’hui</div>
        <label className="text-sm" style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={mesRdvSeulement} onChange={e=>setMesRdvSeulement(e.target.checked)}/> Mes rendez-vous uniquement</label>
      </div>
      <div className="card">
        {loading ? <div className="card-pad text-muted">Chargement de l’agenda…</div> : rdvDuJour.length === 0
          ? <div className="card-pad text-sm text-muted">Aucun rendez-vous aujourd’hui. Profitez-en pour traiter vos relances ci-dessous.</div>
          : rdvDuJour.map(carteRdv)}
      </div>
    </section>

    <section style={{marginTop:22}}>
      <div className="section-label" style={{marginBottom:10}}>À relancer <span className="text-muted" style={{fontWeight:400}}>· sans contact depuis {SEUIL_RELANCE} jours ou plus</span></div>
      <div className="card">
        {loading ? <div className="card-pad text-muted">Analyse de vos prospects…</div> : relances.length === 0
          ? <div className="card-pad text-sm text-muted">Tous vos prospects en cours ont eu un contact récent. Bravo !</div>
          : relances.map(p => <div key={p.id} className="journee-relance">
            <span className="dashboard-kpi-icon amber"><UserRoundX size={18}/></span>
            <div style={{flex:1,minWidth:0}}>
              <div className="font-semibold">{p.raison_sociale || `${p.prenom || ''} ${p.nom || ''}`.trim()}</div>
              <div className="text-sm text-muted" style={{marginTop:3}}>
                {p.statut || 'Nouveau'} · {p.derniere ? `dernier échange il y a ${p.joursSansContact} j` : `aucun échange depuis ${p.joursSansContact} j`}{p.ville ? ` · ${p.ville}` : ''}
              </div>
              {p.derniere?.contenu && <div className="text-sm text-muted" style={{marginTop:3}}>« {p.derniere.contenu.slice(0, 120)} »</div>}
              {renderActions(p)}
              {appelOuvert === p.id
                ? <div className="journee-resultats">{RESULTATS_APPEL.map(r => <button key={r.value} type="button" className="btn btn-sm btn-secondary" onClick={() => void noterAppel(p, r.value)}><r.icon size={14}/> {r.value}</button>)}<button type="button" className="btn btn-sm btn-ghost" onClick={() => setAppelOuvert(null)}>Annuler</button></div>
                : <button type="button" className="btn btn-sm btn-primary" style={{marginTop:8}} onClick={() => setAppelOuvert(p.id)}><StickyNote size={14}/> Noter le résultat de l’appel</button>}
            </div>
          </div>)}
      </div>
    </section>

    <section style={{marginTop:22}}>
      <div className="section-label" style={{marginBottom:10}}>Rendez-vous à venir</div>
      <div className="card">
        {loading ? <div className="card-pad text-muted">Chargement de l’agenda…</div> : rdvAVenir.length === 0
          ? <div className="card-pad text-sm text-muted">Aucun autre rendez-vous planifié.</div>
          : rdvAVenir.map(carteRdv)}
      </div>
    </section>

    <section style={{marginTop:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:10,flexWrap:'wrap'}}>
        <div className="section-label">Appels et relances</div>
        <label className="text-sm" style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)}/> Afficher les tâches terminées</label>
      </div>
      <div className="card">
        {loading ? <div className="card-pad text-muted">Chargement des tâches…</div> : visible.length === 0
          ? <div className="empty-state"><CheckCircle2 size={36}/><h3>Aucune action à traiter</h3><p>Les tâches et relances ajoutées depuis les fiches prospects apparaîtront ici.</p></div>
          : <div style={{display:'flex',flexDirection:'column'}}>{visible.map(task => {
            const Icon = TYPE_ICON[task.type] || Circle
            const overdue = !task.done && task.due_at && new Date(task.due_at).getTime() < now
            return <div key={task.id} style={{display:'flex',gap:12,alignItems:'flex-start',padding:16,borderBottom:'1px solid var(--c-border,#e5e7eb)',opacity:task.done?0.65:1}}>
              <button className="btn-icon" onClick={() => void toggle(task)} title={task.done?'Réouvrir':'Marquer terminée'}>{task.done?<CheckCircle2 size={20}/>:<Circle size={20}/>}</button>
              <div style={{flex:1,minWidth:0}}>
                <div className="font-semibold">{task.titre}</div>
                {task.description && <div className="text-sm text-muted" style={{marginTop:3}}>{task.description}</div>}
                <div className="text-sm text-muted" style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:7}}>
                  <span><Icon size={13} style={{verticalAlign:'middle',marginRight:4}}/>{task.type}</span>
                  <span>{task.prospect ? `${task.prospect.prenom} ${task.prospect.nom}` : 'Prospect'}</span>
                  <span style={{color:overdue?'#b91c1c':undefined}}>{overdue?'En retard · ':''}{dateLabel(task.due_at)}</span>
                </div>
                {renderActions(task.prospect)}
              </div>
              <span className={`badge ${task.priorite==='haute'?'badge-error':task.priorite==='basse'?'badge-neutral':'badge-info'}`}>{task.priorite==='haute'?'Prioritaire':task.priorite==='basse'?'Basse':'Normale'}</span>
            </div>
          })}</div>}
      </div>
    </section>
  </div>
}
