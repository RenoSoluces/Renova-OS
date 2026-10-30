import './lib/compat'
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/reset.css'
import './styles/variables.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/visite.css'
import './styles/dashboard.css'
import './styles/wizard.css'
import './styles/crm.css'
import './styles/pipeline.css'
import './styles/solaire.css'
import './styles/prospection.css'
import './styles/terrain.css'
import './styles/pilotage.css'
import './styles/espace-apporteur.css'
import './styles/prospects.css'
import './index.css'
import './styles/premium.css'
import './styles/ecrans-premium.css'
import { installerRapportErreurs } from './lib/fiabilite/rapportErreurs'

installerRapportErreurs()
import App from './App'
import { MiseAJourDisponible } from './components/MiseAJourDisponible'
import { AuthProvider } from './lib/auth/AuthContext'
import { registerSW } from 'virtual:pwa-register'

// Met à jour automatiquement l'appli en arrière-plan dès qu'une nouvelle
// version est déployée (pas besoin de désinstaller/réinstaller).
// Nouvelle version : proposée par un bandeau (MiseAJourDisponible) au lieu de recharger la page d'office.
const mettreAJour = registerSW({
  immediate: true,
  onNeedRefresh() { window.dispatchEvent(new CustomEvent('renova:mise-a-jour', { detail: () => mettreAJour(true) })) },
  onRegisterError(error) { console.error('[RENOVA OS] Enregistrement du service worker impossible :', error) },
  // Une appli installée peut rester ouverte des jours : on vérifie s'il existe une nouvelle version
  // toutes les 15 minutes et au retour sur l'appli, pour afficher le bandeau sans recharger d'office.
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const verifier = () => { if (navigator.onLine) void registration.update().catch(() => undefined) }
    window.setInterval(verifier, 15 * 60 * 1000)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verifier() })
  },
})

document.documentElement.dataset.renovaStarted = 'true'

// Espace client public (lien personnel, sans compte) : aucune session Renova OS n'est chargée.
const PortailClientPage = lazy(() => import('./pages/PortailClientPage').then(m => ({ default: m.PortailClientPage })))
const estPortail = window.location.pathname.startsWith('/portail/')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {estPortail ? (
      <Suspense fallback={null}><PortailClientPage /></Suspense>
    ) : (
      <AuthProvider>
        <App />
        <MiseAJourDisponible />
      </AuthProvider>
    )}
  </StrictMode>,
)
