import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, Circle, Phone, Mail, Calendar, RefreshCw, MapPin, MessageCircle, Navigation } from 'lucide-react'
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

  async function load() {
    setLoading(true)
    setError('')
    const [taskResult, eventResult] = await Promise.all([
      supabase.from('tasks').select('id,prospect_id,titre,description,type,priorite,assigne,due_at,done,done_at,created_at').order('done', { ascending: true }).order('due_at', { ascending: true, nullsFirst: false }),
      supabase.from('planning_events').select('id,titre,date,heure,type,prospect_id,adresse,notes').gte('date', todayLocal()).order('date', { ascending: true }).order('heure', { ascending: true }).limit(20),
    ])
    if (taskResult.error) setError(`Tâches : ${taskResult.error.message}`)
    if (eventResult.error) setError(prev => [prev, `Agenda : ${eventResult.error.message}`].filter(Boolean).join(' · '))
    const taskRows = (taskResult.data || []) as CrmTask[]
    const eventRows = (eventResult.data || []) as PlanningRow[]
    const ids = [...new Set([...taskRows.map(t => t.prospect_id), ...eventRows.map(e => e.prospect_id).filter((id): id is string => Boolean(id))])]
    const prospectsResult = ids.length
      ? await supabase.from('prospects').select('id,prenom,nom,telephone,email,adresse,adresse_rue,code_postal,ville,raison_sociale').in('id', ids)
      : { data: [], error: null }
    if (prospectsResult.error) setError(prev => [prev, `Contacts : ${prospectsResult.error.message}`].filter(Boolean).join(' · '))
    const byId = new Map<string, Prospect>(((prospectsResult.data || []) as Prospect[]).map(p => [p.id, p]))
    setTasks(taskRows.map(t => ({ ...t, prospect: byId.get(t.prospect_id) || null })))
    setEvents(eventRows.map(e => ({ ...e, prospect: e.prospect_id ? byId.get(e.prospect_id) || null : null })))
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function toggle(task: TaskRow) {
    const done = !task.done
    const { error } = await supabase.from('tasks').update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', task.id)
    if (error) { setError(error.message); return }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done, done_at: done ? new Date().toISOString() : null } : t))
  }

  const now = Date.now()
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
      <div><h1 className="page-title">Ma journée</h1><p className="page-subtitle">Vos prochains rendez-vous, appels et relances, avec accès direct aux contacts et itinéraires.</p></div>
      <Button variant="secondary" onClick={() => void load()}><RefreshCw size={15}/> Actualiser</Button>
    </div>
    {error && <div className="card card-pad text-sm" style={{color:'#b91c1c',marginBottom:12}}>{error}</div>}
    <div className="dashboard-kpis page-kpi-strip">
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><CalendarClock size={18}/></span><span className="dashboard-kpi-main"><strong>{events.length}</strong><span>RDV à venir</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><CheckCircle2 size={18}/></span><span className="dashboard-kpi-main"><strong>{ouvertes}</strong><span>Actions ouvertes</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><RefreshCw size={18}/></span><span className="dashboard-kpi-main"><strong>{enRetard}</strong><span>Relances en retard</span></span></div>
    </div>

    <section style={{marginTop:18}}>
      <div className="section-label" style={{marginBottom:10}}>Prochains rendez-vous</div>
      <div className="card">
        {loading ? <div className="card-pad text-muted">Chargement de l’agenda…</div> : events.length === 0
          ? <div className="card-pad text-sm text-muted">Aucun rendez-vous à venir dans l’agenda.</div>
          : events.map(event => {
            const address = event.adresse || adresseProspect(event.prospect)
            return <div key={event.id} style={{padding:16,borderBottom:'1px solid var(--c-border,#e5e7eb)'}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                <span className="dashboard-kpi-icon green"><Calendar size={18}/></span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="font-semibold">{event.titre || 'Rendez-vous'}</div>
                  <div className="text-sm text-muted" style={{marginTop:4}}>{new Date(`${event.date}T${event.heure || '09:00'}:00`).toLocaleString('fr-FR',{dateStyle:'full',timeStyle:'short'})}</div>
                  <div className="text-sm" style={{marginTop:4}}>{event.prospect ? `${event.prospect.prenom || ''} ${event.prospect.nom || ''}`.trim() : 'Prospect non renseigné'}</div>
                  {address && <div className="text-sm text-muted" style={{marginTop:4}}><MapPin size={13} style={{verticalAlign:'middle',marginRight:4}}/>{address}</div>}
                  {event.notes && <div className="text-sm text-muted" style={{marginTop:4}}>{event.notes}</div>}
                  {renderActions(event.prospect, address)}
                </div>
              </div>
            </div>
          })}
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
