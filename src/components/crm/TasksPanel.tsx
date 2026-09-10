import { useEffect, useState } from 'react'
import { Plus, Check, Clock, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CrmTask, TaskPriorite, TaskType } from '../../types'
import { TASK_TYPES, TASK_PRIORITES, formatDueDate, isOverdue } from '../../lib/crm/constants'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FloatInput, FloatSelect } from '../ui/FloatInput'

interface Props {
  prospectId: string
  onChanged?: () => void
  defaultAssigne?: string
}

const EMPTY = { titre: '', type: 'relance' as TaskType, priorite: 'normale' as TaskPriorite, due_at: '' }

export function TasksPanel({ prospectId, onChanged, defaultAssigne = '' }: Props) {
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [showDone, setShowDone] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('done', { ascending: true })
      .order('due_at', { ascending: true, nullsFirst: false })
    setTasks((data || []) as CrmTask[])
    setLoading(false)
  }

  useEffect(() => { load() }, [prospectId])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function createTask() {
    if (!form.titre.trim()) return
    setSaving(true)
    await supabase.from('tasks').insert({
      prospect_id: prospectId,
      titre: form.titre.trim(),
      type: form.type,
      priorite: form.priorite,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      assigne: defaultAssigne || null,
    })
    await supabase.from('interactions').insert({
      prospect_id: prospectId, type: 'note', auteur: 'Système',
      contenu: `Tâche créée : ${form.titre.trim()}`,
    })
    setSaving(false)
    setModalOpen(false)
    setForm({ ...EMPTY })
    load()
    onChanged?.()
  }

  async function toggleDone(t: CrmTask) {
    await supabase.from('tasks').update({ done: !t.done, done_at: !t.done ? new Date().toISOString() : null }).eq('id', t.id)
    load()
    onChanged?.()
  }

  async function removeTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    load()
    onChanged?.()
  }

  const visible = tasks.filter(t => showDone || !t.done)
  const openCount = tasks.filter(t => !t.done).length

  return (
    <div className="tasks-panel">
      <div className="tasks-panel-header">
        <div className="tasks-panel-title">
          Tâches & relances {openCount > 0 && <span className="tasks-count-badge">{openCount}</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Ajouter
        </Button>
      </div>

      {loading && <div className="timeline-empty">Chargement…</div>}
      {!loading && visible.length === 0 && (
        <div className="timeline-empty">Aucune tâche en cours. Ajoutez une relance pour ne rien oublier.</div>
      )}

      <div className="tasks-list">
        {visible.map(t => {
          const late = isOverdue(t)
          const prio = TASK_PRIORITES.find(p => p.value === t.priorite)
          return (
            <div key={t.id} className={`task-row ${t.done ? 'task-done' : ''} ${late ? 'task-late' : ''}`}>
              <button className="task-check" onClick={() => toggleDone(t)} title={t.done ? 'Marquer à faire' : 'Marquer fait'}>
                {t.done ? <Check size={14} /> : <span className="task-check-empty" />}
              </button>
              <div className="task-body">
                <div className="task-titre">{t.titre}</div>
                <div className="task-meta">
                  <span className="task-prio-dot" style={{ background: prio?.color }} />
                  {TASK_TYPES.find(tt => tt.value === t.type)?.label}
                  <span className="timeline-sep">·</span>
                  <Clock size={11} style={{ verticalAlign: -1 }} /> {formatDueDate(t.due_at)}
                </div>
              </div>
              <button className="task-delete" onClick={() => removeTask(t.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>

      {tasks.some(t => t.done) && (
        <button className="tasks-toggle-done" onClick={() => setShowDone(s => !s)}>
          {showDone ? 'Masquer les tâches terminées' : `Voir les tâches terminées (${tasks.filter(t => t.done).length})`}
        </button>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle tâche"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={createTask} disabled={saving || !form.titre.trim()}>
              {saving ? 'Création…' : 'Créer la tâche'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FloatInput label="Titre de la tâche" value={form.titre} onChange={v => set('titre', v)} autoFocus />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FloatSelect label="Type" value={form.type} onChange={v => set('type', v as TaskType)} options={TASK_TYPES} />
            <FloatSelect label="Priorité" value={form.priorite} onChange={v => set('priorite', v as TaskPriorite)} options={TASK_PRIORITES} />
          </div>
          <FloatInput type="datetime-local" label="Échéance" value={form.due_at} onChange={v => set('due_at', v)} />
        </div>
      </Modal>
    </div>
  )
}
