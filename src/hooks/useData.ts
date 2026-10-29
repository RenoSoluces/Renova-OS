import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { lireTout } from '../lib/lireTout'
import type { Prospect, Visite, Simulation, Dossier, PlanningEvent, Document } from '../types'

export function useData() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [visites, setVisites] = useState<Visite[]>([])
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [events, setEvents] = useState<PlanningEvent[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [p, v, s, d, e, doc] = await Promise.all([
          lireTout<Prospect>(() => supabase.from('prospects').select('*').order('created_at', { ascending: false })),
          supabase.from('visites').select('*').order('date_visite', { ascending: false }),
          supabase.from('simulations').select('*').order('created_at', { ascending: false }),
          supabase.from('dossiers').select('*').order('created_at', { ascending: false }),
          supabase.from('planning_events').select('*').order('date', { ascending: false }),
          supabase.from('documents').select('*').order('created_at', { ascending: false }),
        ])
        setProspects((p.data || []) as Prospect[])
        setVisites((v.data || []) as Visite[])
        setSimulations((s.data || []) as Simulation[])
        setDossiers((d.data || []) as Dossier[])
        setEvents((e.data || []) as PlanningEvent[])
        setDocuments((doc.data || []) as Document[])
        if (p.error) throw p.error
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return { prospects, visites, simulations, dossiers, events, documents, loading, error }
}
