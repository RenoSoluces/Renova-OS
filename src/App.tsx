import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { DashboardPage } from './pages/DashboardPage'
import { ProspectsPage } from './pages/ProspectsPage'
import { VisitesPage } from './pages/VisitesPage'
import { SimulationsPage } from './pages/SimulationsPage'
import { DossiersPage } from './pages/DossiersPage'
import { PlanningPage } from './pages/PlanningPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { CataloguePage } from './pages/CataloguePage'
import { DevisPage } from './pages/DevisPage'
import { ParametresPage } from './pages/ParametresPage'
import { ActivitePage } from './pages/ActivitePage'
import { CommissionsPage } from './pages/CommissionsPage'
import type { PageKey } from './types'
import { useOpenTasksCount } from './lib/crm/useOpenTasksCount'
import { verifierRelances } from './lib/crm/relances'
import { useAuth } from './lib/auth/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { Loader2 } from 'lucide-react'

const PAGE_TITLES: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de votre activité' },
  prospects: { title: 'Prospects', subtitle: 'Gérez vos contacts et prospects' },
  visites: { title: 'Visites techniques', subtitle: 'Audits énergétiques sur site' },
  simulations: { title: 'Simulations 3CL', subtitle: 'Calculs DPE et aides financières' },
  dossiers: { title: 'Dossiers', subtitle: 'Suivi des dossiers de rénovation' },
  devis: { title: 'Devis', subtitle: 'Devis clients et aides mobilisables' },
  catalogue: { title: 'Catalogue produits', subtitle: 'Vos produits et prestations' },
  planning: { title: 'Planning', subtitle: 'Calendrier des visites et RDV' },
  documents: { title: 'Documents', subtitle: 'Gestion documentaire' },
  parametres: { title: 'Paramètres', subtitle: 'Configuration de l\'application' },
  activite: { title: 'Historique & activité', subtitle: 'Flux centralisé des échanges' },
  commissions: { title: 'Commissions', subtitle: 'Barème et suivi des commissions commerciales' },
}

export default function App() {
  const { session, loading: authLoading, profile } = useAuth()
  const [page, setPage] = useState<PageKey>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const tasksBadge = useOpenTasksCount(page)
  // Devis créé depuis les recommandations de travaux d'une visite technique : on bascule
  // sur la page Devis et on lui indique lequel ouvrir directement.
  const [pendingDevisId, setPendingDevisId] = useState<string | null>(null)
  // "Continuer" depuis la fiche d'un prospect : redirige vers la VT / le devis / le dossier
  // à créer pour ce prospect, en préremplissant directement le bon formulaire.
  const [pendingVisiteProspectId, setPendingVisiteProspectId] = useState<string | null>(null)
  const [pendingDevisProspectId, setPendingDevisProspectId] = useState<string | null>(null)
  const [pendingDossierProspectId, setPendingDossierProspectId] = useState<string | null>(null)
  const [notifRefresh, setNotifRefresh] = useState(0)

  const navigate = useCallback((p: PageKey) => setPage(p), [])
  const goToDevis = useCallback((devisId: string) => {
    setPendingDevisId(devisId)
    setPage('devis')
  }, [])
  const continuerCycleProspect = useCallback((target: 'visite' | 'simulation' | 'devis' | 'dossier', prospect: { id: string }) => {
    if (target === 'visite') setPendingVisiteProspectId(prospect.id)
    if (target === 'devis') setPendingDevisProspectId(prospect.id)
    if (target === 'dossier') setPendingDossierProspectId(prospect.id)
    // Les simulations 3CL sont produites depuis l'assistant de visite technique (pas de création
    // autonome) : on ouvre simplement la liste, qui affichera celle déjà liée au prospect.
    setPage(target === 'visite' ? 'visites' : target === 'devis' ? 'devis' : target === 'dossier' ? 'dossiers' : 'simulations')
  }, [])

  // Vérifie les devis sans réponse et les tâches en retard à chaque ouverture de
  // l'app (idempotent, voir lib/crm/relances.ts), puis rafraîchit la cloche de notifications.
  useEffect(() => {
    if (!session) return
    verifierRelances(profile?.nom_complet || null).then(() => setNotifRefresh(n => n + 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const pageTitle = PAGE_TITLES[page]

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} className="spin" style={{ color: 'var(--c-primary)' }} />
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  // Visites page takes over the full content area (no topbar)
  if (page === 'visites') {
    return (
      <div className="app-layout">
        <Sidebar current={page} onNavigate={navigate} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} tasksBadge={tasksBadge} />
        <VisitesPage
          onBack={() => navigate('dashboard')}
          onCreateDevis={goToDevis}
          initialProspectId={pendingVisiteProspectId}
          onInitialProspectHandled={() => setPendingVisiteProspectId(null)}
        />
      </div>
    )
  }

  return (
    <div className="app-layout">
      <Sidebar current={page} onNavigate={navigate} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} tasksBadge={tasksBadge} />
      <div className="app-content">
        <Topbar title={pageTitle.title} subtitle={pageTitle.subtitle} onNavigate={navigate} refreshKey={notifRefresh} />
        <div className="page-scroll">
          {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
          {page === 'prospects' && <ProspectsPage onContinueLifecycle={continuerCycleProspect} />}
          {page === 'simulations' && <SimulationsPage onNavigateToDevis={goToDevis} />}
          {page === 'dossiers' && (
            <DossiersPage
              initialProspectId={pendingDossierProspectId}
              onInitialProspectHandled={() => setPendingDossierProspectId(null)}
            />
          )}
          {page === 'devis' && (
            <DevisPage
              openDevisId={pendingDevisId}
              onOpenedDevis={() => setPendingDevisId(null)}
              initialProspectId={pendingDevisProspectId}
              onInitialProspectHandled={() => setPendingDevisProspectId(null)}
            />
          )}
          {page === 'catalogue' && <CataloguePage />}
          {page === 'planning' && <PlanningPage />}
          {page === 'documents' && <DocumentsPage />}
          {page === 'parametres' && <ParametresPage />}
          {page === 'activite' && <ActivitePage />}
          {page === 'commissions' && <CommissionsPage />}
        </div>
      </div>
    </div>
  )
}
