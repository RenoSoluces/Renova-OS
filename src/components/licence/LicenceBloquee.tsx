import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { Button } from '../ui/Button'

/** Bloque l'interface des utilisateurs d'une entreprise dont la licence est suspendue ou résiliée. Le Grand Admin n'est jamais bloqué. */
export function LicenceBloquee() {
  const { profile, signOut } = useAuth()
  const [statut, setStatut] = useState<string | null>(null)
  const orgId = profile?.organisation_id
  const concerne = !!profile && profile.role !== 'admin' && !!orgId

  useEffect(() => {
    if (!concerne) return
    let actif = true
    const lire = () => supabase.from('licences').select('statut').eq('organisation_id', orgId!).maybeSingle().then(({ data }) => { if (actif) setStatut(data?.statut ?? null) })
    void lire()
    const t = window.setInterval(lire, 5 * 60 * 1000)
    return () => { actif = false; window.clearInterval(t) }
  }, [concerne, orgId])

  if (!concerne || (statut !== 'suspendue' && statut !== 'resiliee')) return null
  return (
    <div className="modal-overlay" role="alertdialog" aria-modal="true" aria-label="Licence suspendue" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div className="modal-body" style={{ padding: 28 }}>
          <Lock size={28} />
          <h2 style={{ margin: '12px 0 6px' }}>{statut === 'resiliee' ? 'Licence résiliée' : 'Licence suspendue'}</h2>
          <p className="text-muted">{statut === 'resiliee' ? 'La licence de votre entreprise a pris fin.' : 'Un règlement de votre licence est en attente.'} L'accès à Renova OS reprendra dès la régularisation. Contactez Reno Soluces : contact@renosoluces.fr.</p>
          <Button variant="ghost" onClick={() => void signOut()}>Se déconnecter</Button>
        </div>
      </div>
    </div>
  )
}
