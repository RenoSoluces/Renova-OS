import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

/** Bandeau discret quand une nouvelle version de Renova OS est prête : l'utilisateur choisit le moment. */
export function MiseAJourDisponible() {
  const [appliquer, setAppliquer] = useState<null | (() => void)>(null)
  useEffect(() => {
    const ecoute = (e: Event) => setAppliquer(() => (e as CustomEvent<() => void>).detail)
    window.addEventListener('renova:mise-a-jour', ecoute)
    return () => window.removeEventListener('renova:mise-a-jour', ecoute)
  }, [])
  if (!appliquer) return null
  return (
    <div className="maj-dispo" role="status">
      <RefreshCw size={16} />
      <span>Une nouvelle version de Renova OS est disponible.</span>
      <button type="button" className="maj-btn" onClick={() => appliquer()}>Mettre à jour</button>
      <button type="button" className="maj-fermer" onClick={() => setAppliquer(null)} aria-label="Plus tard"><X size={15} /></button>
    </div>
  )
}
