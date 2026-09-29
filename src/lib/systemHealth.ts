import { supabase } from './supabase'

export interface SystemHealth {
  vt_a_qualifier: number
  commissions_zero: number
  dossiers_sans_commission: number
  devis_a_relancer: number
  taches_en_retard: number
  documents_sans_fichier: number
  prospects_sans_attribution: number
}

export async function fetchSystemHealth(): Promise<{ data: SystemHealth | null; error: Error | null }> {
  const { data, error } = await supabase.from('renova_system_health').select('*').maybeSingle()
  if (error) return { data: null, error: new Error(error.message) }
  return { data: (data || null) as SystemHealth | null, error: null }
}
