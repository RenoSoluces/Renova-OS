import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

/**
 * Licence de l'entreprise de l'utilisateur : nombre de comptes autorisés et possibilité d'inviter.
 * Le titulaire d'une licence ne crée pas lui-même de comptes (réglé par le Grand Admin) ; le serveur
 * le refuse de toute façon, ce réglage sert à ne pas lui proposer l'action.
 */
export function useLicence(): { peutInviter: boolean; licencesMax: number | null } {
  const { profile } = useAuth()
  const orgId = profile?.organisation_id || ''
  const [etat, setEtat] = useState<{ invitations: boolean; max: number | null }>({ invitations: true, max: null })
  useEffect(() => {
    if (!orgId) return
    let actif = true
    void supabase.from('organisations').select('invitations_autorisees,licences_max').eq('id', orgId).maybeSingle()
      .then(({ data }) => { if (actif && data) setEtat({ invitations: data.invitations_autorisees !== false, max: data.licences_max ?? null }) })
    return () => { actif = false }
  }, [orgId])
  // Le Grand Admin n'est jamais limité.
  return { peutInviter: profile?.role === 'admin' || etat.invitations, licencesMax: etat.max }
}
