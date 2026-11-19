import { supabase } from '../supabase'

const dernierAppel: Record<string, number> = {}

/**
 * Laisse dans l'historique du prospect la trace qu'un appel a été lancé depuis Renova.
 * Une seule trace par minute et par prospect (évite les doublons en cas de clics répétés).
 * Retourne true si une trace a été ajoutée.
 */
export async function journaliserAppel(opts: {
  prospectId: string | null | undefined
  telephone?: string | null
  auteur?: string | null
  source: string
}): Promise<boolean> {
  const { prospectId, telephone, auteur, source } = opts
  if (!prospectId) return false
  const maintenant = Date.now()
  if (maintenant - (dernierAppel[prospectId] || 0) < 60_000) return false
  dernierAppel[prospectId] = maintenant
  const { error } = await supabase.from('interactions').insert({
    prospect_id: prospectId,
    type: 'appel',
    auteur: auteur || 'Vous',
    contenu: `Appel lancé vers ${telephone || 'le prospect'} (${source})`,
    meta: { canal: 'telephone', source },
  })
  if (error) { dernierAppel[prospectId] = 0; return false }
  await supabase.from('prospects').update({ derniere_interaction_at: new Date().toISOString() }).eq('id', prospectId)
  return true
}
