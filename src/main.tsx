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
import './index.css'
import App from './App'
import { AuthProvider } from './lib/auth/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
