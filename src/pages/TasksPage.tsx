import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, Circle, Phone, Mail, Calendar, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { CrmTask, Prospect } from '../types'
import { Button } from '../components/ui/Button'

type TaskRow = Omit<CrmTask, 'prospect'> & { prospect?: Prospect | null }
const TYPE_ICON: Record<string, any> = { appel: Phone, email: Mail, rdv: Calendar, relance: RefreshCw, autre: Circle }
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'}) : 'Sans échéance'

export function TasksPage(): JSX.Element {
  const [tasks,setTasks] = useState<TaskRow[]>([])
  const [loading,setLoading] = useState(true)
  const [showDone,setShowDone] = useState(false)
  const [error,setError] = useState('')
  async function load() {
    setLoading(true)
    const {data,error}=await supabase.from('tasks').select('*').order('done',{ascending:true}).order('due_at',{ascending:true,nullsFirst:false})
    if(error){setError(error.message);setTasks([]);setLoading(false);return}
    const rows=(data||[]) as CrmTask[]
    const ids=[...new Set(rows.map(t=>t.prospect_id))]
    const prospectsResult=ids.length?await supabase.from('prospects').select('*').in('id',ids):{data:[],error:null}
    const byId=new Map<string,Prospect>(((prospectsResult.data||[]) as Prospect[]).map(p=>[p.id,p]))
    setTasks(rows.map(t=>({...t,prospect:byId.get(t.prospect_id)||null})))
    setLoading(false)
  }
  useEffect(()=>{void load()},[])
  async function toggle(task:TaskRow){
    const done=!task.done
    const {error}=await supabase.from('tasks').update({done,done_at:done?new Date().toISOString():null}).eq('id',task.id)
    if(error){setError(error.message);return}
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,done,done_at:done?new Date().toISOString():null}:t))
  }
  const now=Date.now()
  const visible=tasks.filter(t=>showDone||!t.done)
  const ouvertes=tasks.filter(t=>!t.done).length
  return <div className="page">
    <div className="page-header"><div><h1 className="page-title">À traiter</h1><p className="page-subtitle">Vos appels, relances, rendez-vous et actions commerciales à effectuer.</p></div><Button variant="secondary" onClick={()=>void load()}><RefreshCw size={15}/> Actualiser</Button></div>
    {error&&<div className="card card-pad text-sm" style={{color:'#b91c1c',marginBottom:12}}>{error}</div>}
    <div className="dashboard-kpis page-kpi-strip"><div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><CalendarClock size={18}/></span><span className="dashboard-kpi-main"><strong>{ouvertes}</strong><span>Actions ouvertes</span></span></div><div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><CheckCircle2 size={18}/></span><span className="dashboard-kpi-main"><strong>{tasks.filter(t=>t.done).length}</strong><span>Terminées</span></span></div></div>
    <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}><label className="text-sm" style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)}/> Afficher les tâches terminées</label></div>
    <div className="card">
      {loading?<div className="card-pad text-muted">Chargement des tâches…</div>:visible.length===0?<div className="empty-state"><CheckCircle2 size={36}/><h3>Aucune action à traiter</h3><p>Les tâches et relances ajoutées depuis les fiches prospects apparaîtront ici.</p></div>:<div style={{display:'flex',flexDirection:'column'}}>{visible.map(task=>{const Icon=TYPE_ICON[task.type]||Circle;const overdue=!task.done&&task.due_at&&new Date(task.due_at).getTime()<now;return <div key={task.id} style={{display:'flex',gap:12,alignItems:'flex-start',padding:16,borderBottom:'1px solid var(--c-border,#e5e7eb)',opacity: task.done ? 0.65 : 1}}><button className="btn-icon" onClick={()=>void toggle(task)} title={task.done?'Réouvrir':'Marquer terminée'}>{task.done?<CheckCircle2 size={20}/>:<Circle size={20}/>}</button><div style={{flex:1}}><div className="font-semibold">{task.titre}</div>{task.description&&<div className="text-sm text-muted" style={{marginTop:3}}>{task.description}</div>}<div className="text-sm text-muted" style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:7}}><span><Icon size={13} style={{verticalAlign:'middle',marginRight:4}}/>{task.type}</span><span>{task.prospect?`${task.prospect.prenom} ${task.prospect.nom}`:'Prospect'}</span><span style={{color:overdue?'#b91c1c':undefined}}>{overdue?'En retard · ':''}{dateLabel(task.due_at)}</span></div></div><span className={`badge ${task.priorite==='haute'?'badge-error':task.priorite==='basse'?'badge-neutral':'badge-info'}`}>{task.priorite==='haute'?'Prioritaire':task.priorite==='basse'?'Basse':'Normale'}</span></div>})}</div>}
    </div>
  </div>
}
