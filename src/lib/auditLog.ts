import { supabase } from './supabase'

export type AuditEntity = 'visite' | 'commission' | 'devis' | 'dossier' | 'prospect' | 'facture' | 'objectif' | 'system'

export async function logAuditEvent(params: {
  action: string
  entityType: AuditEntity
  entityId?: string | null
  description: string
  meta?: Record<string, unknown>
  actorId?: string | null
}) {
  const { error } = await supabase.from('system_activity_log').insert({
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    description: params.description,
    meta: params.meta || {},
    actor_id: params.actorId || null,
  })
  if (error) console.warn('[RENOVA OS] Journalisation impossible:', error.message)
}
