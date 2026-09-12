import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Users, ClipboardCheck, FileText, TrendingUp, ArrowRight,
  Calendar, Wallet, FileSignature, Percent, MapPin, CheckCircle2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Prospect, Visite, PageKey, Interaction, Devis, Simulation, PlanningEvent, Entreprise, Commission } from '../types'
import { PIPELINE_STAGES, stageOf, euro, timeAgo, isProspectTerminal } from '../lib/crm/constants'
import { useAuth } from '../lib/auth/AuthContext'
import { TodayTasksWidget } from '../components/crm/TodayTasksWidget'

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  const [prospects, setProspects] = useState<Prospect[]>([])
  const [visites, setVisites] = useState<Visite[]>([])
  const [devis, setDevis] = useState<Devis[]>([])
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [activity, setActivity] = useState<Interaction[]>([])
  const [agendaEvents, setAgendaEvents] = useState<PlanningEvent[]>([])
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date()
    const todayKey = today.toISOString().slice(0, 10)
    const inSevenDays = new Date(today)
    inSevenDays.setDate(inSevenDays.getDate() + 6)

    let agendaQuery = supabase
      .from('planning_events')
      .select('*')
      .gte('date', todayKey)
      .lte('date', inSevenDays.toISOString().slice(0, 10))
      .order('date', { ascending: true })
      .order('heure', { ascending: true })
      .limit(8)

    if (!isAdmin && profile?.id) {
      agendaQuery = agendaQuery.or(`user_id.eq.${profile.id},user_id.is.null`)
    }

    Promise.all([
      supabase.from('prospects').select('*').order('created_at', { ascending: false }),
      supabase.from('visites').select('*, prospect:prospects(*)').order('created_at', { ascending: false }),
      supabase.from('devis').select('*').order('created_at', { ascending: false }),
      supabase.from('simulations').select('*').order('created_at', { ascending: false }),
      supabase.from('interactions').select('*, prospect:prospects(*)').order('created_at', { ascending: false }).limit(5),
      agendaQuery,
      supabase.from('entreprises').select('*').limit(1).maybeSingle(),
      (isAdmin
        ? supabase.from('commissions').select('*, commercial:profiles(id, nom_complet, couleur)').order('date_generation', { ascending: false })
        : supabase.from('commissions').select('*, commercial:profiles(id, nom_complet, couleur)').eq('commercial_id', profile?.id || '').order('date_generation', { ascending: false })
      ),
    ]).then(([p, v, d, s, a, ag, ent, com]) => {
      setProspects(p.data || [])
      setVisites((v.data || []) as any)
      setDevis((d.data || []) as Devis[])
      setSimulations((s.data || []) as Simulation[])
      setActivity((a.data || []) as any)
      setAgendaEvents((ag.data || []) as PlanningEvent[])
      setEntreprise((ent.data as Entreprise) || null)
      setCommissions((com.data || []) as unknown as Commission[])
      setLoading(false)
    })
  }, [isAdmin, profile?.id])

  const prospectCount = prospects.length
  const visitesEnCours = visites.filter(v => v.statut === 'en_cours').length
  const visitesTerminees = visites.filter(v => v.statut === 'terminee').length
  const devisEnvoyes = devis.filter(d => d.statut !== 'brouillon').length
  const devisSignes = devis.filter(d => d.statut === 'signe').length

  const pipeline = PIPELINE_STAGES.map(stage => ({
    stage: stage.label,
    count: prospects.filter(p => !isProspectTerminal(p.statut) && stageOf(p.statut).value === stage.value).length,
    color: stage.color,
  }))
  const maxCount = Math.max(...pipeline.map(p => p.count), 1)

  const pipelineValue = prospects
    .filter(p => !isProspectTerminal(p.statut) && stageOf(p.statut).value !== 'Signé')
    .reduce((sum, p) => sum + (Number(p.montant_potentiel) || 0), 0)

  const recentProspects = prospects.slice(0, 5)

  const dpeMoyen = useMemo(() => {
    const valides = simulations.filter(s => s.dpe_avant)
    if (!valides.length) return null
    const ordre = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const lettres = valides
      .map(s => ordre.indexOf(s.dpe_avant!))
      .filter(i => i >= 0)
      .sort((a, b) => a - b)
    const consoValues = valides
      .map(s => Number((s.resultat_avant as any)?.consommationEP))
      .filter(n => Number.isFinite(n) && n > 0)
    return {
      lettre: lettres.length ? ordre[lettres[Math.floor(lettres.length / 2)]] : null,
      conso: consoValues.length
        ? Math.round(consoValues.reduce((a, b) => a + b, 0) / consoValues.length)
        : null,
      count: valides.length,
    }
  }, [simulations])

  const totalCommissionsPayeesMois = useMemo(() => {
    const now = new Date()
    return commissions
      .filter(c => {
        const date = new Date(c.date_validation || c.date_generation)
        return c.statut === 'payee' &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
      })
      .reduce((sum, c) => sum + (Number(c.montant_commercial) || 0), 0)
  }, [commissions])

  const todayKey = new Date().toISOString().slice(0, 10)
  const TYPE_LABEL: Record<string, string> = {
    visite: 'Visite technique',
    rdv: 'Rendez-vous',
    formation: 'Formation',
  }

  return (
    <div className="page dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <div className="dashboard-kicker">TABLEAU DE BORD</div>
          <h1>Bonjour {(profile?.nom_complet || '').split(' ')[0] || 'à vous'} <span aria-hidden="true">👋</span></h1>
          <p>Voici l'essentiel de votre activité. Gardez le cap sur les dossiers qui nécessitent votre attention.</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary" onClick={() => onNavigate('prospects')}>
            <Plus size={17} /> Nouveau prospect
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('visites')}>
            <ClipboardCheck size={17} /> Nouvelle visite
          </button>
        </div>
      </section>

      <section className="dashboard-kpis">
        <button className="dashboard-kpi" onClick={() => onNavigate('prospects')}>
          <span className="dashboard-kpi-icon green"><Users size={19} /></span>
          <span className="dashboard-kpi-main">
            <strong>{prospectCount}</strong>
            <span>Prospects actifs</span>
          </span>
          <span className="dashboard-kpi-note"><TrendingUp size={13} /> {prospects.filter(p => stageOf(p.statut).value === 'Nouveau').length} nouveaux</span>
        </button>

        <button className="dashboard-kpi" onClick={() => onNavigate('visites')}>
          <span className="dashboard-kpi-icon amber"><ClipboardCheck size={19} /></span>
          <span className="dashboard-kpi-main">
            <strong>{visites.length}</strong>
            <span>Visites techniques</span>
          </span>
          <span className="dashboard-kpi-note">{visitesEnCours} en cours</span>
        </button>

        <button className="dashboard-kpi" onClick={() => onNavigate('devis')}>
          <span className="dashboard-kpi-icon blue"><FileSignature size={19} /></span>
          <span className="dashboard-kpi-main">
            <strong>{devisEnvoyes}</strong>
            <span>Devis envoyés</span>
          </span>
          <span className="dashboard-kpi-note"><CheckCircle2 size={13} /> {devisSignes} signés</span>
        </button>

        <button className="dashboard-kpi" onClick={() => onNavigate('commissions')}>
          <span className="dashboard-kpi-icon purple"><Wallet size={19} /></span>
          <span className="dashboard-kpi-main">
            <strong>{euro(totalCommissionsPayeesMois)}</strong>
            <span>Commissions payées</span>
          </span>
          <span className="dashboard-kpi-note">{new Date().toLocaleDateString('fr-FR', { month: 'long' })}</span>
        </button>
      </section>

      <section className="dashboard-main-grid">
        <div className="dashboard-panel dashboard-tasks-panel">
          <TodayTasksWidget onNavigate={onNavigate} limit={5} />
        </div>

        <div className="dashboard-panel card dashboard-today-card">
          <div className="card-header">
            <div>
              <div className="card-title">Aujourd'hui</div>
              <div className="dashboard-panel-subtitle">
                {agendaEvents.some(e => (e.date || '').slice(0, 10) === todayKey)
                  ? 'Vos prochains rendez-vous'
                  : 'Aucun rendez-vous prévu aujourd’hui'}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('planning')}>
              Agenda <ArrowRight size={15} />
            </button>
          </div>

          <div className="dashboard-today-body">
            {agendaEvents.length === 0 ? (
              <div className="dashboard-empty-compact">
                <div className="dashboard-empty-icon"><Calendar size={18} /></div>
                <div>
                  <strong>Votre journée est libre</strong>
                  <span>Profitez-en pour avancer sur vos dossiers.</span>
                </div>
              </div>
            ) : (
              agendaEvents.slice(0, 5).map(event => (
                <div className="dashboard-agenda-row" key={event.id}>
                  <div className="dashboard-agenda-time">{event.heure || '—'}</div>
                  <div className="dashboard-agenda-dot" />
                  <div className="dashboard-agenda-content">
                    <strong>{TYPE_LABEL[event.type] || event.type} — {event.titre}</strong>
                    <span>
                      {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {event.adresse ? ` · ${event.adresse}` : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-secondary-grid">
        <div className="card dashboard-pipeline-card">
          <div className="card-header">
            <div>
              <div className="card-title">Pipeline commercial</div>
              <div className="dashboard-panel-subtitle">{euro(pipelineValue)} de potentiel hors signés</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('prospects')}>
              Voir tout <ArrowRight size={15} />
            </button>
          </div>
          <div className="dashboard-pipeline-body">
            {pipeline.map(item => (
              <div className="dashboard-pipeline-row" key={item.stage}>
                <span>{item.stage}</span>
                <div className="dashboard-pipeline-track">
                  <div style={{ width: `${(item.count / maxCount) * 100}%`, background: item.color }} />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card dashboard-side-card">
          <div className="card-header">
            <div>
              <div className="card-title">Indicateurs clés</div>
              <div className="dashboard-panel-subtitle">Une lecture rapide de la performance</div>
            </div>
          </div>
          <div className="dashboard-indicators">
            <div className="dashboard-indicator">
              <span className="dashboard-indicator-icon green"><ClipboardCheck size={17} /></span>
              <div><strong>{visitesTerminees}</strong><span>Visites terminées</span></div>
            </div>
            <div className="dashboard-indicator">
              <span className="dashboard-indicator-icon blue"><Percent size={17} /></span>
              <div><strong>{visitesTerminees ? Math.round((devisEnvoyes / visitesTerminees) * 100) : 0}%</strong><span>Visite → devis</span></div>
            </div>
            <div className="dashboard-indicator">
              <span className="dashboard-indicator-icon amber"><FileText size={17} /></span>
              <div><strong>{simulations.length}</strong><span>Simulations 3CL</span></div>
            </div>
            <div className="dashboard-indicator">
              <span className="dashboard-indicator-icon purple"><Wallet size={17} /></span>
              <div><strong>{euro(totalCommissionsPayeesMois)}</strong><span>Payées ce mois</span></div>
            </div>
          </div>

          <div className="dashboard-dpe-mini">
            <div>
              <span className="dashboard-dpe-label">DPE médian avant travaux</span>
              {dpeMoyen?.lettre
                ? <strong className={`dashboard-dpe-letter ${dpeMoyen.lettre}`}>{dpeMoyen.lettre}</strong>
                : <strong className="dashboard-dpe-letter empty">—</strong>}
            </div>
            <div className="dashboard-dpe-copy">
              {dpeMoyen
                ? <><strong>{dpeMoyen.conso ?? '—'} <small>kWh/m².an</small></strong><span>{dpeMoyen.count} simulation{dpeMoyen.count > 1 ? 's' : ''}</span></>
                : <span>Aucune simulation enregistrée pour le moment.</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-bottom-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Prospects récents</div>
              <div className="dashboard-panel-subtitle">Les derniers contacts ajoutés</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('prospects')}>
              Prospects <ArrowRight size={15} />
            </button>
          </div>
          <div className="dashboard-prospects-list">
            {loading && <div className="dashboard-loading">Chargement…</div>}
            {!loading && recentProspects.length === 0 && (
              <div className="dashboard-empty-compact">
                <div className="dashboard-empty-icon"><Users size={18} /></div>
                <div><strong>Aucun prospect</strong><span>Commencez par créer votre premier contact.</span></div>
              </div>
            )}
            {recentProspects.map((p, index) => (
              <button className="dashboard-prospect-row" key={p.id} onClick={() => onNavigate('prospects')}>
                <span className={`dashboard-prospect-avatar avatar-${index % 5}`}>
                  {(p.prenom?.[0] || '') + (p.nom?.[0] || '')}
                </span>
                <span className="dashboard-prospect-info">
                  <strong>{p.prenom} {p.nom}</strong>
                  <span>{p.ville || 'Ville non renseignée'}</span>
                </span>
                <span className="badge badge-info">{p.statut}</span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Activité récente</div>
              <div className="dashboard-panel-subtitle">Dernières actions enregistrées</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('activite')}>
              Tout voir <ArrowRight size={15} />
            </button>
          </div>
          <div className="dashboard-activity-list">
            {activity.length === 0
              ? <div className="dashboard-empty-compact"><div className="dashboard-empty-icon"><Calendar size={18} /></div><div><strong>Aucune activité</strong><span>Les actions apparaîtront ici.</span></div></div>
              : activity.map(item => {
                  const prospect = (item as any).prospect
                  return (
                    <div className="dashboard-activity-row" key={item.id}>
                      <span className="dashboard-activity-dot" />
                      <div><strong>{item.contenu}{prospect ? ` — ${prospect.prenom} ${prospect.nom}` : ''}</strong><span>{timeAgo(item.created_at)}</span></div>
                    </div>
                  )
                })}
          </div>
        </div>
      </section>
    </div>
  )
}
