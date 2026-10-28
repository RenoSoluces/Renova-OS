import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { DashboardPage } from './pages/DashboardPage'
const EspaceApporteurPage = lazy(() => import('./pages/EspaceApporteurPage').then(m => ({ default: m.EspaceApporteurPage })))
const PilotagePage = lazy(() => import('./pages/PilotagePage').then(m => ({ default: m.PilotagePage })))
const ProspectsPage = lazy(() => import('./pages/ProspectsPage').then(m => ({ default: m.ProspectsPage })))
const VisitesPage = lazy(() => import('./pages/VisitesPage').then(m => ({ default: m.VisitesPage })))
const SimulationsPage = lazy(() => import('./pages/SimulationsPage').then(m => ({ default: m.SimulationsPage })))
const AidesSimulationPage = lazy(() => import('./pages/AidesSimulationPage').then(m => ({ default: m.AidesSimulationPage })))
const DossiersPage = lazy(() => import('./pages/DossiersPage').then(m => ({ default: m.DossiersPage })))
const PlanningPage = lazy(() => import('./pages/PlanningPage').then(m => ({ default: m.PlanningPage })))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then(m => ({ default: m.DocumentsPage })))
const FacturationPage = lazy(() => import('./pages/FacturationPage').then(m => ({ default: m.FacturationPage })))
const CourrierPage = lazy(() => import('./pages/CourrierPage').then(m => ({ default: m.CourrierPage })))
const TasksPage = lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })))
const ProspectionTelephonePage = lazy(() => import('./pages/ProspectionTelephonePage').then(m => ({ default: m.ProspectionTelephonePage })))
const ProspectionTerrainPage = lazy(() => import('./pages/ProspectionTerrainPage').then(m => ({ default: m.ProspectionTerrainPage })))
const FichesTechniquesPage = lazy(() => import('./pages/FichesTechniquesPage').then(m => ({ default: m.FichesTechniquesPage })))
const CataloguePage = lazy(() => import('./pages/CataloguePage').then(m => ({ default: m.CataloguePage })))
const DevisPage = lazy(() => import('./pages/DevisPage').then(m => ({ default: m.DevisPage })))
const ParametresPage = lazy(() => import('./pages/ParametresPage').then(m => ({ default: m.ParametresPage })))
const ActivitePage = lazy(() => import('./pages/ActivitePage').then(m => ({ default: m.ActivitePage })))
const CommissionsPage = lazy(() => import('./pages/CommissionsPage').then(m => ({ default: m.CommissionsPage })))
const SuiviChantierPage = lazy(() => import('./pages/SuiviChantierPage').then(m => ({ default: m.SuiviChantierPage })))
const PartenairesPage = lazy(() => import('./pages/PartenairesPage').then(m => ({ default: m.PartenairesPage })))
const PerformancePage = lazy(() => import('./pages/PerformancePage').then(m => ({ default: m.PerformancePage })))
const SystemHealthPage = lazy(() => import('./pages/SystemHealthPage').then(m => ({ default: m.SystemHealthPage })))
const OrganisationPage = lazy(() => import('./pages/OrganisationPage').then(m => ({ default: m.OrganisationPage })))
const ApporteursPage = lazy(() => import('./pages/ApporteursPage').then(m => ({ default: m.ApporteursPage })))
const ChallengesPage = lazy(() => import('./pages/ChallengesPage').then(m => ({ default: m.ChallengesPage })))
const SimulateurSolairePage = lazy(() => import('./pages/SimulateurSolairePage').then(m => ({ default: m.SimulateurSolairePage })))
import type { PageKey } from './types'
import { useOpenTasksCount } from './lib/crm/useOpenTasksCount'
import { verifierRelances } from './lib/crm/relances'
import { useAuth } from './lib/auth/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { DefinirMotDePassePage } from './pages/DefinirMotDePassePage'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import React from 'react'
import { signalerErreur } from './lib/fiabilite/rapportErreurs'

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' }
  static getDerivedStateFromError(error: unknown) { return { hasError: true, message: error instanceof Error ? error.message : 'Erreur inattendue' } }
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[RENOVA OS] Erreur interface:', error)
    void signalerErreur(error, { source: 'écran interrompu', composants: (info.componentStack || '').slice(0, 1500) })
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return <div className="page" style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="card card-pad" style={{maxWidth:560,textAlign:'center'}}><AlertTriangle size={32} style={{color:'var(--c-warning,#e8a317)',marginBottom:12}}/><h2>Une erreur a interrompu cet écran</h2><p className="text-muted">Renova OS a évité une page blanche. Recharge l'écran pour reprendre.</p><p className="text-muted" style={{fontSize:12}}>{this.state.message}</p><button className="btn btn-primary" onClick={() => window.location.reload()}><RefreshCw size={15}/> Recharger</button></div></div>
  }
}

const PAGE_TITLES: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de votre activité' },
  prospects: { title: 'Prospects', subtitle: 'Gérez vos contacts et prospects' },
  prospection_terrain: { title: 'Prospection Terrain', subtitle: 'Tournées de porte-à-porte sur la carte' },
  prospection: { title: 'Prospection Téléphone', subtitle: 'Import des leads, appels et suivi des résultats' },
  pipeline: { title: 'Pipeline commercial', subtitle: 'Visualisez les étapes de votre portefeuille de prospects' },
  a_traiter: { title: 'Ma journée', subtitle: 'Rendez-vous, appels, relances en retard et itinéraires' },
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
  partenaires: { title: 'Mon réseau', subtitle: 'Créez les accès de vos apporteurs et partenaires, puis envoyez-les par WhatsApp' },
  installateurs: { title: 'Installateurs', subtitle: 'Répertoire des partenaires techniques et installateurs' },
  challenges: { title: 'Challenges & classements', subtitle: 'Challenges et classements isolés par société' },
  performance: { title: 'Performance & CA', subtitle: 'CA généré par partenaires et commerciaux' },
  espace_apporteur: { title: 'Mon espace apporteur', subtitle: 'Recommander un client et suivre mes recommandations' },
  pilotage: { title: 'Pilotage équipe', subtitle: 'Activité, transformation et points d’attention de l’équipe' },
  sante_systeme: { title: 'Santé du système', subtitle: 'Contrôles métier et qualité des données' },
  organisation: { title: 'Organigramme', subtitle: 'Structure des entreprises et équipes' },
  solaire: { title: 'Simulateur solaire', subtitle: 'Production, autoconsommation et rentabilité photovoltaïque' },
}

function pageFromLocation(): PageKey {
  const match = window.location.pathname.match(/^\/app\/([^/]+)\/?$/)
  const candidate = match?.[1] as PageKey | undefined
  return candidate && Object.prototype.hasOwnProperty.call(PAGE_TITLES, candidate) ? candidate : 'dashboard'
}

function AppContent() {
  const { session, loading: authLoading, profile, profileError, signOut, refreshProfile, doitDefinirMotDePasse } = useAuth()
  const [page, setPage] = useState<PageKey>(() => pageFromLocation())
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
  // Fiche prospect à ouvrir directement sur la page Prospects (ex. depuis le tableau de bord d'un apporteur).
  const [pendingProspectId, setPendingProspectId] = useState<string | null>(null)
  const [notifRefresh, setNotifRefresh] = useState(0)

  const navigate = useCallback((p: PageKey) => {
    setPage(p)
    const nextPath = `/app/${p}`
    if (window.location.pathname !== nextPath) window.history.pushState({ page: p }, '', nextPath)
  }, [])

  // Keep browser back/forward and direct URLs synchronized with the visible page.
  useEffect(() => {
    const syncPageFromUrl = () => {
      const nextPage = pageFromLocation()
      setPage(nextPage)
      const canonicalPath = `/app/${nextPage}`
      if (window.location.pathname !== canonicalPath) window.history.replaceState({ page: nextPage }, '', canonicalPath)
    }
    if (window.location.pathname !== `/app/${page}`) {
      window.history.replaceState({ page }, '', `/app/${page}`)
    }
    window.addEventListener('popstate', syncPageFromUrl)
    return () => window.removeEventListener('popstate', syncPageFromUrl)
  }, [page])
  // Un apporteur d'affaires (ou le call) a son tableau de bord, ses prospects et ses commissions.
  const estApporteur = profile?.role === 'apporteur'
  useEffect(() => {
    if (estApporteur && !['espace_apporteur', 'prospects', 'commissions'].includes(page)) navigate('espace_apporteur')
  }, [estApporteur, page, navigate])
  const goToDevis = useCallback((devisId: string) => {
    setPendingDevisId(devisId)
    navigate('devis')
  }, [navigate])
  const continuerCycleProspect = useCallback((target: 'visite' | 'simulation' | 'devis' | 'dossier', prospect: { id: string }) => {
    if (target === 'visite') setPendingVisiteProspectId(prospect.id)
    if (target === 'devis') setPendingDevisProspectId(prospect.id)
    if (target === 'dossier') setPendingDossierProspectId(prospect.id)
    if (target === 'simulation') setPendingSimulationProspectId(prospect.id)
    // La simulation d'aides est préremplie avec le prospect choisi ; les résultats 3CL restent archivés séparément.
    navigate(target === 'visite' ? 'visites' : target === 'devis' ? 'devis' : target === 'dossier' ? 'dossiers' : 'simulations')
  }, [navigate])

  // Vérifie les devis sans réponse et les tâches en retard à chaque ouverture de
  // l'app (idempotent, voir lib/crm/relances.ts), puis rafraîchit la cloche de notifications.
  useEffect(() => {
    if (!session) return
    verifierRelances(profile?.nom_complet || null).then(() => setNotifRefresh(n => n + 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

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

  if (doitDefinirMotDePasse) {
    return <DefinirMotDePassePage />
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
          <Suspense fallback={<div className="page" style={{display:'flex',justifyContent:'center',padding:48}}><Loader2 className="spin" size={26} /></div>}>
          {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
          {(page === 'prospects' || page === 'pipeline') && <ProspectsPage key={page} initialView={page === 'pipeline' ? 'pipeline' : 'liste'} onContinueLifecycle={continuerCycleProspect} initialProspectId={pendingProspectId} onInitialProspectHandled={() => setPendingProspectId(null)} />}
          {page === 'prospection' && <ProspectionTelephonePage />}
          {page === 'prospection_terrain' && <ProspectionTerrainPage />}
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
          {page === 'partenaires' && <ApporteursPage />}
          {page === 'installateurs' && (['admin','manager','partner_admin','company_admin'].includes(profile?.role || '') ? <PartenairesPage /> : <div className="page"><div className="card card-pad"><strong>Accès réservé à la direction et aux responsables autorisés.</strong></div></div>)}
          {page === 'challenges' && <ChallengesPage />}
          {page === 'espace_apporteur' && <EspaceApporteurPage onNavigate={navigate} onOuvrirProspect={id => { setPendingProspectId(id); navigate('prospects') }} />}
          {page === 'pilotage' && (profile.role === 'admin' || profile.role === 'manager' ? <PilotagePage onNavigate={navigate} /> : <div className="page"><div className="card card-pad"><strong>Accès réservé à la direction.</strong></div></div>)}
          {page === 'performance' && (profile.role === 'admin' || profile.role === 'manager' ? <PerformancePage /> : <div className="page"><div className="card card-pad"><strong>Accès réservé à l'administration.</strong></div></div>)}
          {page === 'sante_systeme' && (profile.role === 'admin' || profile.role === 'manager' ? <SystemHealthPage /> : <div className="page"><div className="card card-pad"><strong>Accès réservé à l'administration.</strong></div></div>)}
          {page === 'organisation' && <OrganisationPage />}
          {page === 'solaire' && <SimulateurSolairePage onCreateDevis={goToDevis} />}
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default function App() { return <AppErrorBoundary><AppContent /></AppErrorBoundary> }
