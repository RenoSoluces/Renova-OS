import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

/** Type de l'entreprise de l'utilisateur : « interne » (Reno Soluces) ou « partenaire » (client installateur). null tant que non chargé. */
export function useTypeOrganisation(): 'interne' | 'partenaire' | null {
  const { profile } = useAuth()
  const orgId = profile?.organisation_id || ''
  const [type, setType] = useState<'interne' | 'partenaire' | null>(null)
  useEffect(() => {
    if (!orgId) { setType(null); return }
    let actif = true
    void supabase.from('organisations').select('type').eq('id', orgId).maybeSingle()
      .then(({ data }) => { if (actif) setType(data?.type === 'partenaire' ? 'partenaire' : data?.type ? 'interne' : null) })
    return () => { actif = false }
  }, [orgId])
  return type
}
