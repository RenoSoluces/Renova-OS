import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, BellRing, Building2, CalendarClock, CheckCircle2, Flame,
  Phone, RefreshCw, Target, Trophy, Users, Wallet, Clock3, AlertTriangle,
  TimerReset, ListTodo, UserRound,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Commission, CrmTask, Dossier, Devis, Prospect, PageKey } from '../../types'
import { euro, isProspectTerminal, stageOf } from '../../lib/crm/constants'
import { useAuth } from '../../lib/auth/AuthContext'

type Partner = { id: string; nom: string; telephone?: string | null }
type InteractionRef = { id: string; prospect_id: string; type: string; created_at: string; contenu?: string | null }
type ProspectRef = Prospect & { updated_at?: string | null; installateur_id?: string | null }

const DEFAULT_OBJECTIVE = 10000

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function tomorrowMorning() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

function formatDelay(ms: number) {
  const hours = Math.max(0, Math.round(ms / 3600000))
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)} j`
}

export function CommercialDashboard({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { profile } = useAuth()
  const [prospects, setProspects] = useState<ProspectRef[]>([])
  const [devis, setDevis] = useState<Devis[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [interactions, setInteractions] = useState<InteractionRef[]>([])
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    const saved = localStorage.getItem(`renova_objectif_commercial_${profile.id}`)
    if (saved && Number(saved) > 0) setObjective(Number(saved))

    const userId = profile.id
    const userName = profile.nom_complet || null

    async function load() {
      setLoading(true)
      const [p, d, ds, c, pa, t, i] = await Promise.all([
        supabase.from('prospects').select('*').eq('commercial_id', userId).order('created_at', { ascending: false }),
        supabase.from('devis').select('*').order('created_at', { ascending: false }),
        supabase.from('dossiers').select('*').order('created_at', { ascending: false }),
        supabase.from('commissions').select('*, commercial:profiles(id,nom_complet,couleur)').eq('commercial_id', userId).order('date_generation', { ascending: false }),
        supabase.from('installateurs').select('id,nom,telephone').eq('actif', true).order('nom'),
        supabase.from('tasks').select('*, prospect:prospects(*)').eq('done', false).order('due_at', { ascending: true, nullsFirst: false }).limit(50),
        supabase.from('interactions').select('id,prospect_id,type,created_at,contenu').order('created_at', { ascending: false }).limit(500),
      ])
      setProspects((p.data || []) as ProspectRef[])
      setDevis((d.data || []) as Devis[])
      setDossiers((ds.data || []) as Dossier[])
      setCommissions((c.data || []) as Commission[])
      setPartners((pa.data || []) as Partner[])
      setTasks((t.data || []) as CrmTask[])
      setInteractions((i.data || []) as InteractionRef[])
      setLoading(false)
    }
    load()
  }, [profile?.id])

  const prospectIds = useMemo(() => new Set(prospects.map(p => p.id)), [prospects])
  const myDevis = useMemo(() => devis.filter(d => d.prospect_id && prospectIds.has(d.prospect_id)), [devis, prospectIds])
  const myDossiers = useMemo(() => dossiers.filter(d => prospectIds.has(d.prospect_id)), [dossiers, prospectIds])
  const myTasks = useMemo(() => tasks.filter(t => !t.prospect_id || prospectIds.has(t.prospect_id)), [tasks, prospectIds])
  const myInteractions = useMemo(() => interactions.filter(i => prospectIds.has(i.prospect_id)), [interactions, prospectIds])

  const monthStart = startOfMonth()
  const monthCommissions = useMemo(() => commissions.filter(c => c.type === 'devis_signe' && new Date(c.date_generation) >= new Date(monthStart)), [commissions, monthStart])
  const primesMois = monthCommissions.reduce((s, c) => s + Number(c.montant_commercial || 0), 0)

  const signedThisMonth = myDevis.filter(d => d.statut === 'signe' && new Date(d.created_at) >= new Date(monthStart))
  const objectiveProgress = objective > 0 ? Math.min(100, Math.round((primesMois / objective) * 100)) : 0

  const hotPipe = useMemo(() => prospects
    .filter(p => p.installateur_id && !isProspectTerminal(p.statut) && !['Signé', 'Installation'].includes(stageOf(p.statut).value))
    .reduce((s, p) => s + (Number(p.montant_potentiel) || 0), 0), [prospects])

  const interactionByProspect = useMemo(() => {
    const map = new Map<string, InteractionRef>()
    for (const i of myInteractions) if (!map.has(i.prospect_id)) map.set(i.prospect_id, i)
    return map
  }, [myInteractions])

  const urgentActions = useMemo(() => {
    const now = Date.now()
    const taskItems = myTasks.map(t => ({
      kind: 'task' as const,
      id: t.id,
      priority: t.priorite === 'haute' ? 100 : t.priorite === 'normale' ? 60 : 30,
      due: t.due_at ? new Date(t.due_at).getTime() : now,
      prospect: t.prospect as ProspectRef | undefined,
      title: t.titre,
      meta: t.due_at ? `Échéance ${new Date(t.due_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'À traiter aujourd’hui',
    }))
    const assigned = prospects
      .filter(p => p.installateur_id && !isProspectTerminal(p.statut) && !['Signé', 'Installation'].includes(stageOf(p.statut).value))
      .map(p => {
        const last = interactionByProspect.get(p.id)
        const age = last ? now - new Date(last.created_at).getTime() : now - new Date(p.created_at).getTime()
        if (age < 48 * 3600000) return null
        const partner = partners.find(x => x.id === p.installateur_id)
        return {
          kind: 'partner_alert' as const,
          id: `alert-${p.id}`,
          priority: 85,
          due: now - age,
          prospect: p,
          title: `Relancer ${partner?.nom || 'l’installateur'}`,
          meta: `Aucun suivi depuis ${formatDelay(age)}`,
        }
      }).filter(Boolean) as Array<any>
    return [...taskItems, ...assigned].sort((a, b) => b.priority - a.priority || a.due - b.due).slice(0, 6)
  }, [myTasks, prospects, interactionByProspect, partners])

  const partnerRows = useMemo(() => partners.map(partner => {
    const leads = prospects.filter(p => p.installateur_id === partner.id)
    const leadIds = new Set(leads.map(p => p.id))
    const partnerDossiers = myDossiers.filter(d => leadIds.has(d.prospect_id))
    const partnerDevis = myDevis.filter(d => d.prospect_id && leadIds.has(d.prospect_id))
    const converted = new Set(partnerDossiers.map(d => d.prospect_id)).size
    const quoteTimes = partnerDevis
      .map(d => {
        const p = leads.find(x => x.id === d.prospect_id)
        return p ? new Date(d.created_at).getTime() - new Date(p.created_at).getTime() : 0
      }).filter(n => n >= 0)
    const avgHours = quoteTimes.length ? Math.round(quoteTimes.reduce((a, b) => a + b, 0) / quoteTimes.length / 3600000) : null
    return { ...partner, leads: leads.length, converted, conversion: leads.length ? Math.round((converted / leads.length) * 100) : 0, avgHours }
  }).filter(x => x.leads > 0).sort((a, b) => b.conversion - a.conversion || (a.avgHours ?? 9999) - (b.avgHours ?? 9999)).slice(0, 3), [partners, prospects, myDossiers, myDevis])

  const qualificationRate = prospects.length ? Math.round((prospects.filter(p => !['Nouveau'].includes(stageOf(p.statut).value)).length / prospects.length) * 100) : 0
  const sourceRows = useMemo(() => {
    const map = new Map<string, { source: string; leads: number; signed: number }>()
    for (const p of prospects) {
      const source = p.source || 'Non renseignée'
      const row = map.get(source) || { source, leads: 0, signed: 0 }
      row.leads++
      if (myDevis.some(d => d.prospect_id === p.id && d.statut === 'signe')) row.signed++
      map.set(source, row)
    }
    return [...map.values()].sort((a, b) => b.signed - a.signed || b.leads - a.leads).slice(0, 5)
  }, [prospects, myDevis])

  async function logCall(p: ProspectRef) {
    await supabase.from('interactions').insert({ prospect_id: p.id, type: 'appel', contenu: 'Appel lancé depuis le dashboard commercial', auteur: profile?.nom_complet || null, meta: { source: 'dashboard', action: 'click_to_call' } })
  }

  async function remindLater(p: ProspectRef, hours = 4) {
    const due = new Date(Date.now() + hours * 3600000).toISOString()
    await supabase.from('tasks').insert({ prospect_id: p.id, titre: `Rappeler ${p.prenom} ${p.nom}`, description: 'Relance créée depuis le dashboard commercial.', type: 'appel', priorite: 'haute', assigne: profile?.id || '', due_at: due, done: false })
    await supabase.from('interactions').insert({ prospect_id: p.id, type: 'note', contenu: `Rappel programmé dans ${hours}h`, auteur: profile?.nom_complet || null, meta: { source: 'dashboard', action: 'rappeler_plus_tard' } })
    setTasks(prev => [...prev, { id: crypto.randomUUID(), prospect_id: p.id, titre: `Rappeler ${p.prenom} ${p.nom}`, description: '', type: 'appel', priorite: 'haute', assigne: profile?.id || null, due_at: due, done: false, done_at: null, created_at: new Date().toISOString(), prospect: p }])
  }

  function saveObjective(value: number) {
    const safe = Math.max(0, value || 0)
    setObjective(safe)
    if (profile?.id) localStorage.setItem(`renova_objectif_commercial_${profile.id}`, String(safe))
  }

  return (
    <div className="page commercial-dashboard">
      <section className="commercial-hero">
        <div>
          <div className="dashboard-kicker">MODE CHASSEUR</div>
          <h1>Bonjour {(profile?.nom_complet || '').split(' ')[0] || 'à vous'} 👋</h1>
          <p>Votre tableau de bord est orienté action : priorités, partenaires et primes.</p>
        </div>
        <div className="commercial-hero-actions">
          <button className="btn btn-secondary" onClick={() => onNavigate('prospects')}><Users size={17}/> Mes prospects</button>
          <button className="btn btn-primary" onClick={() => onNavigate('visites')}><Target size={17}/> Nouvelle visite</button>
        </div>
      </section>

      <section className="commercial-top-grid">
        <div className="card commercial-goal-card">
          <div className="commercial-card-head"><div><span className="commercial-eyebrow">OBJECTIF DU MOIS</span><strong>{objective ? euro(objective) : 'À définir'}</strong></div><Target size={22}/></div>
          <div className="commercial-goal-content">
            <div className="objectif-ring" style={{ ['--progress' as any]: `${objectiveProgress}%` }}>
              <svg viewBox="0 0 120 120" width="120" height="120"><circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="10" opacity=".12"/><circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${Math.round(301.59 * objectiveProgress / 100)} 301.59`}/></svg>
              <div className="objectif-ring-text"><span className="objectif-ring-value">{objectiveProgress}%</span><span className="objectif-ring-label">atteint</span></div>
            </div>
            <div className="commercial-goal-copy"><strong>{euro(primesMois)}</strong><span>primes gagnées ce mois</span><small>{objectiveProgress >= 75 ? 'En bonne voie !' : objectiveProgress >= 40 ? 'Continuez comme ça.' : 'Chaque signature compte.'}</small><label>Objectif <input type="number" min="0" step="500" value={objective} onChange={e => saveObjective(Number(e.target.value))}/></label></div>
          </div>
        </div>

        <div className="card commercial-money-card"><div className="commercial-card-head"><div><span className="commercial-eyebrow">MES PRIMES GAGNÉES</span><strong>{euro(primesMois)}</strong></div><Wallet size={22}/></div><div className="commercial-money-meta"><span><CheckCircle2 size={15}/> {signedThisMonth.length} devis signés ce mois</span><button onClick={() => onNavigate('commissions')}>Voir mes commissions <ArrowRight size={14}/></button></div></div>

        <div className="card commercial-pipe-card"><div className="commercial-card-head"><div><span className="commercial-eyebrow">PIPE CHAUD</span><strong>{euro(hotPipe)}</strong></div><Flame size={22}/></div><p>Affaires qualifiées déjà envoyées aux installateurs et pas encore conclues.</p><button className="btn btn-ghost btn-sm" onClick={() => onNavigate('prospects')}>Voir le pipe <ArrowRight size={14}/></button></div>
      </section>

      <section className="commercial-main-grid">
        <div className="card commercial-todo-card">
          <div className="card-header"><div><div className="card-title"><ListTodo size={17}/> To-do du jour</div><div className="dashboard-panel-subtitle">Les actions les plus urgentes en premier.</div></div><span className="badge badge-warning">{urgentActions.length} actions</span></div>
          <div className="commercial-todo-list">
            {loading && <div className="commercial-empty">Chargement…</div>}
            {!loading && urgentActions.length === 0 && <div className="commercial-empty"><CheckCircle2 size={24}/><strong>Tout est à jour</strong><span>Aucune action urgente pour le moment.</span></div>}
            {urgentActions.map(item => {
              const p = item.prospect as ProspectRef | undefined
              if (!p) return <div className="commercial-todo-row" key={item.id}><span className="commercial-todo-icon"><Clock3 size={17}/></span><div><strong>{item.title}</strong><small>{item.meta}</small></div></div>
              return <div className="commercial-todo-row" key={item.id}><span className={`commercial-todo-icon ${item.kind === 'partner_alert' ? 'danger' : ''}`}>{item.kind === 'partner_alert' ? <AlertTriangle size={17}/> : <Clock3 size={17}/>}</span><div className="commercial-todo-body"><strong>{item.kind === 'partner_alert' ? 'Alerte perte' : 'Action'} — {p.prenom} {p.nom}</strong><small>{item.meta}</small></div><div className="commercial-todo-actions"><a className="icon-call" href={`tel:${p.telephone || ''}`} onClick={() => logCall(p)} title="Appeler"><Phone size={16}/></a><button className="btn btn-ghost btn-sm" onClick={() => item.kind === 'partner_alert' ? remindLater(p, 4) : remindLater(p, 4)}><TimerReset size={14}/> +4h</button></div></div>
            })}
          </div>
        </div>

        <div className="card commercial-partners-card">
          <div className="card-header"><div><div className="card-title"><Trophy size={17}/> Match des installateurs</div><div className="dashboard-panel-subtitle">Vos 3 partenaires les plus efficaces sur vos leads.</div></div><Building2 size={19}/></div>
          <div className="commercial-partner-list">
            {partnerRows.map((p, index) => <div className="commercial-partner-row" key={p.id}><span className="commercial-rank">{index + 1}</span><div className="commercial-partner-main"><strong>{p.nom}</strong><small>{p.avgHours !== null ? `Devis moyen : ${p.avgHours < 24 ? `${p.avgHours}h` : `${Math.round(p.avgHours / 24)} j`}` : 'Pas encore de devis mesuré'}</small></div><div className="commercial-partner-score"><strong>{p.conversion}%</strong><small>conversion</small></div><a className="icon-call" href={`tel:${p.telephone || ''}`} title="Appeler l'installateur"><Phone size={15}/></a></div>)}
            {!partnerRows.length && <div className="commercial-empty"><Building2 size={24}/><span>Aucun installateur avec vos leads pour le moment.</span></div>}
          </div>
        </div>
      </section>

      <section className="commercial-stats-grid">
        <div className="card commercial-stat-card"><div className="commercial-card-head"><div><span className="commercial-eyebrow">TAUX DE QUALIFICATION</span><strong>{qualificationRate}%</strong></div><Target size={20}/></div><div className="commercial-progress"><span style={{ width: `${qualificationRate}%` }}/></div><small>Prospects sortis de l'étape Nouveau</small></div>
        <div className="card commercial-stat-card"><div className="commercial-card-head"><div><span className="commercial-eyebrow">ORIGINE DES SUCCÈS</span><strong>{sourceRows[0]?.source || '—'}</strong></div><Users size={20}/></div><div className="commercial-source-list">{sourceRows.map(x => <div key={x.source}><span>{x.source}</span><strong>{x.signed} signé{x.signed > 1 ? 's' : ''}</strong></div>)}{!sourceRows.length && <small>Aucune donnée.</small>}</div></div>
        <div className="card commercial-stat-card"><div className="commercial-card-head"><div><span className="commercial-eyebrow">ACTIVITÉ CETTE SEMAINE</span><strong>{myInteractions.filter(i => new Date(i.created_at).getTime() >= Date.now() - 7 * 86400000).length}</strong></div><BellRing size={20}/></div><small>Interactions enregistrées sur les 7 derniers jours.</small><button className="btn btn-ghost btn-sm" onClick={() => onNavigate('activite')}>Voir l'activité <ArrowRight size={14}/></button></div>
      </section>

      <section className="commercial-quick-actions"><button onClick={() => onNavigate('prospects')}><UserRound size={17}/> Ouvrir mes prospects</button><button onClick={() => onNavigate('planning')}><CalendarClock size={17}/> Mon agenda</button><button onClick={() => onNavigate('commissions')}><Wallet size={17}/> Mes commissions</button><button onClick={() => window.location.reload()}><RefreshCw size={17}/> Actualiser</button></section>
    </div>
  )
}
