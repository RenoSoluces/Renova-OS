import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ArrowLeft,
  Plus,
  ClipboardCheck,
  Wrench,
  Upload,
  Sun,
  AlertTriangle,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Trash2,
  FileText,
  ClipboardList,
  Home,
  BrickWall,
  Layers,
  DoorOpen,
  Thermometer,
  Snowflake,
  Droplets,
  Fan,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import { creerDevisDepuisTravaux } from '../lib/devis/creerDevisDepuisTravaux'
import { creerDevisDepuisPV } from '../lib/devis/creerDevisDepuisPV'
import type {
  Prospect,
  Visite,
  AuditData,
  MurFiche,
  MenuiserieFiche,
  Entreprise,
  PhotovoltaiqueData,
  Produit,
} from '../types'
import { VisiteTechniqueWizard } from '../components/visites/VisiteTechniqueWizard'
import { Section01Identification } from '../components/visites/sections/Section01Identification'
import { Section02DonneesBatiment } from '../components/visites/sections/Section02DonneesBatiment'
import { Section03Murs } from '../components/visites/sections/Section03Murs'
import { Section04Menuiseries } from '../components/visites/sections/Section04Menuiseries'
import Section05Planchers from '../components/visites/sections/Section05Planchers'
import Section06Plafonds from '../components/visites/sections/Section06Plafonds'
import Section07Ventilation from '../components/visites/sections/Section07Ventilation'
import Section08Chauffage from '../components/visites/sections/Section08Chauffage'
import Section09ECS from '../components/visites/sections/Section09ECS'
import Section10Photovoltaique from '../components/visites/sections/Section10Photovoltaique'
import Section11RelevePose from '../components/visites/sections/Section11RelevePose'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { FloatInput, FloatSelect } from '../components/ui/FloatInput'
import {
  construireBatiment3CL,
  calculDPE,
  proposerTravaux,
  calculDeperditions,
  proposerBouquets,
} from '../lib/3cl'
import {
  PRODUITS_VISITE,
  produitsDeLaVisite,
  produitVisiteById,
  sectionsPourVisite,
} from '../lib/3cl/produitsVisite'
import { ResultatsAudit } from '../components/visites/resultats/ResultatsAudit'
import { telechargerRapportVisitePDF } from '../lib/pdf/genererRapportVisitePDF'
import { simulerPhotovoltaique } from '../lib/photovoltaique/calculProduction'
import type { ParametresTarifairesPV } from '../lib/photovoltaique/calculProduction'
import { PARAMETRES_PV_PAR_DEFAUT } from '../lib/photovoltaique/calculProduction'
import { verifierCoherenceAudit } from '../lib/visite/verifierCoherenceAudit'
import { estimerFinancementTravaux } from '../lib/financement/estimerFinancement'
import {
  enregistrerDraftLocal,
  lireDraftLocal,
  supprimerDraftLocal,
  marquerEnAttenteSync,
  retirerDeLaFileSync,
  listerVisitesEnAttente,
  estEnLigne,
} from '../lib/visite/offlineSync'
import { ImportRapportVT } from '../components/visites/ImportRapportVT'
import type { ImportVTResult } from '../lib/pdf/import/importVT'
import type { DispositifAide } from '../types'
import { logAuditEvent } from '../lib/auditLog'
import { chargerCatalogue } from '../lib/catalogue/chargerCatalogue'
import { entrepriseCourante } from '../lib/organisation/entrepriseCourante'

const ICONES_CATEGORIE: Record<string, typeof Wrench> = {
  combles: Home, murs: BrickWall, plancher: Layers, menuiseries: DoorOpen,
  pac: Thermometer, pac_air_air: Snowflake, ballon_thermodynamique: Droplets,
  vmc: Fan, photovoltaique: Sun,
}

/** Mappe une catégorie du Catalogue produits vers le parcours VT correspondant.
 * Le produit reste la source de vérité : la VT est créée avec l'id exact du produit
 * (vt_produit_id), et ce mapping ne sert qu'à choisir les sections du wizard.
 */
function categorieVersProduitVisite(categorie: string | null | undefined): string | null {
  switch ((categorie || '').trim().toLowerCase()) {
    case 'combles': return 'combles'
    case 'murs': return 'murs'
    case 'plancher': return 'plancher'
    case 'menuiseries': return 'menuiseries'
    case 'pac_air_eau':
    case 'pac_geothermie': return 'pac'
    case 'pac_air_air': return 'pac_air_air'
    case 'ballon_thermodynamique': return 'ballon_thermodynamique'
    case 'vmc': return 'vmc'
    case 'photovoltaique': return 'photovoltaique'
    default: return null
  }
}

interface Props {
  onBack: () => void
  onCreateDevis?: (devisId: string) => void
  /** Prospect à préremplir en arrivant (depuis la fiche prospect, action "Continuer"). */
  initialProspectId?: string | null
  /** Appelé une fois le prospect initial pris en compte, pour que le parent nettoie son état. */
  onInitialProspectHandled?: () => void
}

export function VisitesPage({
  onBack,
  onCreateDevis,
  initialProspectId,
  onInitialProspectHandled,
}: Props) {
  const { profile } = useAuth()
  const admin = profile?.role === 'admin' || profile?.role === 'manager'

  const [view, setView] = useState<'list' | 'wizard' | 'overview'>('list')
  const [visites, setVisites] = useState<Visite[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [currentVisite, setCurrentVisite] = useState<Visite | null>(null)
  const [qualificationVisite, setQualificationVisite] = useState<Visite | null>(null)
  const [qualificationProduitId, setQualificationProduitId] = useState('')
  const [qualificationSaving, setQualificationSaving] = useState(false)
  const [currentSection, setCurrentSection] = useState(1)
  const [currentEtape, setCurrentEtape] = useState(0)

  const [showNewModal, setShowNewModal] = useState(false)
  const [showImportVT, setShowImportVT] = useState(false)
  const [fichierImportVT, setFichierImportVT] = useState<File | null>(null)
  const inputImportVTRef = useRef<HTMLInputElement>(null)

  const [newProspectId, setNewProspectId] = useState('')
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [newProduitId, setNewProduitId] = useState('')
  /** Catégorie de produit de la visite (id d'un parcours PRODUITS_VISITE) ou 'complete' pour l'audit complet. */
  const [newCategorieId, setNewCategorieId] = useState('')
  /** Autres produits de la même VT (VT multi-produits). */
  const [newProduitsSupp, setNewProduitsSupp] = useState<string[]>([])
  const basculerProduitVisite = (id: string) => {
    if (id === 'complete') { setNewCategorieId('complete'); setNewProduitsSupp([]); setNewProduitId(''); return }
    const actuels = newCategorieId && newCategorieId !== 'complete' ? [newCategorieId, ...newProduitsSupp] : []
    const suivants = actuels.includes(id) ? actuels.filter(x => x !== id) : [...actuels, id]
    setNewCategorieId(suivants[0] || ''); setNewProduitsSupp(suivants.slice(1)); setNewProduitId('')
  }
  const [createError, setCreateError] = useState<string | null>(null)

  const [dpeResult, setDpeResult] = useState<
    ReturnType<typeof calculDPE> | null
  >(null)

  const [deperditionsResult, setDeperditionsResult] = useState<
    ReturnType<typeof calculDeperditions> | null
  >(null)

  const [travauxResult, setTravauxResult] = useState<
    ReturnType<typeof proposerTravaux> | null
  >(null)

  const [bouquetsResult, setBouquetsResult] = useState<
    ReturnType<typeof proposerBouquets> | null
  >(null)

  const [savingSimulation, setSavingSimulation] = useState(false)
  const [simulationSaved, setSimulationSaved] = useState(false)
  const [selectedTravaux, setSelectedTravaux] = useState<string[]>([])
  const [creatingDevis, setCreatingDevis] = useState(false)
  const [dispositifsAides, setDispositifsAides] = useState<
    DispositifAide[]
  >([])
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [prixCataloguePV, setPrixCataloguePV] = useState<number | null>(null)
  const [catalogueProduits, setCatalogueProduits] = useState<Produit[]>([])
  const [creatingDevisPV, setCreatingDevisPV] = useState(false)

  useEffect(() => {
    entrepriseCourante('*')
      .then(({ data }) => {
        if (data) setEntreprise(data as Entreprise)
      })

    supabase
      .from('catalogue_produits')
      .select('prix_unitaire_ht, unite')
      .eq('actif', true)
      .eq('categorie', 'photovoltaique')
      .eq('unite', 'kwc')
      .order('prix_unitaire_ht')
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]) {
          setPrixCataloguePV(data[0].prix_unitaire_ht)
        }
      })

    // Lecture paginée et limitée aux colonnes autorisées : `select('*')` est refusé par la base
    // (le prix d'achat partenaire est masqué) et la liste restait vide.
    chargerCatalogue<Produit>({ actifSeulement: true, tri: [{ colonne: 'nom' }] })
      .then(({ data }) => setCatalogueProduits(data))
  }, [])

  const fetchVisites = useCallback(async () => {
    const { data } = await supabase
      .from('visites')
      .select('*, prospect:prospects(*)')
      .order('created_at', { ascending: false })

    setVisites((data as any) || [])
    setLoading(false)
  }, [])

  const fetchProspects = useCallback(async () => {
    const { data } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false })

    setProspects(data || [])
  }, [])

  useEffect(() => {
    fetchVisites()
    fetchProspects()
  }, [fetchVisites, fetchProspects])

  const auditData: AuditData = currentVisite?.audit_data || {}
  const completedSections = auditData.completed_sections || []

  const [syncStatus, setSyncStatus] = useState<
    'synced' | 'syncing' | 'offline' | 'pending'
  >('synced')

  const [isOnline, setIsOnline] = useState(estEnLigne())
  const [pendingSyncIds, setPendingSyncIds] = useState<string[]>(
    listerVisitesEnAttente(),
  )

  const flushPendingSync = useCallback(async () => {
    const enAttente = listerVisitesEnAttente()

    for (const visiteId of enAttente) {
      const draft = lireDraftLocal(visiteId)

      if (!draft) {
        retirerDeLaFileSync(visiteId)
        continue
      }

      const { error } = await supabase
        .from('visites')
        .update({ audit_data: draft.auditData })
        .eq('id', visiteId)

      if (!error) {
        retirerDeLaFileSync(visiteId)
        supprimerDraftLocal(visiteId)

        if (currentVisite?.id === visiteId) {
          setSyncStatus('synced')
          setCurrentVisite(prev =>
            prev
              ? {
                  ...prev,
                  audit_data: draft.auditData,
                }
              : prev,
          )
        }
      }
    }

    setPendingSyncIds(listerVisitesEnAttente())
  }, [currentVisite?.id])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      flushPendingSync()
    }

    function handleOffline() {
      setIsOnline(false)
      setSyncStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flushPendingSync])

  useEffect(() => {
    flushPendingSync()
  }, [flushPendingSync])

  useEffect(() => {
    if (view !== 'wizard' && view !== 'overview') return

    const interval = window.setInterval(() => {
      if (estEnLigne()) {
        flushPendingSync()
      }
    }, 20000)

    return () => window.clearInterval(interval)
  }, [view, flushPendingSync])

  const saveAuditData = useCallback(
    async (data: AuditData) => {
      if (!currentVisite) return

      const merged = {
        ...currentVisite.audit_data,
        ...data,
      }

      setCurrentVisite({
        ...currentVisite,
        audit_data: merged,
      })

      enregistrerDraftLocal(currentVisite.id, merged)

      if (!estEnLigne()) {
        marquerEnAttenteSync(currentVisite.id)
        setSyncStatus('offline')
        setPendingSyncIds(listerVisitesEnAttente())
        return
      }

      setSyncStatus('syncing')

      try {
        const { error } = await supabase
          .from('visites')
          .update({ audit_data: merged })
          .eq('id', currentVisite.id)

        if (error) throw error

        retirerDeLaFileSync(currentVisite.id)
        supprimerDraftLocal(currentVisite.id)
        setSyncStatus('synced')
        setPendingSyncIds(listerVisitesEnAttente())
      } catch {
        marquerEnAttenteSync(currentVisite.id)
        setSyncStatus('pending')
        setPendingSyncIds(listerVisitesEnAttente())
      }
    },
    [currentVisite],
  )

  const saveSection = useCallback(
    (sectionKey: keyof AuditData, data: any) => {
      saveAuditData({
        [sectionKey]: data,
      } as any)
    },
    [saveAuditData],
  )

  const saveMurs = useCallback(
    (murs: MurFiche[]) => {
      saveAuditData({ murs })
    },
    [saveAuditData],
  )

  const saveMenuiseries = useCallback(
    (menuiseries: MenuiserieFiche[]) => {
      saveAuditData({ menuiseries })
    },
    [saveAuditData],
  )

  const markSectionComplete = useCallback(
    (sectionId: number) => {
      if (completedSections.includes(sectionId)) return

      saveAuditData({
        completed_sections: [
          ...completedSections,
          sectionId,
        ],
      } as any)
    },
    [completedSections, saveAuditData],
  )

  const batiment3CL = useMemo(
    () => construireBatiment3CL(auditData),
    [auditData],
  )

  const activeSections = useMemo(() => {
    const base = sectionsPourVisite(currentVisite?.type_visite, currentVisite?.produit_cible, currentVisite?.audit_data?.produits_cibles)
    const prospect = currentVisite?.prospect as Prospect | undefined
    const isTh174 = (prospect?.fiches_cee || []).some(code => code === 'BAR-TH-174' || code === 'BAR TH 174')
    const isPvVisit = currentVisite?.produit_cible === 'photovoltaique'
    return isTh174 && !isPvVisit ? base.filter(id => id !== 10) : base
  }, [currentVisite?.type_visite, currentVisite?.produit_cible, currentVisite?.prospect, currentVisite?.audit_data?.produits_cibles])

  const produitCibleInfo = produitVisiteById(
    currentVisite?.produit_cible,
  )

  const parametresTarifairesPV: ParametresTarifairesPV =
    useMemo(
      () =>
        entreprise
          ? {
              prixAchatEvite:
                entreprise.pv_prix_achat_evite_eur_kwh ??
                PARAMETRES_PV_PAR_DEFAUT.prixAchatEvite,
              prixReventeSurplus:
                entreprise.pv_prix_revente_surplus_eur_kwh ??
                PARAMETRES_PV_PAR_DEFAUT.prixReventeSurplus,
              coutInstallationParKwc:
                entreprise.pv_cout_installation_eur_par_kwc ??
                PARAMETRES_PV_PAR_DEFAUT.coutInstallationParKwc,
              primeMoins3kwc:
                entreprise.pv_prime_moins_3kwc_eur_par_kwc ??
                PARAMETRES_PV_PAR_DEFAUT.primeMoins3kwc,
              prime3a9kwc:
                entreprise.pv_prime_3_9kwc_eur_par_kwc ??
                PARAMETRES_PV_PAR_DEFAUT.prime3a9kwc,
              prime9a36kwc:
                entreprise.pv_prime_9_36kwc_eur_par_kwc ??
                PARAMETRES_PV_PAR_DEFAUT.prime9a36kwc,
              primePlus36kwc:
                entreprise.pv_prime_plus_36kwc_eur_par_kwc ??
                PARAMETRES_PV_PAR_DEFAUT.primePlus36kwc,
            }
          : PARAMETRES_PV_PAR_DEFAUT,
      [entreprise],
    )

  const simulationPV = useMemo(() => {
    const prospect = currentVisite?.prospect as Prospect | undefined
    const isTh174 = (prospect?.fiches_cee || []).some(code => code === 'BAR-TH-174' || code === 'BAR TH 174')
    const pv = auditData.photovoltaique

    if (
      (isTh174 && currentVisite?.produit_cible !== 'photovoltaique') ||
      !pv ||
      !pv.orientation_toiture ||
      (!pv.surface_disponible_m2 &&
        !pv.puissance_souhaitee_kwc)
    ) {
      return null
    }

    return simulerPhotovoltaique(
      pv,
      batiment3CL.zoneClimatique,
      parametresTarifairesPV,
      prixCataloguePV,
    )
  }, [
    auditData.photovoltaique,
    currentVisite?.prospect,
    batiment3CL.zoneClimatique,
    parametresTarifairesPV,
    prixCataloguePV,
  ])

  const alertesCoherence = useMemo(
    () =>
      verifierCoherenceAudit(
        auditData,
        batiment3CL,
        activeSections,
      ),
    [auditData, batiment3CL, activeSections],
  )

  const financementParGeste = useMemo(() => {
    const map: Record<
      string,
      ReturnType<typeof estimerFinancementTravaux>
    > = {}

    const prospect =
      (currentVisite?.prospect as Prospect) || null

    const tauxCEE =
      entreprise?.taux_cee_eur_par_mwh_cumac ?? 6

    const idsAConsiderer = new Set<string>([
      ...(travauxResult || []).map(t => t.id),
      ...((bouquetsResult || []).flatMap(b => b.gestes)),
    ])

    idsAConsiderer.forEach(id => {
      const categorieDevis =
        produitVisiteById(id)?.categorieDevis

      if (!categorieDevis) return

      map[id] = estimerFinancementTravaux(
        categorieDevis,
        batiment3CL,
        prospect,
        catalogueProduits,
        tauxCEE,
      )
    })

    return map
  }, [
    travauxResult,
    bouquetsResult,
    batiment3CL,
    currentVisite?.prospect,
    catalogueProduits,
    entreprise?.taux_cee_eur_par_mwh_cumac,
  ])

  function financementBouquet(gestes: string[]) {
    const items = gestes
      .map(g => financementParGeste[g])
      .filter(Boolean)

    if (items.length === 0) return null

    return {
      montantTravauxHT: items.reduce(
        (s, i) => s + i.montantTravauxHT,
        0,
      ),
      totalAides: items.reduce(
        (s, i) => s + i.totalAides,
        0,
      ),
      resteACharge: items.reduce(
        (s, i) => s + i.resteACharge,
        0,
      ),
      profilConnu: items.every(i => i.profilConnu),
      sourceIndicative: items.some(
        i => i.sourcePrix === 'indicatif',
      ),
    }
  }

  const [autoDpeVisiteId, setAutoDpeVisiteId] = useState<string | null>(null)

  const calculerLeDpe = useCallback(() => {
    const resultat = calculDPE(batiment3CL)
    const deperditionsResultat =
      calculDeperditions(batiment3CL)

    let travaux = proposerTravaux(batiment3CL)

    if (
      currentVisite?.type_visite === 'produit' &&
      currentVisite.produit_cible
    ) {
      const produitsVises = produitsDeLaVisite(currentVisite.produit_cible, currentVisite.audit_data?.produits_cibles)
      travaux = travaux.filter(
        t => produitsVises.includes(t.id),
      )
    }

    setDpeResult(resultat)
    setDeperditionsResult(deperditionsResultat)
    setTravauxResult(travaux)

    setBouquetsResult(
      currentVisite?.type_visite === 'produit'
        ? []
        : proposerBouquets(batiment3CL),
    )

    setSelectedTravaux(
      travaux.map(t => t.id),
    )

    setSimulationSaved(false)
  }, [
    batiment3CL,
    currentVisite?.type_visite,
    currentVisite?.produit_cible,
  ])

  useEffect(() => {
    if (!autoDpeVisiteId || currentVisite?.id !== autoDpeVisiteId) return
    setAutoDpeVisiteId(null)
    setView('overview')
    calculerLeDpe()
  }, [autoDpeVisiteId, currentVisite?.id, calculerLeDpe])

  const telechargerRapport = useCallback(() => {
    if (!currentVisite) return

    telechargerRapportVisitePDF(
      currentVisite,
      auditData,
      batiment3CL,
      dpeResult,
      deperditionsResult,
      travauxResult,
      (currentVisite.prospect as Prospect) || null,
      entreprise,
      bouquetsResult,
      simulationPV,
      financementParGeste,
    )
  }, [
    currentVisite,
    auditData,
    batiment3CL,
    dpeResult,
    deperditionsResult,
    travauxResult,
    entreprise,
    bouquetsResult,
    simulationPV,
    financementParGeste,
  ])

  useEffect(() => {
    if (
      !dpeResult ||
      currentVisite?.type_visite !== 'produit' ||
      !currentVisite.produit_cible
    ) {
      setDispositifsAides([])
      return
    }

    supabase
      .from('dispositifs_aides')
      .select('*')
      .eq('categorie', currentVisite.produit_cible)
      .eq('statut', 'active')
      .order('dispositif')
      .then(({ data }) =>
        setDispositifsAides(
          (data || []) as DispositifAide[],
        ),
      )
  }, [
    dpeResult,
    currentVisite?.type_visite,
    currentVisite?.produit_cible,
  ])

  const toggleTravaux = useCallback((id: string) => {
    setSelectedTravaux(prev =>
      prev.includes(id)
        ? prev.filter(t => t !== id)
        : [...prev, id],
    )
  }, [])

  const selectionnerBouquet = useCallback(
    (gestes: string[]) => {
      const idsDisponibles = new Set<string>(
        (travauxResult || []).map(t => t.id),
      )

      setSelectedTravaux(
        gestes.filter(g => idsDisponibles.has(g)),
      )
    },
    [travauxResult],
  )

  const creerDevis = useCallback(async () => {
    if (
      !currentVisite ||
      selectedTravaux.length === 0 ||
      !travauxResult
    ) {
      return
    }

    setCreatingDevis(true)

    const items = travauxResult.filter(t =>
      selectedTravaux.includes(t.id),
    )

    const { devisId, error } =
      await creerDevisDepuisTravaux({
        prospectId: currentVisite.prospect_id,
        visiteId: currentVisite.id,
        batiment: batiment3CL,
        travaux: items,
        origine: 'visite technique',
      })

    if (devisId) {
      onCreateDevis?.(devisId)
    } else if (error) {
      alert(error)
    }

    setCreatingDevis(false)
  }, [
    currentVisite,
    selectedTravaux,
    travauxResult,
    onCreateDevis,
    batiment3CL,
  ])

  const creerDevisPourPV = useCallback(async () => {
    if (!currentVisite || !simulationPV) return

    setCreatingDevisPV(true)

    const { devisId, error } =
      await creerDevisDepuisPV({
        prospectId: currentVisite.prospect_id,
        visiteId: currentVisite.id,
        simulation: simulationPV,
        origine: 'visite technique photovoltaïque',
      })

    if (devisId) {
      onCreateDevis?.(devisId)
    } else if (error) {
      alert(error)
    }

    setCreatingDevisPV(false)
  }, [currentVisite, simulationPV, onCreateDevis])

  const enregistrerSimulation = useCallback(async () => {
    if (!currentVisite || !dpeResult) return

    setSavingSimulation(true)

    const prospect = currentVisite.prospect as any

    const nom = `DPE ${
      prospect
        ? `${prospect.prenom} ${prospect.nom}`
        : ''
    } — ${new Date().toLocaleDateString('fr-FR')}`

    const { error } = await supabase
      .from('simulations')
      .insert({
        prospect_id: currentVisite.prospect_id,
        visite_id: currentVisite.id,
        nom,
        config_avant: batiment3CL,
        resultat_avant: dpeResult,
        dpe_avant: dpeResult.etiquette,
        travaux_json: travauxResult || [],
      })

    setSavingSimulation(false)

    if (error) {
      alert(
        `Échec de l'enregistrement de la simulation : ${error.message}`,
      )
    } else {
      setSimulationSaved(true)
    }
  }, [
    currentVisite,
    dpeResult,
    batiment3CL,
    travauxResult,
  ])

  const handleNext = useCallback(() => {
    markSectionComplete(currentSection)

    if (
      currentSection === 3 &&
      currentEtape === 0
    ) {
      const nextSection = activeSections.find(
        s => s > currentSection,
      )

      if (nextSection) {
        setCurrentSection(nextSection)
        setCurrentEtape(0)
      } else {
        setView('overview')
      }

      return
    }

    const nextSection = activeSections.find(
      s => s > currentSection,
    )

    if (nextSection) {
      setCurrentSection(nextSection)
      setCurrentEtape(0)
    } else {
      setView('overview')
    }
  }, [
    currentSection,
    currentEtape,
    markSectionComplete,
    activeSections,
  ])

  const handlePrev = useCallback(() => {
    if (
      currentSection === 3 &&
      currentEtape > 0
    ) {
      setCurrentEtape(0)
      return
    }

    const prevSection = [...activeSections]
      .reverse()
      .find(s => s < currentSection)

    if (prevSection) {
      setCurrentSection(prevSection)
      setCurrentEtape(0)
    } else {
      setView('list')
    }
  }, [
    currentSection,
    currentEtape,
    activeSections,
  ])

  const startVisite = useCallback(
    (visite: Visite) => {
      const draft = lireDraftLocal(visite.id)

      const visiteAOuvrir = draft
        ? {
            ...visite,
            audit_data: draft.auditData,
          }
        : visite

      if (draft) {
        marquerEnAttenteSync(visite.id)
        setSyncStatus('pending')
        setPendingSyncIds(
          listerVisitesEnAttente(),
        )
      } else {
        setSyncStatus('synced')
      }

      setCurrentVisite(visiteAOuvrir)

      const isTh174 = ((visite.prospect as Prospect | undefined)?.fiches_cee || []).some(code => code === 'BAR-TH-174' || code === 'BAR TH 174')
      const isPvVisit = visite.produit_cible === 'photovoltaique'
      const sections = sectionsPourVisite(visite.type_visite, visite.produit_cible, visite.audit_data?.produits_cibles).filter(id => !(isTh174 && !isPvVisit && id === 10))
      setCurrentSection(sections[0] || 1)

      setCurrentEtape(0)
      setDpeResult(null)
      setDeperditionsResult(null)
      setTravauxResult(null)
      setBouquetsResult(null)
      setView('wizard')
    },
    [],
  )

  const qualifyVisite = useCallback(async () => {
    if (!admin || !qualificationVisite || !qualificationProduitId) return
    setQualificationSaving(true)

    const commercialId = (qualificationVisite.prospect as any)?.commercial_id || null
    if (!commercialId) {
      alert('Impossible de déterminer le commercial rattaché à cette VT.')
      setQualificationSaving(false)
      return
    }

    // Relecture de la VT avant qualification : si elle est déjà qualifiée,
    // on ferme simplement la fenêtre pour éviter toute seconde qualification.
    const { data: currentVisite, error: currentVisiteError } = await supabase
      .from('visites')
      .select('vt_produit_id')
      .eq('id', qualificationVisite.id)
      .maybeSingle()

    if (currentVisiteError) {
      alert(`Impossible de vérifier l'état de la VT : ${currentVisiteError.message}`)
      setQualificationSaving(false)
      return
    }

    if (currentVisite?.vt_produit_id) {
      await fetchVisites()
      setQualificationSaving(false)
      setQualificationVisite(null)
      setQualificationProduitId('')
      return
    }

    // Les barèmes VT sont des montants fixes pour une visite technique.
    // On récupère toutes les règles actives puis on applique une hiérarchie :
    // produit+commercial > produit seul > commercial seul > barème VT générique.
    const { data: baremes, error: baremeError } = await supabase
      .from('commission_bareme')
      .select('*')
      .eq('type', 'vt')
      .eq('actif', true)
      .order('priorite', { ascending: false })
      .order('created_at', { ascending: false })

    if (baremeError) {
      alert(`Impossible de charger les barèmes VT : ${baremeError.message}`)
      setQualificationSaving(false)
      return
    }

    const dateRef = (qualificationVisite.date_visite || new Date().toISOString()).slice(0, 10)
    const actifs = (baremes || []).filter((b: any) => {
      const debutOK = !b.date_debut || String(b.date_debut).slice(0, 10) <= dateRef
      const finOK = !b.date_fin || String(b.date_fin).slice(0, 10) >= dateRef
      return debutOK && finOK
    })

    const score = (b: any) => {
      const product = b.produit_id ? b.produit_id === qualificationProduitId : true
      const commercial = b.commercial_id ? b.commercial_id === commercialId : true
      if (!product || !commercial) return -1
      // Une règle spécifique gagne toujours sur une règle générique.
      return (b.produit_id ? 4 : 0) + (b.commercial_id ? 2 : 0)
    }

    const candidates = actifs
      .map((b: any) => ({ b, score: score(b) }))
      .filter((x: any) => x.score >= 0)
      .sort((a: any, b: any) =>
        b.score - a.score || Number(b.b.priorite || 0) - Number(a.b.priorite || 0)
      )

    const bareme = candidates[0]?.b

    if (!bareme) {
      alert(
        `La VT est qualifiée, mais aucun barème VT actif ne correspond.\n\n` +
        `Produit sélectionné : ${qualificationProduitId}\n` +
        `Commercial : ${commercialId}\n` +
        `Date : ${dateRef}`
      )
      setQualificationSaving(false)
      await fetchVisites()
      setQualificationVisite(null)
      return
    }

    const montantCommercial = Number(bareme.montant_commercial) || 0
    const montantSociete = Number(bareme.montant_societe) || 0

    // Sécurité : un barème trouvé mais à 0 ne doit pas être présenté comme
    // une commission calculée. On informe l'admin avec le libellé du barème.
    if (montantCommercial === 0 && montantSociete === 0) {
      alert(
        `Le barème « ${bareme.libelle || 'Visite technique'} » a bien été trouvé, ` +
        `mais ses montants sont à 0 €. Vérifie ses montants commercial et société dans la matrice de rémunération.`
      )
      setQualificationSaving(false)
      return
    }

    const { data: existing } = await supabase
      .from('commissions')
      .select('id')
      .eq('reference_type', 'visites')
      .eq('reference_id', qualificationVisite.id)
      .maybeSingle()

    const commissionPayload = {
      commercial_id: commercialId,
      type: 'vt',
      libelle: bareme.libelle || 'Visite technique',
      reference_type: 'visites',
      reference_id: qualificationVisite.id,
      montant_commercial: montantCommercial,
      montant_societe: montantSociete,
      statut: existing ? undefined : 'en_attente',
      date_generation: existing ? undefined : new Date().toISOString(),
    }

    const { error: commissionError } = existing
      ? await supabase.from('commissions').update({
          commercial_id: commissionPayload.commercial_id,
          type: commissionPayload.type,
          libelle: commissionPayload.libelle,
          montant_commercial: commissionPayload.montant_commercial,
          montant_societe: commissionPayload.montant_societe,
        }).eq('id', existing.id)
      : await supabase.from('commissions').insert(commissionPayload)

    setQualificationSaving(false)

    if (commissionError) {
      alert(`La VT est qualifiée, mais la commission n'a pas pu être créée : ${commissionError.message}`)
      return
    }

    await logAuditEvent({ action: existing ? 'commission_vt_maj' : 'commission_vt_creee', entityType: 'commission', entityId: existing?.id || null, description: `Commission VT ${bareme.libelle || 'Visite technique'} — ${montantCommercial} € commercial / ${montantSociete} € société`, meta: { visite_id: qualificationVisite.id, produit_id: qualificationProduitId, commercial_id: commercialId } })

    // Marque la VT comme qualifiée uniquement après la création/mise à jour
    // effective de sa commission. Le filtre sur NULL évite une seconde
    // qualification si un autre clic est intervenu entre-temps.
    const { data: qualifiedVisite, error: qualificationError } = await supabase
      .from('visites')
      .update({ vt_produit_id: qualificationProduitId })
      .eq('id', qualificationVisite.id)
      .is('vt_produit_id', null)
      .select('id,vt_produit_id')
      .maybeSingle()

    if (qualificationError) {
      alert(`La commission a été enregistrée, mais la VT n'a pas pu être marquée comme qualifiée : ${qualificationError.message}`)
      setQualificationSaving(false)
      await fetchVisites()
      return
    }

    if (!qualifiedVisite) {
      // Une autre qualification a déjà été enregistrée. On ne laisse pas
      // l'interface proposer une nouvelle qualification.
      await fetchVisites()
      setQualificationSaving(false)
      setQualificationVisite(null)
      setQualificationProduitId('')
      return
    }

    await logAuditEvent({
      action: 'vt_qualifiee',
      entityType: 'visite',
      entityId: qualificationVisite.id,
      actorId: profile?.id,
      description: `VT qualifiée avec le barème « ${bareme.libelle || 'Visite technique'} »`,
      meta: { commercial_id: commercialId, produit_id: qualificationProduitId, montant_commercial: montantCommercial, montant_societe: montantSociete },
    })
    alert(`VT qualifiée avec le barème « ${bareme.libelle || 'Visite technique'} » : ${montantCommercial} € commercial / ${montantSociete} € société.`)
    await fetchVisites()
    setQualificationVisite(null)
    setQualificationProduitId('')
  }, [admin, qualificationVisite, qualificationProduitId, fetchVisites, profile?.id])

  const deleteVisite = useCallback(async (visite: Visite) => {
    if (!admin) return
    const p = visite.prospect as Prospect | undefined
    const nom = p ? `${p.prenom} ${p.nom}` : 'ce client'
    if (!confirm(`Supprimer définitivement la visite technique de ${nom} ?`)) return
    const { error } = await supabase.from('visites').delete().eq('id', visite.id)
    if (error) { alert(`Impossible de supprimer la visite : ${error.message}`); return }
    await fetchVisites()
  }, [admin, fetchVisites])

  useEffect(() => {
    if (!admin || visites.length === 0) return
    const pendingId = localStorage.getItem('renova_pending_vt_id')
    if (!pendingId) return
    const visite = visites.find(v => v.id === pendingId)
    if (!visite) return
    localStorage.removeItem('renova_pending_vt_id')
    startVisite(visite)
  }, [admin, visites, startVisite])

  const createVisite = useCallback(async () => {
    if (!newProspectId) {
      setCreateError(
        'Sélectionnez un prospect avant de continuer.',
      )
      return
    }

    if (!newCategorieId) {
      setCreateError('Sélectionnez la catégorie de produit qui fait l’objet de la visite technique.')
      return
    }

    // Le produit précis est facultatif : sans lui, la VT apparaît « à qualifier » côté administration.
    const produitCible = newCategorieId === 'complete' ? null : newCategorieId
    setCreateError(null)

    const payload = {
      prospect_id: newProspectId,
      date_visite: newDate,
      statut: 'en_cours',
      audit_data: produitCible && newProduitsSupp.length ? { produits_cibles: [produitCible, ...newProduitsSupp] } : {},
      type_visite: produitCible ? 'produit' : 'complete',
      produit_cible: produitCible,
      vt_produit_id: newProduitId || null,
    }

    const { data, error } = await supabase
      .from('visites')
      .insert(payload)
      .select('*, prospect:prospects(*)')
      .single()

    if (error) {
      console.error(
        '[RENOVA OS] Création visite impossible:',
        error,
      )

      setCreateError(
        `Impossible de créer la visite : ${error.message}`,
      )

      return
    }

    if (!data) {
      setCreateError(
        'La visite n’a pas pu être créée. Aucun enregistrement n’a été retourné.',
      )

      return
    }

    setShowNewModal(false)
    setNewProspectId('')
    setNewProduitId('')
    setNewCategorieId('')
    setNewProduitsSupp([])
    setCreateError(null)

    startVisite(data as any)
    fetchVisites()
  }, [
    newProspectId,
    newDate,
    newProduitId,
    newCategorieId,
    newProduitsSupp,
    startVisite,
    fetchVisites,
  ])

  const handleImportRapportVT = useCallback(
    async (
      importedAuditData: AuditData,
      _result: ImportVTResult,
    ) => {
      if (!newProspectId) {
        setCreateError(
          'Sélectionnez d’abord le prospect auquel rattacher le rapport.',
        )

        setShowImportVT(false)
        return
      }

      setCreateError(null)

      if (!newCategorieId) {
        setCreateError('Sélectionnez d’abord la catégorie de produit concernée par ce rapport de VT.')
        return
      }
      const produitCible = newCategorieId === 'complete' ? null : newCategorieId

      const payload = {
        prospect_id: newProspectId,
        date_visite: newDate,
        statut: 'en_cours',
        audit_data: produitCible && newProduitsSupp.length ? { ...importedAuditData, produits_cibles: [produitCible, ...newProduitsSupp] } : importedAuditData,
        type_visite: (produitCible ? 'produit' : 'complete') as 'produit' | 'complete',
        produit_cible: produitCible,
        vt_produit_id: newProduitId || null,
      }

      const { data, error } = await supabase
        .from('visites')
        .insert(payload)
        .select('*, prospect:prospects(*)')
        .single()

      if (error) {
        console.error(
          '[RENOVA OS] Import rapport VT impossible:',
          error,
        )

        setCreateError(
          `Impossible de créer la visite importée : ${error.message}`,
        )

        return
      }

      if (!data) {
        setCreateError(
          'La visite importée n’a pas pu être créée.',
        )

        return
      }

      setShowImportVT(false)
      setShowNewModal(false)

      setNewProspectId('')
          setNewProduitId('')
    setNewCategorieId('')
    setNewProduitsSupp([])
      setCreateError(null)

      startVisite(data as Visite)
      // Visite importée : on affiche directement la synthèse avec la note du logement calculée.
      setAutoDpeVisiteId((data as Visite).id)

      await fetchVisites()
    },
    [
      newProspectId,
      newDate,
      newProduitId,
      newCategorieId,
      newProduitsSupp,
      startVisite,
      fetchVisites,
    ],
  )

  useEffect(() => {
    if (!initialProspectId || loading) return

    const visiteEnCours = visites.find(
      v =>
        v.prospect_id === initialProspectId &&
        v.statut !== 'terminee',
    )

    if (visiteEnCours) {
      startVisite(visiteEnCours)
    } else {
      setNewProspectId(initialProspectId)
      setNewDate(
        new Date().toISOString().split('T')[0],
      )
          setNewProduitId('')
    setNewCategorieId('')
    setNewProduitsSupp([])
      setShowNewModal(true)
    }

    onInitialProspectHandled?.()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialProspectId,
    loading,
    visites,
    startVisite,
  ])

  // ===== LIST VIEW =====

  if (view === 'list') {
    return (
      <div
        className="app-content"
        style={{ flex: 1 }}
      >
        <div className="topbar">
          <button
            className="btn btn-ghost"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Retour
          </button>

          <div className="topbar-spacer" />

          <button
            className="btn btn-primary"
            onClick={() => {
              setCreateError(null)
              setShowNewModal(true)
            }}
          >
            <Plus size={18} />
            Nouvelle visite
          </button>
        </div>

        <div className="page-scroll">
          <div className="page">
            <div className="page-header">
              <div className="page-header-left">
                <div className="page-title">
                  Visites techniques
                </div>

                <div className="page-subtitle">
                  Audits énergétiques sur site avec
                  moteur 3CL
                </div>
              </div>
            </div>

            <section className="dashboard-kpis page-kpi-strip">
              <div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><ClipboardCheck size={19}/></span><span className="dashboard-kpi-main"><strong>{visites.filter(v => v.statut !== 'terminee').length}</strong><span>Visites en cours</span></span><span className="dashboard-kpi-note">À terminer</span></div>
              <div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><CheckCircle2 size={19}/></span><span className="dashboard-kpi-main"><strong>{visites.filter(v => v.statut === 'terminee').length}</strong><span>Visites terminées</span></span><span className="dashboard-kpi-note">Audits validés</span></div>
              <div className="dashboard-kpi"><span className="dashboard-kpi-icon blue"><FileText size={19}/></span><span className="dashboard-kpi-main"><strong>{new Set(visites.map(v => (v as any).vt_produit_id).filter(Boolean)).size}</strong><span>Produits VT utilisés</span></span><span className="dashboard-kpi-note">Catalogue</span></div>
            </section>

            {loading && (
              <div className="text-muted">
                Chargement…
              </div>
            )}

            {!loading &&
              visites.length === 0 && (
                <div className="empty-state">
                  <ClipboardCheck />

                  <h3>
                    Aucune visite technique
                  </h3>

                  <p>
                    Créez votre première visite
                    technique pour démarrer un audit
                    énergétique.
                  </p>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setCreateError(null)
                      setShowNewModal(true)
                    }}
                  >
                    <Plus size={18} />
                    Nouvelle visite
                  </button>
                </div>
              )}

            {visites.map(v => {
              const p = v.prospect as any

              const initials = p
                ? (p.prenom?.[0] || '') +
                  (p.nom?.[0] || '')
                : '?'

              const sectionsVisite =
                sectionsPourVisite(
                  v.type_visite,
                  v.produit_cible,
                  v.audit_data?.produits_cibles,
                )

              const progress = (
                v.audit_data?.completed_sections ||
                []
              ).filter(s =>
                sectionsVisite.includes(s),
              ).length

              const produitInfo =
                produitVisiteById(
                  v.produit_cible,
                )

              return (
                <div
                  key={v.id}
                  className="visite-list-item"
                  onClick={() =>
                    startVisite(v)
                  }
                >
                  <div className="visite-list-avatar">
                    {initials}
                  </div>

                  <div className="visite-list-info">
                    <div className="visite-list-name">
                      {p
                        ? `${p.prenom} ${p.nom}`
                        : 'Prospect inconnu'}

                      {v.type_visite ===
                        'produit' && (
                        <span
                          className="badge badge-info"
                          style={{
                            marginLeft: 8,
                          }}
                        >
                          {produitInfo?.label ||
                            'Produit ciblé'}
                          {(v.audit_data?.produits_cibles?.length || 0) > 1 ? ` + ${(v.audit_data!.produits_cibles!.length) - 1}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="visite-list-meta">
                      {v.date_visite &&
                        new Date(
                          v.date_visite,
                        ).toLocaleDateString(
                          'fr-FR',
                        )}

                      {' · '}
                      Section {progress}/
                      {sectionsVisite.length}

                      {p?.ville &&
                        ` · ${p.ville}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {admin && v.statut === 'terminee' && !(v as any).vt_produit_id && <button className="btn btn-sm btn-ghost" title="Qualifier le type de VT et générer la commission" onClick={e => { e.stopPropagation(); setQualificationVisite(v); setQualificationProduitId('') }}>Qualifier VT</button>}
                    {admin && <button className="btn btn-sm btn-ghost" title="Supprimer cette visite technique" onClick={e => { e.stopPropagation(); deleteVisite(v) }}><Trash2 size={15} /></button>}
                    <div
                      className="progress-bar"
                      style={{
                        width: 120,
                      }}
                    >
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${
                            sectionsVisite.length
                              ? (progress /
                                  sectionsVisite.length) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>

                    <span
                      className={`badge badge-${
                        v.statut === 'terminee'
                          ? 'success'
                          : v.statut === 'en_cours'
                            ? 'warning'
                            : 'neutral'
                      }`}
                    >
                      {v.statut}
                    </span>

                    {pendingSyncIds.includes(
                      v.id,
                    ) && (
                      <span
                        className="badge badge-warning"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Des modifications de cette visite n'ont pas encore été synchronisées"
                      >
                        <RefreshCw size={11} />
                        À synchroniser
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Modal
          open={showNewModal}
          onClose={() =>
            setShowNewModal(false)
          }
          title="Nouvelle visite technique"
          footer={
            <>
              <button
                className="btn btn-ghost"
                onClick={() =>
                  setShowNewModal(false)
                }
              >
                Annuler
              </button>

              <input
                ref={inputImportVTRef}
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={e => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  setFichierImportVT(f)
                  setShowImportVT(true)
                }}
              />
              <button
                className="btn btn-secondary"
                onClick={() => inputImportVTRef.current?.click()}
                disabled={!newProspectId || !newCategorieId}
                title={
                  !newProspectId
                    ? 'Sélectionnez d’abord un prospect'
                    : 'Importer un rapport de visite technique PDF'
                }
              >
                <Upload size={16} />
                Importer un rapport PDF
              </button>

              <button
                className="btn btn-primary"
                onClick={createVisite}
                disabled={!newProspectId || !newCategorieId}
              >
                Démarrer la visite
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <FloatSelect
              label="Prospect"
              value={newProspectId}
              onChange={setNewProspectId}
              options={prospects.map(p => ({
                value: p.id,
                label: `${p.prenom} ${p.nom} — ${
                  p.ville || ''
                }`,
              }))}
            />

            <FloatInput
              label="Date de la visite"
              type="date"
              value={newDate}
              onChange={setNewDate}
            />

            <div className="vt-create-product-block">
              <div className="vt-create-product-head">
                <div>
                  <div className="font-semibold">Objet de la visite</div>
                  <div className="text-sm text-muted">Un ou plusieurs produits (VT ciblée, plus rapide), ou l’audit complet du logement. Le relevé de pose est inclus dans les deux cas.</div>
                </div>
                <span className="badge badge-info">Obligatoire</span>
              </div>
              <div className="vt-product-picker">
                {PRODUITS_VISITE.map(c => {
                  const Icone = ICONES_CATEGORIE[c.id] || Wrench
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`vt-product-option ${newCategorieId === c.id || newProduitsSupp.includes(c.id) ? 'selected' : ''}`}
                      aria-pressed={newCategorieId === c.id || newProduitsSupp.includes(c.id)}
                      onClick={() => basculerProduitVisite(c.id)}
                    >
                      <span className="vt-product-option-icon"><Icone size={17}/></span>
                      <span><strong>{c.label}</strong><small>{c.description}</small></span>
                      <span className="vt-choice-radio"/>
                    </button>
                  )
                })}
                <button
                  type="button"
                  className={`vt-product-option ${newCategorieId === 'complete' ? 'selected' : ''}`}
                  onClick={() => basculerProduitVisite('complete')}
                >
                  <span className="vt-product-option-icon"><ClipboardList size={17}/></span>
                  <span><strong>Audit complet</strong><small>Toutes les sections : logement, enveloppe, systèmes, production.</small></span>
                  <span className="vt-choice-radio"/>
                </button>
              </div>
              {newProduitsSupp.length > 0 && <div className="text-sm text-muted" style={{ marginTop: 8 }}>VT multi-produits : {[newCategorieId, ...newProduitsSupp].map(id => produitVisiteById(id)?.label).join(' + ')}</div>}
              {newCategorieId && newCategorieId !== 'complete' && newProduitsSupp.length === 0 && (
                <div className="vt-create-product-precise">
                  <FloatSelect
                    label="Produit précis (facultatif)"
                    value={newProduitId}
                    onChange={setNewProduitId}
                    options={[
                      { value: '', label: 'À préciser plus tard (qualification administration)' },
                      ...catalogueProduits
                        .filter(p => categorieVersProduitVisite(p.categorie) === newCategorieId)
                        .map(p => ({ value: p.id, label: p.nom })),
                    ]}
                  />
                </div>
              )}
            </div>

            {createError && (
              <div
                className="visite-create-error"
                role="alert"
              >
                <AlertTriangle size={16} />
                <span>
                  {createError}
                </span>
              </div>
            )}
          </div>
        </Modal>

        {showImportVT && (
          <ImportRapportVT
            fichier={fichierImportVT}
            onClose={() => {
              setShowImportVT(false)
              setFichierImportVT(null)
            }}
            onImport={
              handleImportRapportVT
            }
          />
        )}

        {qualificationVisite && (
          <Modal
            open={true}
            onClose={() => { setQualificationVisite(null); setQualificationProduitId('') }}
            title="Qualifier la visite technique"
            footer={
              <>
                <Button variant="ghost" onClick={() => { setQualificationVisite(null); setQualificationProduitId('') }}>
                  Annuler
                </Button>
                <Button variant="primary" onClick={qualifyVisite} disabled={!qualificationProduitId || qualificationSaving}>
                  {qualificationSaving ? 'Enregistrement…' : 'Qualifier et générer la commission'}
                </Button>
              </>
            }
          >
            <p className="text-muted">
              Choisissez le type de VT. Le barème actif correspondant au produit et au commercial sera appliqué automatiquement.
            </p>
            <div className="mt-4">
              <FloatSelect
                label="Type de VT / Produit"
                value={qualificationProduitId}
                onChange={setQualificationProduitId}
                options={[
                  { value: '', label: 'Sélectionner le type de VT' },
                  ...catalogueProduits.filter((p: any) => p.actif !== false).map((p: any) => ({ value: p.id, label: p.nom })),
                ]}
              />
            </div>
          </Modal>
        )}
      </div>
    )
  }

  // ===== WIZARD VIEW =====

  if (
    view === 'wizard' &&
    currentVisite
  ) {
    const prospect =
      currentVisite.prospect as any

    return (
      <VisiteTechniqueWizard
        prospect={prospect}
        currentSection={currentSection}
        currentEtape={currentEtape}
        completedSections={
          completedSections
        }
        auditData={auditData}
        onSelectSection={sid => {
          setCurrentSection(sid)
          setCurrentEtape(0)
        }}
        activeSections={activeSections}
        onBack={() => setView('list')}
        tutorialText={
          produitCibleInfo
            ? `Visite ciblée : ${produitCibleInfo.label} — seules les sections nécessaires à ce geste sont demandées`
            : 'Renseignez chaque section pour calculer le DPE 3CL'
        }
        syncBadge={
          !isOnline ||
          syncStatus === 'offline' ? (
            <div
              className="badge badge-error"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <WifiOff size={13} />
              Hors-ligne — sauvegardé sur
              l'appareil
            </div>
          ) : syncStatus ===
            'pending' ? (
            <div
              className="badge badge-warning"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={13} />
              En attente de
              synchronisation
            </div>
          ) : syncStatus ===
            'syncing' ? (
            <div
              className="badge badge-neutral"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={13} />
              Synchronisation…
            </div>
          ) : (
            <div
              className="badge badge-success"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckCircle2 size={13} />
              Synchronisé
            </div>
          )
        }
      >
        {currentSection === 1 && (
          <Section01Identification
            data={auditData.identification}
            prospect={prospect}
            onChange={d =>
              saveSection(
                'identification',
                d,
              )
            }
            currentEtape={
              currentEtape
            }
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}

        {currentSection === 2 && (
          <Section02DonneesBatiment
            data={
              auditData.donnees_batiment
            }
            onChange={d =>
              saveSection(
                'donnees_batiment',
                d,
              )
            }
            currentEtape={
              currentEtape
            }
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}

        {currentSection === 3 && (
          <Section03Murs
            murs={auditData.murs}
            onChange={saveMurs}
            currentEtape={
              currentEtape
            }
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}

        {currentSection === 4 && (
          <Section04Menuiseries
            menuiseries={
              auditData.menuiseries
            }
            murs={auditData.murs}
            onChange={
              saveMenuiseries
            }
            currentEtape={
              currentEtape
            }
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}

        {currentSection === 5 && (
          <div>
            <div className="audit-section-title">
              Section 5 — Planchers
            </div>

            <Section05Planchers
              planchers={
                auditData.planchers ||
                []
              }
              onChange={p =>
                saveSection(
                  'planchers',
                  p,
                )
              }
            />

            <div
              className="wall-nav-row"
              style={{
                marginTop: 32,
              }}
            >
              <button
                className="btn-wall-nav btn-wall-prev"
                onClick={handlePrev}
              >
                Précédent
              </button>

              <button
                className="btn-wall-nav btn-wall-next"
                onClick={handleNext}
              >
                Continuer vers
                Plafonds
              </button>
            </div>
          </div>
        )}

        {currentSection === 6 && (
          <div>
            <div className="audit-section-title">
              Section 6 — Plafonds
            </div>

            <Section06Plafonds
              plafonds={
                auditData.plafonds ||
                []
              }
              onChange={p =>
                saveSection(
                  'plafonds',
                  p,
                )
              }
            />

            <div
              className="wall-nav-row"
              style={{
                marginTop: 32,
              }}
            >
              <button
                className="btn-wall-nav btn-wall-prev"
                onClick={handlePrev}
              >
                Précédent
              </button>

              <button
                className="btn-wall-nav btn-wall-next"
                onClick={handleNext}
              >
                Continuer vers
                Ventilation
              </button>
            </div>
          </div>
        )}

        {currentSection === 7 && (
          <div>
            <div className="audit-section-title">
              Section 7 — Ventilation
            </div>

            <Section07Ventilation
              data={
                auditData.ventilation || {
                  type: '',
                  presence_vmc: 'non',
                  age_installation:
                    null,
                  notes: '',
                }
              }
              onChange={d =>
                saveSection(
                  'ventilation',
                  d,
                )
              }
            />

            <div
              className="wall-nav-row"
              style={{
                marginTop: 32,
              }}
            >
              <button
                className="btn-wall-nav btn-wall-prev"
                onClick={handlePrev}
              >
                Précédent
              </button>

              <button
                className="btn-wall-nav btn-wall-next"
                onClick={handleNext}
              >
                Continuer vers
                Chauffage
              </button>
            </div>
          </div>
        )}

        {currentSection === 8 && (
          <div>
            <div className="audit-section-title">
              Section 8 — Chauffage
            </div>

            <Section08Chauffage
              data={
                auditData.chauffage || {
                  systeme_principal:
                    '',
                  energie: '',
                  puissance_kw:
                    null,
                  annee_installation:
                    null,
                  systeme_secondaire:
                    '',
                  notes: '',
                }
              }
              onChange={d =>
                saveSection(
                  'chauffage',
                  d,
                )
              }
            />

            <div
              className="wall-nav-row"
              style={{
                marginTop: 32,
              }}
            >
              <button
                className="btn-wall-nav btn-wall-prev"
                onClick={handlePrev}
              >
                Précédent
              </button>

              <button
                className="btn-wall-nav btn-wall-next"
                onClick={handleNext}
              >
                Continuer vers ECS
              </button>
            </div>
          </div>
        )}

        {currentSection === 9 && (
          <div>
            <div className="audit-section-title">
              Section 9 — Eau chaude
              sanitaire
            </div>

            <Section09ECS
              data={
                auditData.ecs || {
                  systeme: '',
                  energie: '',
                  capacite_l: null,
                  annee_installation:
                    null,
                  notes: '',
                }
              }
              onChange={d =>
                saveSection(
                  'ecs',
                  d,
                )
              }
            />

            <div
              className="wall-nav-row"
              style={{
                marginTop: 32,
              }}
            >
              <button
                className="btn-wall-nav btn-wall-prev"
                onClick={handlePrev}
              >
                Précédent
              </button>

              <button
                className="btn-wall-nav btn-wall-next"
                onClick={handleNext}
              >
                {activeSections[
                  activeSections.length - 1
                ] === 9
                  ? "Terminer l'audit"
                  : activeSections.includes(10) ? 'Continuer vers Photovoltaïque' : 'Continuer vers le relevé de pose'}
              </button>
            </div>
          </div>
        )}

        {currentSection === 10 && (
          <div>
            <div className="audit-section-title">
              Section 10 — Photovoltaïque
            </div>

            <Section10Photovoltaique
              data={
                auditData.photovoltaique || {
                  interet_client: '',
                  type_toiture: '',
                  orientation_toiture:
                    '',
                  inclinaison_deg:
                    null,
                  surface_disponible_m2:
                    null,
                  masques_solaires:
                    '',
                  type_raccordement:
                    '',
                  usage_souhaite:
                    '',
                  puissance_souhaitee_kwc:
                    null,
                  consommation_annuelle_kwh:
                    null,
                  notes: '',
                  photos: [],
                }
              }
              onChange={d =>
                saveSection(
                  'photovoltaique',
                  d,
                )
              }
            />

            <div
              className="wall-nav-row"
              style={{
                marginTop: 32,
              }}
            >
              <button
                className="btn-wall-nav btn-wall-prev"
                onClick={handlePrev}
              >
                Précédent
              </button>

              <button
                className="btn-wall-nav btn-wall-next"
                onClick={handleNext}
              >
                {activeSections[activeSections.length - 1] === 10 ? "Terminer l'audit" : 'Continuer vers le relevé de pose'}
              </button>
            </div>
          </div>
        )}

        {currentSection === 11 && (
          <div>
            <div className="audit-section-title">
              Section 11 — Relevé de pose
            </div>

            <Section11RelevePose
              data={auditData.releve_pose || { produits: [], releves: {} }}
              produitsVisite={produitsDeLaVisite(currentVisite?.produit_cible, currentVisite?.audit_data?.produits_cibles)}
              onChange={d => saveSection('releve_pose', d)}
            />

            <div className="wall-nav-row" style={{ marginTop: 32 }}>
              <button className="btn-wall-nav btn-wall-prev" onClick={handlePrev}>Précédent</button>
              <button className="btn-wall-nav btn-wall-next" onClick={handleNext}>Terminer la visite</button>
            </div>
          </div>
        )}
      </VisiteTechniqueWizard>
    )
  }

  // ===== OVERVIEW VIEW =====

  return (
    <div
      className="app-content"
      style={{ flex: 1 }}
    >
      <div className="topbar">
        <button
          className="btn btn-ghost"
          onClick={() =>
            setView('wizard')
          }
        >
          <ArrowLeft size={18} />
          Retour à l'audit
        </button>

        <div className="topbar-spacer" />

        <button
          className="btn btn-primary"
          onClick={async () => {
            if (!currentVisite) return

            // 1) Valider la VT.
            const { data, error } = await supabase
              .from('visites')
              .update({ statut: 'terminee' })
              .eq('id', currentVisite.id)
              .select('*, prospect:prospects(*)')
              .single()

            if (error) {
              alert(`Impossible de valider la visite : ${error.message}`)
              return
            }

            // La qualification administrative génère la commission à partir du barème.

            setCurrentVisite(data as Visite)
            await fetchVisites()
            setView('list')
          }}
        >
          Valider la VT
        </button>
      </div>

      <div className="page-scroll">
        <div className="page">
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">
                {produitCibleInfo
                  ? `Résultats — ${produitCibleInfo.label}`
                  : 'Résultats de l’audit'}
              </div>

              <div className="page-subtitle">
                {
                  (
                    currentVisite?.prospect as any
                  )?.prenom
                }{' '}
                {
                  (
                    currentVisite?.prospect as any
                  )?.nom
                }
              </div>
            </div>
          </div>

          <ResultatsAudit
            dpe={dpeResult}
            deperditions={deperditionsResult}
            travaux={travauxResult}
            bouquets={bouquetsResult}
            simulationPV={simulationPV}
            financementParGeste={financementParGeste}
            financementBouquet={financementBouquet}
            dispositifsAides={dispositifsAides}
            alertes={alertesCoherence}
            surface={batiment3CL.surfaceHabitable}
            zoneClimatique={batiment3CL.zoneClimatique}
            produitLabel={produitCibleInfo?.label}
            admin={admin}
            prixCataloguePV={prixCataloguePV}
            selectedTravaux={selectedTravaux}
            onToggleTravaux={toggleTravaux}
            onSelectionnerBouquet={selectionnerBouquet}
            onCalculer={calculerLeDpe}
            onTelecharger={telechargerRapport}
            onEnregistrer={enregistrerSimulation}
            savingSimulation={savingSimulation}
            simulationSaved={simulationSaved}
            onCreerDevis={creerDevis}
            creatingDevis={creatingDevis}
            onCreerDevisPV={creerDevisPourPV}
            creatingDevisPV={creatingDevisPV}
          />
        </div>
      </div>
    </div>
  )
}