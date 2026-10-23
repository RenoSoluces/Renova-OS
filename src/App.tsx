import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { DashboardPage } from './pages/DashboardPage'
import { ProspectsPage } from './pages/ProspectsPage'
import { VisitesPage } from './pages/VisitesPage'
import { SimulationsPage } from './pages/SimulationsPage'
import { AidesSimulationPage } from './pages/AidesSimulationPage'
import { DossiersPage } from './pages/DossiersPage'
import { PlanningPage } from './pages/PlanningPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { FacturationPage } from './pages/FacturationPage'
import { CourrierPage } from './pages/CourrierPage'
import { TasksPage } from './pages/TasksPage'
import { ProspectionPage } from './pages/ProspectionPage'
import { FichesTechniquesPage } from './pages/FichesTechniquesPage'
import { CataloguePage } from './pages/CataloguePage'
import { DevisPage } from './pages/DevisPage'
import { ParametresPage } from './pages/ParametresPage'
import { ActivitePage } from './pages/ActivitePage'
import { CommissionsPage } from './pages/CommissionsPage'
import { SuiviChantierPage } from './pages/SuiviChantierPage'
import { PartenairesPage } from './pages/PartenairesPage'
import { PerformancePage } from './pages/PerformancePage'
import { SystemHealthPage } from './pages/SystemHealthPage'
import type { PageKey } from './types'
import { useOpenTasksCount } from './lib/crm/useOpenTasksCount'
import { verifierRelances } from './lib/crm/relances'
import { useAuth } from './lib/auth/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import React from 'react'

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' }
  static getDerivedStateFromError(error: unknown) { return { hasError: true, message: error instanceof Error ? error.message : 'Erreur inattendue' } }
  componentDidCatch(error: unknown) { console.error('[RENOVA OS] Erreur interface:', error) }
  render() {
    if (!this.state.hasError) return this.props.children
    return <div className="page" style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="card card-pad" style={{maxWidth:560,textAlign:'center'}}><AlertTriangle size={32} style={{color:'var(--c-warning,#e8a317)',marginBottom:12}}/><h2>Une erreur a interrompu cet écran</h2><p className="text-muted">Renova OS a évité une page blanche. Recharge l'écran pour reprendre.</p><p className="text-muted" style={{fontSize:12}}>{this.state.message}</p><button className="btn btn-primary" onClick={() => window.location.reload()}><RefreshCw size={15}/> Recharger</button></div></div>
  }
}

const PAGE_TITLES: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de votre activité' },
  prospects: { title: 'Prospects', subtitle: 'Gérez vos contacts et prospects' },
  prospection: { title: 'Prospection', subtitle: 'Import et suivi des contacts à prospecter' },
  pipeline: { title: 'Pipeline commercial', subtitle: 'Visualisez les étapes de votre portefeuille de prospects' },
  a_traiter: { title: 'À traiter', subtitle: 'Appels, relances, rendez-vous et actions commerciales' },
  courrier: { title: 'Mon courrier', subtitle: 'Connexion Gmail professionnelle à configurer' },
  facturation: { title: 'Facturation client', subtitle: 'Acomptes, démarrage du chantier et soldes' },
  visites: { title: 'Visites techniques', subtitle: 'Audits énergétiques sur site' },
  simulations: { title: 'Simulation des aides', subtitle: 'Estimez les aides mobilisables pour un prospect' },
  resultats_3cl: { title: 'Résultats 3CL', subtitle: 'Historique des calculs issus des visites techniques' },
  dossiers: { title: 'Dossiers', subtitle: 'Suivi des dossiers de rénovation' },
  devis: { title: 'Devis', subtitle: 'Devis clients et aides mobilisables' },
  catalogue: { title: 'Catalogue produits', subtitle: 'Vos produits et prestations' },
  planning: { title: 'Planning', subtitle: 'Calendrier des visites et RDV' },
  documents: { title: 'Documents & archives', subtitle: 'Documents généraux et pièces jointes des dossiers' },
  fiches_techniques: { title: 'Fiches techniques', subtitle: 'Fiches produits et opérations CEE — particuliers et professionnels' },
  parametres: { title: 'Paramètres', subtitle: 'Configuration de l\'application' },
  activite: { title: 'Historique & activité', subtitle: 'Flux centralisé des échanges' },
  commissions: { title: 'Commissions', subtitle: 'Barème et suivi des commissions commerciales' },
  suivi_chantier: { title: 'Suivi chantier', subtitle: 'Installations, partenaires et SAV' },
  partenaires: { title: 'Partenaires', subtitle: 'Réseau des installateurs — accès administrateur' },
  performance: { title: 'Performance & CA', subtitle: 'CA généré par partenaires et commerciaux' },
  sante_systeme: { title: 'Santé du système', subtitle: 'Contrôles métier et qualité des données' },
}

function AppContent() {
  const { session, loading: authLoading, profile, profileError, signOut, refreshProfile } = useAuth()
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
  const [pendingSimulationProspectId, setPendingSimulationProspectId] = useState<string | null>(null)
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
    if (target === 'simulation') setPendingSimulationProspectId(prospect.id)
    // La simulation d'aides est préremplie avec le prospect choisi ; les résultats 3CL restent archivés séparément.
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

  // A valid Auth session is not enough: the database profile is required to
  // resolve the user's role. Fail closed if it is missing or cannot be read.
  if (!profile) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card card-pad" style={{ maxWidth: 560, textAlign: 'center' }}>
          <AlertTriangle size={28} style={{ color: 'var(--c-warning,#e8a317)', marginBottom: 12 }} />
          <h2>Accès à Renova OS indisponible</h2>
          <p className="text-muted">{profileError || "Votre profil n'est pas encore disponible."}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => void refreshProfile()}>Réessayer</button>
            <button className="btn" onClick={() => void signOut()}>Se déconnecter</button>
          </div>
        </div>
      </div>
    )
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
          {(page === 'prospects' || page === 'pipeline') && <ProspectsPage key={page} initialView={page === 'pipeline' ? 'pipeline' : 'liste'} onContinueLifecycle={continuerCycleProspect} />}
          {page === 'prospection' && <ProspectionPage />}
          {page === 'simulations' && <AidesSimulationPage initialProspectId={pendingSimulationProspectId} onInitialProspectHandled={() => setPendingSimulationProspectId(null)} />}
          {page === 'resultats_3cl' && <SimulationsPage onNavigateToDevis={goToDevis} />}
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
          {page === 'courrier' && <CourrierPage />}
          {page === 'facturation' && <FacturationPage />}
          {page === 'a_traiter' && <TasksPage />}
          {page === 'fiches_techniques' && <FichesTechniquesPage />}
          {page === 'parametres' && <ParametresPage />}
          {page === 'activite' && <ActivitePage />}
          {page === 'commissions' && <CommissionsPage />}
          {page === 'suivi_chantier' && <SuiviChantierPage />}
          {page === 'partenaires' && (profile?.role === 'admin' || profile?.role === 'manager' ? <PartenairesPage /> : <div className="page"><div className="card card-pad"><strong>Accès réservé à l'administration.</strong></div></div>)}
          {page === 'performance' && (profile?.role === 'admin' || profile?.role === 'manager') ? <PerformancePage /> : null}
          {page === 'sante_systeme' && <SystemHealthPage />}
        </div>
      </div>
    </div>
  )
}

export default function App() { return <AppErrorBoundary><AppContent /></AppErrorBoundary> }
