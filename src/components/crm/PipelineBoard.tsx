import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Flame, Snowflake, Minus, Clock } from 'lucide-react'
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

export function PipelineBoard({ prospects, tasksByProspect, onOpen, onStageChange }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<string | null>(null)
  const [paidCommissionProspectIds, setPaidCommissionProspectIds] = useState<Set<string>>(new Set())

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
    document.addEventListener('visibilitychange', refresh)
    const interval = window.setInterval(loadPaidCommissionProspects, 5000)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(interval)
    }
  }, [prospects])

  const columns = useMemo(() => {
    return PIPELINE_STAGES.map(stage => {
      const items = prospects.filter(p => {
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
  }, [prospects, paidCommissionProspectIds])

  const inactivityDays = (iso: string | null | undefined) => {
    if (!iso) return null
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    return Math.max(0, diff)
  }

  return (
    <div className="kanban-board">
      {columns.map(col => (
        <div
          key={col.stage.value}
          className={`kanban-column ${overStage === col.stage.value ? 'kanban-column-over' : ''}`}
          style={{ '--kanban-accent': col.stage.color } as CSSProperties}
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
          <div className="kanban-col-header">
            <div className="kanban-col-title-wrap">
              <span className="kanban-col-dot" style={{ background: col.stage.color }} />
              <div>
                <span className="kanban-col-title">{col.stage.label}</span>
                <span className="kanban-col-description">{col.stage.description}</span>
              </div>
            </div>
            <span className="kanban-col-count">{col.items.length}</span>
          </div>
          <div className="kanban-col-total"><span>Valeur du pipeline</span><strong>{euro(col.total)}</strong></div>

          <div className="kanban-col-body">
            {col.items.length === 0 && (
              <div className="kanban-empty">
                <span>Déposez un prospect ici</span>
                <small>Glissez une carte depuis une autre étape</small>
              </div>
            )}
            {col.items.map(p => {
              const openTasks = (tasksByProspect[p.id] || []).filter(t => !t.done)
              const nextTask = openTasks[0]
              const late = nextTask && isOverdue(nextTask)
              const TempIcon = TEMP_ICON[p.temperature || 'tiede']
              const days = inactivityDays(p.derniere_interaction_at)
              const hot = p.temperature === 'chaud'
              const project = p.tags?.[0] || 'Projet énergétique'
              return (
                <div
                  key={p.id}
                  className="kanban-card"
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('text/prospect-id', p.id); setDragId(p.id) }}
                  onDragEnd={() => { setDragId(null); setOverStage(null) }}
                  onClick={() => onOpen(p)}
                >
                  <div className="kanban-card-top">
                    <span className={`kanban-temp-badge ${p.temperature || 'tiede'}`}>
                      <TempIcon size={12} /> {p.temperature === 'chaud' ? 'Lead chaud' : p.temperature === 'froid' ? 'Lead froid' : 'Lead tiède'}
                    </span>
                    <span className="kanban-card-id">#{p.id.slice(0, 6).toUpperCase()}</span>
                  </div>

                  <div className="kanban-card-main">
                    <div className="kanban-card-avatar">{initials(p.prenom, p.nom)}</div>
                    <div className="kanban-card-title-block">
                      <h4>{p.prenom} {p.nom}</h4>
                      <p>{project}</p>
                    </div>
                  </div>

                  <div className="kanban-card-meta">
                    <span>📍 {p.ville || 'Ville non renseignée'}</span>
                    <span>👤 {p.commercial || 'Non attribué'}</span>
                  </div>

                  {(days !== null && days >= 3) && (
                    <div className={`kanban-card-alert ${days >= 7 ? 'danger' : ''}`}>
                      <Clock size={13} />
                      <span>Sans action depuis {days} jour{days > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {nextTask && !late && (
                    <div className="kanban-card-next-task">
                      <Clock size={13} /> Prochaine action : {formatDueDate(nextTask.due_at)}
                    </div>
                  )}
                  {nextTask && late && (
                    <div className="kanban-card-alert danger">
                      <Clock size={13} /> <span>Action en retard — {formatDueDate(nextTask.due_at)}</span>
                    </div>
                  )}

                  {(p.tags || []).length > 0 && (
                    <div className="kanban-card-tags">
                      {p.tags.slice(0, 3).map(t => <span key={t} className="kanban-tag">{t}</span>)}
                    </div>
                  )}

                  <div className="kanban-card-bottom">
                    <span />
                    <button
                      type="button"
                      className={`kanban-relance-btn ${hot ? 'hot' : ''}`}
                      onClick={e => { e.stopPropagation(); onOpen(p) }}
                    >
                      Relancer
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
