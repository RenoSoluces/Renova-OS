import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Flame, Snowflake, Minus, Clock, CalendarClock, AlertCircle, MapPin, UserRound, Inbox, Search, X, SlidersHorizontal } from 'lucide-react'
import type { Prospect, CrmTask } from '../../types'
import { supabase } from '../../lib/supabase'
import { PIPELINE_STAGES, stageOf, euro, formatDueDate, isOverdue, isProspectTerminal } from '../../lib/crm/constants'

interface Props {
  prospects: Prospect[]
  tasksByProspect: Record<string, CrmTask[]>
  onOpen: (p: Prospect) => void
  onStageChange: (prospectId: string, newStatut: string) => void
}

function initials(prenom: string, nom: string) {
  return `${(prenom?.[0] || '').toUpperCase()}${(nom?.[0] || '').toUpperCase()}`
}

const TEMP_ICON: Record<string, any> = { chaud: Flame, froid: Snowflake, tiede: Minus }
const TEMP_LABEL: Record<string, string> = { chaud: 'Lead chaud', froid: 'Lead froid', tiede: 'Lead tiède' }

export function PipelineBoard({ prospects, tasksByProspect, onOpen, onStageChange }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<string | null>(null)
  const [paidCommissionProspectIds, setPaidCommissionProspectIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [temperatureFilter, setTemperatureFilter] = useState('tous')
  const [urgentOnly, setUrgentOnly] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPaidCommissionProspects() {
      // On considère la commission comme payée dès qu'un paiement a été
      // enregistré (commercial ou société), ou que son statut est `payee`.
      // On évite un filtre Supabase OR ici : cela rend le contrôle beaucoup
      // plus fiable quel que soit le statut enregistré en base.
      const { data: commissions, error } = await supabase
        .from('commissions')
        .select('reference_type, reference_id, statut, date_paiement_commercial, date_paiement_societe')

      if (error || cancelled) return

      const paid = (commissions || []).filter(c =>
        c.statut === 'payee' ||
        !!c.date_paiement_commercial ||
        !!c.date_paiement_societe
      )

      const devisIds = paid
        .filter(c => c.reference_type === 'devis' && c.reference_id)
        .map(c => c.reference_id as string)
      const visiteIds = paid
        .filter(c => c.reference_type === 'visites' && c.reference_id)
        .map(c => c.reference_id as string)

      const eventIds = paid
        .filter(c => c.reference_type === 'planning_events' && c.reference_id)
        .map(c => c.reference_id as string)

      const prospectIds = new Set<string>()

      if (devisIds.length) {
        const { data } = await supabase
          .from('devis')
          .select('id, prospect_id')
          .in('id', devisIds)
        for (const row of data || []) {
          if (row.prospect_id) prospectIds.add(row.prospect_id)
        }
      }

      if (visiteIds.length) {
        const { data } = await supabase
          .from('visites')
          .select('id, prospect_id')
          .in('id', visiteIds)
        for (const row of data || []) {
          if (row.prospect_id) prospectIds.add(row.prospect_id)
        }
      }

      if (eventIds.length) {
        const { data } = await supabase
          .from('planning_events')
          .select('id, prospect_id')
          .in('id', eventIds)
        for (const row of data || []) {
          if (row.prospect_id) prospectIds.add(row.prospect_id)
        }
      }

      if (!cancelled) setPaidCommissionProspectIds(prospectIds)
    }

    loadPaidCommissionProspects()

    // Si l'admin marque une commission payée depuis un autre écran,
    // le Pipeline se rafraîchit automatiquement sans nécessiter un reload.
    const refresh = () => { loadPaidCommissionProspects() }
    window.addEventListener('focus', refresh)
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisibilityChange)
    // La visibilité est également contrôlée à la reprise ; le polling de secours
    // reste volontairement léger pour éviter 12 requêtes toutes les 5 secondes.
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadPaidCommissionProspects()
    }, 30000)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearInterval(interval)
    }
  }, [prospects])

  const filteredProspects = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('fr')
    return prospects.filter(p => {
      if (q) {
        const haystack = [p.prenom, p.nom, p.ville, p.commercial, p.email, p.telephone, p.source, p.raison_sociale, ...(p.tags || [])]
          .filter(Boolean).join(' ').toLocaleLowerCase('fr')
        if (!haystack.includes(q)) return false
      }
      if (temperatureFilter !== 'tous' && (p.temperature || 'tiede') !== temperatureFilter) return false
      if (urgentOnly) {
        const tasks = (tasksByProspect[p.id] || []).filter(t => !t.done)
        const hasLateTask = tasks.some(isOverdue)
        const days = p.derniere_interaction_at
          ? Math.floor((Date.now() - new Date(p.derniere_interaction_at).getTime()) / 86400000)
          : null
        if (!hasLateTask && !(p.temperature === 'chaud') && !(days !== null && days >= 7)) return false
      }
      return true
    })
  }, [prospects, tasksByProspect, search, temperatureFilter, urgentOnly])

  const columns = useMemo(() => {
    return PIPELINE_STAGES.map(stage => {
      const items = filteredProspects.filter(p => {
        if (isProspectTerminal(p.statut)) return false
        if (stageOf(p.statut).value !== stage.value) return false
        // Une fois la commission payée, le dossier quitte le Pipeline
        // lorsqu'il est arrivé à l'étape Installation.
        if (stage.value === 'Installation' && paidCommissionProspectIds.has(p.id)) return false
        return true
      })
      const total = items.reduce((s, p) => s + (Number(p.montant_potentiel) || 0), 0)
      return { stage, items, total }
    })
  }, [filteredProspects, paidCommissionProspectIds])

  const inactivityDays = (iso: string | null | undefined) => {
    if (!iso) return null
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    return Math.max(0, diff)
  }

  // Synthèse affichée au-dessus du tableau : mêmes prospects que les colonnes.
  const summary = useMemo(() => {
    const all = columns.flatMap(c => c.items)
    const late = all.filter(p => {
      const t = (tasksByProspect[p.id] || []).find(x => !x.done)
      return !!t && isOverdue(t)
    }).length
    return {
      count: all.length,
      total: columns.reduce((s, c) => s + c.total, 0),
      hot: all.filter(p => p.temperature === 'chaud').length,
      late,
    }
  }, [columns, tasksByProspect])

  return (
    <section className="pl" aria-label="Pipeline commercial">
      <div className="pl-summary">
        <div className="pl-stat"><span>Prospects en cours</span><strong>{summary.count}</strong></div>
        <div className="pl-stat"><span>Valeur potentielle</span><strong>{euro(summary.total)}</strong></div>
        <div className="pl-stat pl-stat-hot"><span>Leads chauds</span><strong>{summary.hot}</strong></div>
        <div className={`pl-stat ${summary.late ? 'pl-stat-late' : ''}`}><span>Actions en retard</span><strong>{summary.late}</strong></div>
      </div>

      <div className="pl-toolbar" aria-label="Filtres du Pipeline">
        <label className="pl-search">
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom, téléphone, e-mail, ville, commercial…"
            aria-label="Rechercher dans le Pipeline"
          />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Effacer la recherche"><X size={15} /></button>}
        </label>
        <label className="pl-filter">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span>Température</span>
          <select value={temperatureFilter} onChange={e => setTemperatureFilter(e.target.value)} aria-label="Filtrer par température">
            <option value="tous">Toutes</option>
            <option value="chaud">Chauds</option>
            <option value="tiede">Tièdes</option>
            <option value="froid">Froids</option>
          </select>
        </label>
        <label className={`pl-urgent-toggle ${urgentOnly ? 'is-active' : ''}`}>
          <input type="checkbox" checked={urgentOnly} onChange={e => setUrgentOnly(e.target.checked)} />
          <AlertCircle size={15} />
          <span>Prioritaires</span>
        </label>
        {(search || temperatureFilter !== 'tous' || urgentOnly) && (
          <button type="button" className="pl-reset" onClick={() => { setSearch(''); setTemperatureFilter('tous'); setUrgentOnly(false) }}>
            Réinitialiser
          </button>
        )}
        <span className="pl-result-count">{filteredProspects.length} / {prospects.length} prospects</span>
      </div>

      <div className="pl-board">
        {columns.map(col => {
          const share = summary.total > 0 ? Math.round((col.total / summary.total) * 100) : 0
          return (
            <div
              key={col.stage.value}
              className={`pl-lane ${overStage === col.stage.value ? 'is-over' : ''}`}
              style={{ '--stage': col.stage.color } as CSSProperties}
              role="group"
              aria-label={`${col.stage.label} : ${col.items.length} prospect${col.items.length > 1 ? 's' : ''}`}
              onDragOver={e => { e.preventDefault(); setOverStage(col.stage.value) }}
              onDragLeave={() => setOverStage(s => (s === col.stage.value ? null : s))}
              onDrop={e => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/prospect-id') || dragId
                if (id) onStageChange(id, col.stage.value)
                setOverStage(null)
                setDragId(null)
              }}
            >
              <header className="pl-lane-head" title={col.stage.description}>
                <div className="pl-lane-row">
                  <span className="pl-lane-dot" />
                  <h3 className="pl-lane-title">{col.stage.label}</h3>
                  <span className="pl-lane-count">{col.items.length}</span>
                </div>
                <div className="pl-lane-row pl-lane-money">
                  <strong>{euro(col.total)}</strong>
                  <span>{share}% de la valeur</span>
                </div>
                <div className="pl-lane-bar" aria-hidden="true"><i style={{ width: `${share}%` }} /></div>
              </header>

              <div className="pl-lane-body">
                {col.items.length === 0 && (
                  <div className="pl-empty">
                    <Inbox size={20} />
                    <span>Aucun prospect</span>
                    <small>Glissez une carte ici</small>
                  </div>
                )}
                {col.items.map(p => {
                  const openTasks = (tasksByProspect[p.id] || []).filter(t => !t.done)
                  const nextTask = openTasks[0]
                  const late = !!nextTask && isOverdue(nextTask)
                  const temp = p.temperature || 'tiede'
                  const TempIcon = TEMP_ICON[temp] || Minus
                  const days = inactivityDays(p.derniere_interaction_at)
                  const hot = temp === 'chaud'
                  const project = p.tags?.[0] || 'Projet énergétique'
                  const montant = Number(p.montant_potentiel) || 0
                  const extraTags = (p.tags || []).slice(1)
                  return (
                    <article
                      key={p.id}
                      className={`pl-card ${dragId === p.id ? 'is-dragging' : ''}`}
                      draggable
                      tabIndex={0}
                      aria-label={`${p.prenom} ${p.nom}, ${col.stage.label}`}
                      onDragStart={e => { e.dataTransfer.setData('text/prospect-id', p.id); setDragId(p.id) }}
                      onDragEnd={() => { setDragId(null); setOverStage(null) }}
                      onClick={() => onOpen(p)}
                      onKeyDown={e => {
                        if (e.target !== e.currentTarget) return
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p) }
                      }}
                    >
                      <div className="pl-card-head">
                        <span className="pl-avatar" aria-hidden="true">{initials(p.prenom, p.nom)}</span>
                        <div className="pl-card-who">
                          <h4 title={`Dossier #${p.id.slice(0, 6).toUpperCase()}`}>{p.prenom} {p.nom}</h4>
                          <p>{project}</p>
                        </div>
                        <span className={`pl-temp pl-temp-${temp}`} title={TEMP_LABEL[temp]} aria-label={TEMP_LABEL[temp]}>
                          <TempIcon size={15} />
                        </span>
                      </div>

                      <ul className="pl-facts">
                        <li><MapPin size={13} /><span>{p.ville || 'Ville non renseignée'}</span></li>
                        <li><UserRound size={13} /><span>{p.commercial || 'Non attribué'}</span></li>
                      </ul>

                      {(late || (days !== null && days >= 3) || (nextTask && !late) || extraTags.length > 0) && (
                        <div className="pl-signals">
                          {late && nextTask && (
                            <span className="pl-chip pl-chip-danger"><AlertCircle size={12} />{formatDueDate(nextTask.due_at)}</span>
                          )}
                          {days !== null && days >= 3 && (
                            <span className={`pl-chip ${days >= 7 ? 'pl-chip-danger' : 'pl-chip-warn'}`}>
                              <Clock size={12} />Sans action depuis {days} j
                            </span>
                          )}
                          {nextTask && !late && (
                            <span className="pl-chip pl-chip-ok"><CalendarClock size={12} />{formatDueDate(nextTask.due_at)}</span>
                          )}
                          {extraTags.slice(0, 2).map(t => <span key={t} className="pl-chip pl-chip-tag">{t}</span>)}
                          {extraTags.length > 2 && <span className="pl-chip pl-chip-tag">+{extraTags.length - 2}</span>}
                        </div>
                      )}

                      <footer className="pl-card-foot">
                        <span className={`pl-amount ${montant > 0 ? '' : 'is-empty'}`}>{montant > 0 ? euro(montant) : 'À estimer'}</span>
                        <select
                          className="pl-move"
                          aria-label={`Déplacer ${p.prenom} ${p.nom} vers une autre étape`}
                          value={col.stage.value}
                          draggable={false}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.stopPropagation(); if (e.target.value !== col.stage.value) onStageChange(p.id, e.target.value) }}
                        >
                          {PIPELINE_STAGES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                        </select>
                        <button
                          type="button"
                          className={`pl-btn ${hot ? 'is-hot' : ''}`}
                          onClick={e => { e.stopPropagation(); onOpen(p) }}
                        >
                          Relancer
                        </button>
                      </footer>
                    </article>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
