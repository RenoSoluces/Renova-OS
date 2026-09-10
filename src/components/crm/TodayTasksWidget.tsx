import { useEffect, useState } from 'react'
import { Check, Clock, AlertTriangle, ListChecks } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CrmTask, PageKey } from '../../types'
import { formatDueDate, isOverdue, TASK_TYPES } from '../../lib/crm/constants'

interface Props {
  onNavigate?: (p: PageKey) => void
  limit?: number
}

export function TodayTasksWidget({ onNavigate, limit = 6 }: Props) {
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    const { data } = await supabase
      .from('tasks')
      .select('*, prospect:prospects(*)')
      .eq('done', false)
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(50)
    const all = (data || []) as CrmTask[]
    const relevant = all.filter(t => !t.due_at || new Date(t.due_at) <= endOfToday)
    setTasks(relevant.slice(0, limit))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleDone(t: CrmTask) {
    await supabase.from('tasks').update({ done: true, done_at: new Date().toISOString() }).eq('id', t.id)
    load()
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><ListChecks size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Tâches & relances du jour</div>
        {onNavigate && (
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('prospects')}>Voir les prospects</button>
        )}
      </div>
      <div className="card-body" style={{ padding: tasks.length ? 0 : undefined }}>
        {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--c-text-muted)' }}>Chargement…</div>}
        {!loading && tasks.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <Check />
            <h3>Rien en retard</h3>
            <p>Aucune tâche urgente pour aujourd'hui.</p>
          </div>
        )}
        {!loading && tasks.length > 0 && (
          <div className="today-tasks-list">
            {tasks.map(t => {
              const late = isOverdue(t)
              return (
                <div key={t.id} className={`today-task-row ${late ? 'late' : ''}`}>
                  <button className="task-check" onClick={() => toggleDone(t)}>
                    <span className="task-check-empty" />
                  </button>
                  <div className="today-task-body">
                    <div className="today-task-titre">
                      {late && <AlertTriangle size={12} style={{ verticalAlign: -1, marginRight: 4 }} />}
                      {t.titre}
                      {t.prospect && <span className="today-task-prospect"> — {t.prospect.prenom} {t.prospect.nom}</span>}
                    </div>
                    <div className="today-task-meta">
                      {TASK_TYPES.find(tt => tt.value === t.type)?.label}
                      <span className="timeline-sep">·</span>
                      <Clock size={11} style={{ verticalAlign: -1 }} /> {formatDueDate(t.due_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
