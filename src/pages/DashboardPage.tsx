import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Plus, Users, ClipboardCheck, Calculator, FileText,
  TrendingUp, ArrowRight, Calendar,
  Wallet, FileSignature, Percent, MapPin, Download, FileSpreadsheet, FileDown, Clock, Banknote, CheckCircle2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Prospect, Visite, PageKey, Interaction, Devis, Simulation, PlanningEvent, Entreprise, Commission } from '../types'
import { PIPELINE_STAGES, stageOf, euro, timeAgo } from '../lib/crm/constants'
import { dpeColor } from '../lib/3cl/moteur3CL'
import { TodayTasksWidget } from '../components/crm/TodayTasksWidget'
import { useAuth } from '../lib/auth/AuthContext'
import { exporterDashboardPDF } from '../lib/reporting/exporterDashboardPDF'
import { exporterDashboardExcel } from '../lib/reporting/exporterDashboardExcel'

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
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const today = new Date()
    const todayKey = today.toISOString().slice(0, 10)
    const dansSeptJours = new Date(today)
    dansSeptJours.setDate(dansSeptJours.getDate() + 6)

    let agendaQuery = supabase
      .from('planning_events')
      .select('*')
      .gte('date', todayKey)
      .lte('date', dansSeptJours.toISOString().slice(0, 10))
      .order('date', { ascending: true })
      .order('heure', { ascending: true })
      .limit(6)
    if (!isAdmin && profile?.id) {
      agendaQuery = agendaQuery.or(`user_id.eq.${profile.id},user_id.is.null`)
    }

    Promise.all([
      supabase.from('prospects').select('*').order('created_at', { ascending: false }),
      supabase.from('visites').select('*, prospect(*)').order('created_at', { ascending: false }),
      supabase.from('devis').select('*').order('created_at', { ascending: false }),
      supabase.from('simulations').select('*').order('created_at', { ascending: false }),
      supabase.from('interactions').select('*, prospect:prospects(*)').order('created_at', { ascending: false }).limit(6),
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
  const visiteCount = visites.length
  const visiteTerminees = visites.filter(v => v.statut === 'terminee').length
  const enCours = visites.filter(v => v.statut === 'en_cours').length

  const pipeline = PIPELINE_STAGES.map(stage => ({
    stage: stage.label,
    count: prospects.filter(p => stageOf(p.statut).value === stage.value).length,
    color: stage.color,
  }))
  const maxCount = Math.max(...pipeline.map(p => p.count), 1)
  const pipelineValue = prospects
    .filter(p => stageOf(p.statut).value !== 'Signé')
    .reduce((sum, p) => sum + (Number(p.montant_potentiel) || 0), 0)
  const recentProspects = prospects.slice(0, 5)

  // ── Performance commerciale : tunnel visite -> devis -> signature ────────
  const devisEnvoyesOuPlus = devis.filter(d => d.statut !== 'brouillon')
  const devisSignes = devis.filter(d => d.statut === 'signe')
  const tauxVisiteVersDevis = visiteTerminees > 0 ? Math.round((devisEnvoyesOuPlus.length / visiteTerminees) * 100) : 0
  const tauxDevisVersSigne = devisEnvoyesOuPlus.length > 0 ? Math.round((devisSignes.length / devisEnvoyesOuPlus.length) * 100) : 0
  const panierMoyenSigne = devisSignes.length > 0
    ? devisSignes.reduce((sum, d) => sum + (Number(d.montant_ttc) || 0), 0) / devisSignes.length
    : 0

  // ── DPE moyen réel, calculé à partir des simulations enregistrées ───────
  const dpeMoyen = useMemo(() => {
    const valides = simulations.filter(s => s.dpe_avant)
    if (valides.length === 0) return null
    const ordre = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const consoValues = valides
      .map(s => Number((s.resultat_avant as any)?.consommationEP))
      .filter(n => !Number.isNaN(n) && n > 0)
    const consoMoyenne = consoValues.length > 0
      ? Math.round(consoValues.reduce((a, b) => a + b, 0) / consoValues.length)
      : null
    // Lettre "moyenne" = la médiane des lettres observées (approximation raisonnable,
    // plus représentative qu'une moyenne arithmétique d'un ordre alphabétique).
    const lettres = valides.map(s => ordre.indexOf(s.dpe_avant!)).filter(i => i >= 0).sort((a, b) => a - b)
    const lettreMediane = lettres.length > 0 ? ordre[lettres[Math.floor(lettres.length / 2)]] : null
    return { lettre: lettreMediane, conso: consoMoyenne, count: valides.length }
  }, [simulations])

  const avatarColors = ['#52B788', '#3A86C8', '#D4A574', '#E8A317', '#B3D300', '#FC7400']
  const TYPE_LABEL: Record<string, string> = { visite: 'Visite technique', rdv: 'Rendez-vous', formation: 'Formation' }

  // ── Commissions : mises en avant en haut de dashboard (visible immédiatement) ──
  const commissionsEnAttente = useMemo(() => commissions.filter(c => c.statut === 'en_attente'), [commissions])
  const totalCommissionsEnAttente = commissionsEnAttente.reduce((s, c) => s + (Number(c.montant_commercial) || 0), 0)
  const totalCommissionsValidees = useMemo(
    () => commissions.filter(c => c.statut === 'validee').reduce((s, c) => s + (Number(c.montant_commercial) || 0), 0),
    [commissions]
  )
  const totalCommissionsPayeesMois = useMemo(() => {
    const now = new Date()
    return commissions
      .filter(c => c.statut === 'payee' && new Date(c.date_validation || c.date_generation).getMonth() === now.getMonth()
        && new Date(c.date_validation || c.date_generation).getFullYear() === now.getFullYear())
      .reduce((s, c) => s + (Number(c.montant_commercial) || 0), 0)
  }, [commissions])

  return (
    <div className="page">
      {/* Hero banner + DPE */}
      <div className="dashboard-hero">
        <div className="hero-banner">
          <div className="hero-content">
            <div className="hero-eyebrow">Bonjour {(profile?.nom_complet || '').split(' ')[0] || ''}</div>
            <h1 className="hero-title">Vous avez {prospectCount} prospects et {visiteCount} visites à traiter aujourd'hui</h1>
            <p className="hero-desc">Pilotez vos projets de rénovation énergétique, du premier contact à la signature du dossier MaPrimeRénov'.</p>
          </div>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={() => onNavigate('prospects')}>
              <Plus size={18} /> Nouveau prospect
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('visites')}>
              <ClipboardCheck size={18} /> Démarrer une visite
            </button>
            <div ref={exportMenuRef} style={{ position: 'relative' }}>
              <button className="btn btn-secondary" onClick={() => setExportMenuOpen(o => !o)}>
                <Download size={18} /> Exporter
              </button>
              {exportMenuOpen && (
                <div className="card" style={{ position: 'absolute', top: '110%', right: 0, zIndex: 20, minWidth: 200, padding: 6 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                    onClick={() => {
                      exporterDashboardPDF({ prospects, visites, devis, entreprise, periodeLabel: 'Vue complète' })
                      setExportMenuOpen(false)
                    }}
                  >
                    <FileDown size={16} /> Rapport PDF
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                    onClick={() => {
                      exporterDashboardExcel({ prospects, visites, devis, periodeLabel: 'Vue complète' })
                      setExportMenuOpen(false)
                    }}
                  >
                    <FileSpreadsheet size={16} /> Export Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hero-dpe-card">
          <div className="hero-dpe-header">
            <div className="hero-dpe-title">DPE Moyen — Avant travaux</div>
          </div>
          {dpeMoyen && dpeMoyen.lettre ? (
            <div className="hero-dpe-content">
              <div className={`hero-dpe-letter ${dpeMoyen.lettre}`}>{dpeMoyen.lettre}</div>
              <div className="hero-dpe-info">
                <div className="kwh">{dpeMoyen.conso ?? '—'}<span>kWh/m².an</span></div>
                <div className="label">Sur {dpeMoyen.count} simulation{dpeMoyen.count > 1 ? 's' : ''} enregistrée{dpeMoyen.count > 1 ? 's' : ''}</div>
                <div className="dpe-scale" style={{ marginTop: 10 }}>
                  {['A','B','C','D','E','F','G'].map(l => (
                    <div key={l} className={`dpe-bar dpe-bar-${l} ${l === dpeMoyen.lettre ? 'current' : ''}`}>{l}</div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="hero-dpe-content">
              <div className="hero-dpe-info">
                <div className="label" style={{ padding: '12px 0' }}>
                  Pas encore de simulation enregistrée. Réalisez une visite technique et enregistrez le DPE pour voir apparaître la moyenne ici.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Commissions — mises en avant juste sous le bandeau d'accueil */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title flex items-center gap-2">
            <Wallet size={16} /> {isAdmin ? 'Commissions de l\'équipe' : 'Mes commissions'}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('commissions')}>
            Voir le détail <ArrowRight size={16} />
          </button>
        </div>
        <div className="card-body">
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <div className="kpi-tile" style={{ cursor: 'pointer' }} onClick={() => onNavigate('commissions')}>
              <div className="kpi-tile-top"><div className="kpi-tile-icon amber"><Clock size={20} /></div></div>
              <div className="kpi-tile-value">{euro(totalCommissionsEnAttente)}</div>
              <div className="kpi-tile-label">En attente</div>
              <div className="kpi-tile-delta up">{commissionsEnAttente.length} commission{commissionsEnAttente.length > 1 ? 's' : ''}</div>
            </div>
            <div className="kpi-tile" style={{ cursor: 'pointer' }} onClick={() => onNavigate('commissions')}>
              <div className="kpi-tile-top"><div className="kpi-tile-icon blue"><CheckCircle2 size={20} /></div></div>
              <div className="kpi-tile-value">{euro(totalCommissionsValidees)}</div>
              <div className="kpi-tile-label">Validées</div>
              <div className="kpi-tile-delta up">À paraître au prochain versement</div>
            </div>
            <div className="kpi-tile" style={{ cursor: 'pointer' }} onClick={() => onNavigate('commissions')}>
              <div className="kpi-tile-top"><div className="kpi-tile-icon green"><Banknote size={20} /></div></div>
              <div className="kpi-tile-value">{euro(totalCommissionsPayeesMois)}</div>
              <div className="kpi-tile-label">Payées ce mois-ci</div>
              <div className="kpi-tile-delta up">
                <TrendingUp size={14} /> {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid">
        <div className="kpi-tile">
          <div className="kpi-tile-top">
            <div className="kpi-tile-icon green"><Users size={20} /></div>
          </div>
          <div className="kpi-tile-value">{prospectCount}</div>
          <div className="kpi-tile-label">Prospects actifs</div>
          <div className="kpi-tile-delta up"><TrendingUp size={14} /> {prospects.filter(p => stageOf(p.statut).value === 'Nouveau').length} nouveaux</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-top">
            <div className="kpi-tile-icon blue"><ClipboardCheck size={20} /></div>
          </div>
          <div className="kpi-tile-value">{visiteCount}</div>
          <div className="kpi-tile-label">Visites techniques</div>
          <div className="kpi-tile-delta up"><TrendingUp size={14} /> {enCours} en cours</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-top">
            <div className="kpi-tile-icon amber"><Calculator size={20} /></div>
          </div>
          <div className="kpi-tile-value">{visiteTerminees}</div>
          <div className="kpi-tile-label">Visites terminées</div>
          <div className="kpi-tile-delta up"><TrendingUp size={14} /> {simulations.length} simulation{simulations.length > 1 ? 's' : ''} 3CL</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-top">
            <div className="kpi-tile-icon accent"><Wallet size={20} /></div>
          </div>
          <div className="kpi-tile-value">{euro(pipelineValue)}</div>
          <div className="kpi-tile-label">CA pipeline (hors signés)</div>
          <div className="kpi-tile-delta up"><TrendingUp size={14} /> {devisSignes.length} devis signés</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        {[
          { icon: <Users size={22} />, label: 'Prospect', desc: 'Ajouter un contact', color: '#52B788', page: 'prospects' as PageKey },
          { icon: <ClipboardCheck size={22} />, label: 'Visite', desc: 'Démarrer un audit', color: '#3A86C8', page: 'visites' as PageKey },
          { icon: <Calculator size={22} />, label: 'Simulation', desc: 'Calculer un DPE', color: '#D4A574', page: 'simulations' as PageKey },
          { icon: <FileText size={22} />, label: 'Dossier', desc: 'Créer un dossier', color: '#E8A317', page: 'dossiers' as PageKey },
        ].map(a => (
          <button key={a.label} className="quick-action" onClick={() => onNavigate(a.page)}>
            <div className="quick-action-icon" style={{ background: a.color }}>{a.icon}</div>
            <div className="quick-action-label">{a.label}</div>
            <div className="quick-action-desc">{a.desc}</div>
          </button>
        ))}
      </div>

      {/* Pipeline + Funnel */}
      <div className="dash-cols">
        <div className="card pipeline-card">
          <div className="card-header">
            <div className="card-title">Prospects récents</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('prospects')}>
              Voir tout <ArrowRight size={16} />
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-muted)' }}>Chargement…</div>}
            {!loading && prospects.length === 0 && (
              <div className="empty-state">
                <Users />
                <h3>Aucun prospect</h3>
                <p>Commencez par ajouter votre premier prospect.</p>
                <button className="btn btn-primary" onClick={() => onNavigate('prospects')}>
                  <Plus size={18} /> Ajouter un prospect
                </button>
              </div>
            )}
            {!loading && prospects.length > 0 && (
              <div className="pipeline-list">
                {recentProspects.map((p, i) => (
                  <div key={p.id} className="pipeline-item" onClick={() => onNavigate('prospects')}>
                    <div className="pipeline-avatar" style={{ background: avatarColors[i % avatarColors.length] }}>
                      {(p.prenom?.[0] || '') + (p.nom?.[0] || '')}
                    </div>
                    <div className="pipeline-info">
                      <div className="pipeline-name">{p.prenom} {p.nom}</div>
                      <div className="pipeline-meta">
                        <span>{p.ville || '—'}</span>
                        {p.email && <span>{p.email}</span>}
                      </div>
                    </div>
                    <div className="pipeline-stage">
                      <span className="badge badge-info">{p.statut}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tunnel de conversion</div>
          </div>
          <div className="card-body">
            <div className="funnel">
              {pipeline.map(p => (
                <div key={p.stage} className="funnel-row">
                  <div className="funnel-label">{p.stage}</div>
                  <div className="funnel-bar">
                    <div className="funnel-bar-fill" style={{ width: `${(p.count / maxCount) * 100}%`, background: p.color }} />
                  </div>
                  <div className="funnel-count">{p.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Performance commerciale : tunnel visite -> devis -> signature */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">Performance commerciale</div>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('devis')}>
            Voir les devis <ArrowRight size={16} />
          </button>
        </div>
        <div className="card-body">
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <div className="kpi-tile">
              <div className="kpi-tile-top"><div className="kpi-tile-icon blue"><ClipboardCheck size={20} /></div></div>
              <div className="kpi-tile-value">{visiteTerminees}</div>
              <div className="kpi-tile-label">Visites terminées</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile-top"><div className="kpi-tile-icon amber"><FileText size={20} /></div></div>
              <div className="kpi-tile-value">{devisEnvoyesOuPlus.length}</div>
              <div className="kpi-tile-label">Devis envoyés</div>
              <div className="kpi-tile-delta up"><Percent size={14} /> {tauxVisiteVersDevis}% des visites</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile-top"><div className="kpi-tile-icon green"><FileSignature size={20} /></div></div>
              <div className="kpi-tile-value">{devisSignes.length}</div>
              <div className="kpi-tile-label">Devis signés</div>
              <div className="kpi-tile-delta up"><Percent size={14} /> {tauxDevisVersSigne}% des devis envoyés</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile-top"><div className="kpi-tile-icon accent"><Wallet size={20} /></div></div>
              <div className="kpi-tile-value">{panierMoyenSigne > 0 ? euro(panierMoyenSigne) : '—'}</div>
              <div className="kpi-tile-label">Panier moyen signé</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dernières commissions (tous statuts) — la synthèse chiffrée est juste au-dessus */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title flex items-center gap-2">
            <Wallet size={16} /> Dernières commissions
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('commissions')}>
            Voir tout <ArrowRight size={16} />
          </button>
        </div>
        <div className="card-body">
          {commissions.length === 0 ? (
            <div style={{ color: 'var(--c-text-muted)', padding: '8px 0' }}>
              Aucune commission pour le moment. Elles apparaîtront automatiquement dès qu'une VT
              vous sera attribuée ou qu'un de vos devis sera signé.
            </div>
          ) : (
            <div className="activity-list">
              {commissions.slice(0, 5).map(c => (
                <div className="activity-item" key={c.id}>
                  <div className={`activity-dot ${c.statut === 'payee' ? 'green' : c.statut === 'validee' ? 'blue' : c.statut === 'annulee' ? 'accent' : 'amber'}`} />
                  <div className="activity-content">
                    <div className="activity-text">
                      {c.libelle}
                      {isAdmin && c.commercial?.nom_complet && <> — <b>{c.commercial.nom_complet}</b></>}
                    </div>
                    <div className="activity-time">{timeAgo(c.date_generation)}</div>
                  </div>
                  <div className="font-semibold">{euro(c.montant_commercial)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tâches + Activity + Agenda */}
      <div className="dash-cols-3">
        <TodayTasksWidget onNavigate={onNavigate} limit={5} />

        <div className="card">
          <div className="card-header">
            <div className="card-title">Activité récente</div>
          </div>
          <div className="card-body">
            {activity.length === 0 ? (
              <div style={{ color: 'var(--c-text-muted)', padding: '8px 0' }}>Aucune activité enregistrée pour l'instant.</div>
            ) : (
              <div className="activity-list">
                {activity.map(a => {
                  const dotColor = a.type === 'statut' ? 'green' : a.type === 'devis' ? 'accent' : a.type === 'visite' ? 'amber' : 'blue'
                  const p: any = (a as any).prospect
                  return (
                    <div className="activity-item" key={a.id}>
                      <div className={`activity-dot ${dotColor}`} />
                      <div className="activity-content">
                        <div className="activity-text">
                          {a.contenu}
                          {p && <> — <b>{p.prenom} {p.nom}</b></>}
                        </div>
                        <div className="activity-time">{timeAgo(a.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Agenda</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('planning')}>
              <Calendar size={16} /> Ouvrir
            </button>
          </div>
          <div className="card-body">
            {agendaEvents.length === 0 ? (
              <div style={{ color: 'var(--c-text-muted)', padding: '8px 0' }}>
                Aucun événement prévu dans les 7 prochains jours.
              </div>
            ) : (
              (() => {
                const todayKey = new Date().toISOString().slice(0, 10)
                let dernierJour = ''
                return agendaEvents.map(e => {
                  const jourKey = (e.date || '').slice(0, 10)
                  const changementJour = jourKey !== dernierJour
                  dernierJour = jourKey
                  const label = jourKey === todayKey
                    ? "Aujourd'hui"
                    : new Date(jourKey).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
                  return (
                    <div key={e.id}>
                      {changementJour && <div className="agenda-day">{label}</div>}
                      <div className="agenda-item">
                        <div className="agenda-time">{e.heure}</div>
                        <div className="agenda-info">
                          <div className="agenda-title">{TYPE_LABEL[e.type] || e.type} — {e.titre}</div>
                          {e.adresse && (
                            <div className="agenda-loc"><MapPin size={11} style={{ display: 'inline', marginRight: 4 }} />{e.adresse}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
