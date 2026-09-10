import { useEffect, useState } from 'react'
import { Phone, Mail, MessageSquare, Calendar, StickyNote, RefreshCw, ClipboardCheck, FileSignature, FolderOpen, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Interaction, InteractionType } from '../../types'
import { INTERACTION_TYPES, timeAgo } from '../../lib/crm/constants'
import { Button } from '../ui/Button'

const ICONS: Record<string, any> = {
  appel: Phone, email: Mail, sms: MessageSquare, rdv: Calendar,
  note: StickyNote, statut: RefreshCw, visite: ClipboardCheck,
  devis: FileSignature, dossier: FolderOpen,
}

interface Props {
  prospectId: string
  auteur?: string
  compact?: boolean
  refreshKey?: number
}

export function Timeline({ prospectId, auteur = 'Vous', compact, refreshKey }: Props) {
  const [items, setItems] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<InteractionType>('appel')
  const [contenu, setContenu] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('interactions')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false })
      .limit(compact ? 5 : 100)
    setItems((data || []) as Interaction[])
    setLoading(false)
  }

  useEffect(() => { load() }, [prospectId, refreshKey])

  async function logInteraction() {
    if (!contenu.trim()) return
    setSaving(true)
    const { error } = await supabase.from('interactions').insert({
      prospect_id: prospectId, type, contenu: contenu.trim(), auteur,
    })
    if (!error) {
      await supabase.from('prospects').update({ derniere_interaction_at: new Date().toISOString() }).eq('id', prospectId)
      setContenu('')
      load()
    }
    setSaving(false)
  }

  return (
    <div className="timeline-card">
      <div className="timeline-header">
        <div className="timeline-title">Historique des échanges</div>
      </div>

      {!compact && (
        <div className="timeline-quicklog">
          <select className="timeline-type-select" value={type} onChange={e => setType(e.target.value as InteractionType)}>
            {INTERACTION_TYPES.filter(t => ['appel', 'email', 'sms', 'rdv', 'note'].includes(t.value)).map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            className="timeline-input"
            placeholder="Que s'est-il passé ? (ex : injoignable, RDV confirmé, devis envoyé…)"
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') logInteraction() }}
          />
          <Button variant="primary" size="sm" onClick={logInteraction} disabled={saving || !contenu.trim()}>
            <Send size={14} /> Ajouter
          </Button>
        </div>
      )}

      <div className="timeline-list">
        {loading && <div className="timeline-empty">Chargement…</div>}
        {!loading && items.length === 0 && (
          <div className="timeline-empty">Aucune interaction enregistrée pour l'instant.</div>
        )}
        {!loading && items.map(it => {
          const meta = INTERACTION_TYPES.find(t => t.value === it.type)
          const Icon = ICONS[it.type] || StickyNote
          return (
            <div key={it.id} className="timeline-item">
              <div className="timeline-dot" style={{ background: meta?.color || '#7A7A7A' }}>
                <Icon size={13} />
              </div>
              <div className="timeline-body">
                <div className="timeline-text">{it.contenu}</div>
                <div className="timeline-meta">
                  <span>{meta?.label || it.type}</span>
                  {it.auteur && <><span className="timeline-sep">·</span><span>{it.auteur}</span></>}
                  <span className="timeline-sep">·</span>
                  <span>{timeAgo(it.created_at)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
