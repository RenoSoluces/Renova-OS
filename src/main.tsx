import './lib/compat'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/reset.css'
import './styles/variables.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/visite.css'
import './styles/dashboard.css'
import './styles/wizard.css'
import './styles/crm.css'
import './styles/prospects.css'
import './index.css'
import App from './App'
import { AuthProvider } from './lib/auth/AuthContext'
import { registerSW } from 'virtual:pwa-register'

// Met à jour automatiquement l'appli en arrière-plan dès qu'une nouvelle
// version est déployée (pas besoin de désinstaller/réinstaller).
registerSW({ immediate: true, onRegisterError(error) { console.error('[RENOVA OS] Enregistrement du service worker impossible :', error) } })

document.documentElement.dataset.renovaStarted = 'true'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
