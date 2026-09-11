import { useMemo, useState } from 'react'
import { Flame, Snowflake, Minus, Clock } from 'lucide-react'
import type { Prospect, CrmTask } from '../../types'
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

  const columns = useMemo(() => {
    return PIPELINE_STAGES.map(stage => {
      const items = prospects.filter(p => !isProspectTerminal(p.statut) && stageOf(p.statut).value === stage.value)
      const total = items.reduce((s, p) => s + (Number(p.montant_potentiel) || 0), 0)
      return { stage, items, total }
    })
  }, [prospects])

  return (
    <div className="kanban-board">
      {columns.map(col => (
        <div
          key={col.stage.value}
          className={`kanban-column ${overStage === col.stage.value ? 'kanban-column-over' : ''}`}
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
            <span className="kanban-col-dot" style={{ background: col.stage.color }} />
            <span className="kanban-col-title">{col.stage.label}</span>
            <span className="kanban-col-count">{col.items.length}</span>
          </div>
          <div className="kanban-col-total">{euro(col.total)}</div>

          <div className="kanban-col-body">
            {col.items.length === 0 && (
              <div className="kanban-empty">Glissez une carte ici</div>
            )}
            {col.items.map(p => {
              const openTasks = (tasksByProspect[p.id] || []).filter(t => !t.done)
              const nextTask = openTasks[0]
              const late = nextTask && isOverdue(nextTask)
              const TempIcon = TEMP_ICON[p.temperature || 'tiede']
              return (
                <div
                  key={p.id}
                  className="kanban-card"
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('text/prospect-id', p.id); setDragId(p.id) }}
                  onClick={() => onOpen(p)}
                >
                  <div className="kanban-card-top">
                    <div className="kanban-card-avatar">{initials(p.prenom, p.nom)}</div>
                    <div className="kanban-card-name">{p.prenom} {p.nom}</div>
                    {p.temperature && <TempIcon size={13} className={`kanban-temp kanban-temp-${p.temperature}`} />}
                  </div>
                  <div className="kanban-card-ville">{p.ville || '—'}</div>
                  {(p.tags || []).length > 0 && (
                    <div className="kanban-card-tags">
                      {p.tags.slice(0, 3).map(t => <span key={t} className="kanban-tag">{t}</span>)}
                    </div>
                  )}
                  <div className="kanban-card-bottom">
                    <span className="kanban-card-montant">{euro(p.montant_potentiel)}</span>
                    {nextTask && (
                      <span className={`kanban-card-task ${late ? 'late' : ''}`}>
                        <Clock size={11} /> {formatDueDate(nextTask.due_at)}
                      </span>
                    )}
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
