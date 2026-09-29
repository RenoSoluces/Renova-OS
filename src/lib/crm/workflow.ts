import { supabase } from '../supabase'
import { logAuditEvent } from '../auditLog'

/** Point d'entrée unique côté UI pour les changements de statut prospect. */
export async function setProspectStatus(prospectId: string, statut: string, reason?: string) {
  const { data, error } = await supabase.rpc('renova_set_prospect_status', {
    p_prospect_id: prospectId,
    p_status: statut,
  })
  if (error) throw new Error(error.message)
  await logAuditEvent({
    action: 'prospect_statut',
    entityType: 'prospect',
    entityId: prospectId,
    description: `Prospect → ${statut}${reason ? ` — ${reason}` : ''}`,
    meta: { statut, reason: reason || null },
  })
  return data
}
