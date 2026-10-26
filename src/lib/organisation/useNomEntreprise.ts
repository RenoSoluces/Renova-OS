import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

/**
 * Nom de l'entreprise de l'utilisateur connecté (raison sociale des Paramètres, sinon nom de
 * l'organisation). Chaque entreprise ne voit que son propre nom : aucun nom d'une autre
 * entreprise ne doit servir de valeur par défaut.
 */
const cache = new Map<string, string>()

export function useNomEntreprise(): string {
  const { profile } = useAuth()
  const orgId = profile?.organisation_id || ''
  const [nom, setNom] = useState(() => cache.get(orgId) || '')
  useEffect(() => {
    if (!orgId) return
    if (cache.has(orgId)) { setNom(cache.get(orgId)!); return }
    let actif = true
    void Promise.all([
      supabase.from('entreprises').select('raison_sociale').eq('organisation_id', orgId).maybeSingle(),
      supabase.from('organisations').select('nom').eq('id', orgId).maybeSingle(),
    ]).then(([e, o]) => {
      const valeur = (e.data?.raison_sociale || o.data?.nom || '').trim()
      if (valeur) cache.set(orgId, valeur)
      if (actif) setNom(valeur)
    })
    return () => { actif = false }
  }, [orgId])
  return nom
}
