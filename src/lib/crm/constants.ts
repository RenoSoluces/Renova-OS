// Source unique de vérité pour le pipeline commercial.
// Le statut stocké en base sur `prospects.statut` doit toujours correspondre
// à l'une de ces valeurs (comparaison insensible à la casse/accents via normalizeStatut).

export interface PipelineStage {
  value: string
  label: string
  color: string
  description: string
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { value: 'Nouveau', label: 'Nouveau', color: '#3A86C8', description: 'Vient d\'entrer dans le pipeline' },
  { value: 'Qualifié', label: 'Qualifié', color: '#52B788', description: 'Contact confirmé, besoin identifié' },
  { value: 'Visite planifiée', label: 'Visite planifiée', color: '#D4A574', description: 'RDV technique posé' },
  { value: 'Visite faite', label: 'Visite faite', color: '#E8A317', description: 'Audit réalisé, en attente de proposition' },
  { value: 'Dossier', label: 'Dossier', color: '#8A6FD4', description: 'Devis envoyé / dossier en cours' },
  { value: 'Signé', label: 'Signé', color: '#2D8659', description: 'Affaire gagnée' },
]

export function normalizeStatut(s: string | null | undefined): string {
  return (s || 'Nouveau')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
}

export function stageOf(statut: string | null | undefined): PipelineStage {
  const n = normalizeStatut(statut)
  return PIPELINE_STAGES.find(s => normalizeStatut(s.value) === n) || PIPELINE_STAGES[0]
}

export const TEMPERATURES: { value: string; label: string; color: string }[] = [
  { value: 'chaud', label: 'Chaud', color: '#D62828' },
  { value: 'tiede', label: 'Tiède', color: '#E8A317' },
  { value: 'froid', label: 'Froid', color: '#3A86C8' },
]

export const INTERACTION_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'appel', label: 'Appel téléphonique', color: '#3A86C8' },
  { value: 'email', label: 'Email', color: '#8A6FD4' },
  { value: 'sms', label: 'SMS', color: '#52B788' },
  { value: 'rdv', label: 'Rendez-vous', color: '#D4A574' },
  { value: 'note', label: 'Note', color: '#7A7A7A' },
  { value: 'statut', label: 'Changement de statut', color: '#1B4332' },
  { value: 'visite', label: 'Visite technique', color: '#E8A317' },
  { value: 'devis', label: 'Devis', color: '#2D8659' },
  { value: 'dossier', label: 'Dossier', color: '#D62828' },
]

export const TASK_TYPES: { value: string; label: string }[] = [
  { value: 'appel', label: 'Appel' },
  { value: 'relance', label: 'Relance' },
  { value: 'rdv', label: 'Rendez-vous' },
  { value: 'email', label: 'Email' },
  { value: 'autre', label: 'Autre' },
]

export const TASK_PRIORITES: { value: string; label: string; color: string }[] = [
  { value: 'basse', label: 'Basse', color: '#7A7A7A' },
  { value: 'normale', label: 'Normale', color: '#3A86C8' },
  { value: 'haute', label: 'Haute', color: '#D62828' },
]

export function euro(n: number | null | undefined): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n) || 0)
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - d)
  const mn = Math.floor(diff / 60000)
  if (mn < 1) return 'à l\'instant'
  if (mn < 60) return `il y a ${mn} min`
  const h = Math.floor(mn / 60)
  if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24)
  if (j < 7) return `il y a ${j} j`
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function formatDueDate(iso: string | null | undefined): string {
  if (!iso) return 'Sans échéance'
  const due = new Date(iso)
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(due) - startOfDay(now)) / 86400000)
  const time = due.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays < 0) return `En retard — ${due.toLocaleDateString('fr-FR')}`
  if (diffDays === 0) return `Aujourd'hui ${time}`
  if (diffDays === 1) return `Demain ${time}`
  if (diffDays < 7) return due.toLocaleDateString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
  return due.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function isOverdue(task: { done: boolean; due_at: string | null }): boolean {
  if (task.done || !task.due_at) return false
  return new Date(task.due_at).getTime() < Date.now()
}

export function isDueToday(task: { due_at: string | null }): boolean {
  if (!task.due_at) return false
  const d = new Date(task.due_at)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}
