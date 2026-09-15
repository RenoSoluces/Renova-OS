import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ArrowLeft,
  Plus,
  ClipboardCheck,
  Zap,
  Wrench,
  TrendingDown,
  FileSignature,
  FileDown,
  Upload,
  Sun,
  AlertTriangle,
  WifiOff,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
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
import { Modal } from '../components/ui/Modal'
import { FloatInput, FloatSelect } from '../components/ui/FloatInput'
import {
  construireBatiment3CL,
  calculDPE,
  proposerTravaux,
  dpeColor,
  calculDeperditions,
  proposerBouquets,
} from '../lib/3cl'
import {
  PRODUITS_VISITE,
  produitVisiteById,
  sectionsPourVisite,
} from '../lib/3cl/produitsVisite'
import { DpeBig, DpeScale } from '../components/shared/DpeVisualizer'
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
  const [view, setView] = useState<'list' | 'wizard' | 'overview'>('list')
  const [visites, setVisites] = useState<Visite[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [currentVisite, setCurrentVisite] = useState<Visite | null>(null)
  const [currentSection, setCurrentSection] = useState(1)
  const [currentEtape, setCurrentEtape] = useState(0)

  const [showNewModal, setShowNewModal] = useState(false)
  const [showImportVT, setShowImportVT] = useState(false)

  const [newProspectId, setNewProspectId] = useState('')
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [newTypeVisite, setNewTypeVisite] = useState<
    'complete' | 'produit'
  >('complete')
  const [newProduitCible, setNewProduitCible] = useState('')
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
    supabase
      .from('entreprises')
      .select('*')
      .limit(1)
      .maybeSingle()
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

    supabase
      .from('catalogue_produits')
      .select('*')
      .eq('actif', true)
      .then(({ data }) => {
        setCatalogueProduits((data || []) as Produit[])
      })
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

  const activeSections = useMemo(
    () =>
      sectionsPourVisite(
        currentVisite?.type_visite,
        currentVisite?.produit_cible,
      ),
    [
      currentVisite?.type_visite,
      currentVisite?.produit_cible,
    ],
  )

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
    const pv = auditData.photovoltaique

    if (
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

  const calculerLeDpe = useCallback(() => {
    const resultat = calculDPE(batiment3CL)
    const deperditionsResultat =
      calculDeperditions(batiment3CL)

    let travaux = proposerTravaux(batiment3CL)

    if (
      currentVisite?.type_visite === 'produit' &&
      currentVisite.produit_cible
    ) {
      travaux = travaux.filter(
        t => t.id === currentVisite.produit_cible,
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

      setCurrentSection(
        sectionsPourVisite(
          visite.type_visite,
          visite.produit_cible,
        )[0] || 1,
      )

      setCurrentEtape(0)
      setDpeResult(null)
      setDeperditionsResult(null)
      setTravauxResult(null)
      setBouquetsResult(null)
      setView('wizard')
    },
    [],
  )

  const createVisite = useCallback(async () => {
    if (!newProspectId) {
      setCreateError(
        'Sélectionnez un prospect avant de continuer.',
      )
      return
    }

    if (
      newTypeVisite === 'produit' &&
      !newProduitCible
    ) {
      setCreateError(
        'Sélectionnez le produit à auditer.',
      )
      return
    }

    setCreateError(null)

    const payload = {
      prospect_id: newProspectId,
      date_visite: newDate,
      statut: 'en_cours',
      audit_data: {},
      type_visite: newTypeVisite,
      produit_cible:
        newTypeVisite === 'produit'
          ? newProduitCible
          : null,
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
    setNewTypeVisite('complete')
    setNewProduitCible('')
    setCreateError(null)

    startVisite(data as any)
    fetchVisites()
  }, [
    newProspectId,
    newDate,
    newTypeVisite,
    newProduitCible,
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

      const payload = {
        prospect_id: newProspectId,
        date_visite: newDate,
        statut: 'en_cours',
        audit_data: importedAuditData,
        type_visite: 'complete' as const,
        produit_cible: null,
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
      setNewTypeVisite('complete')
      setNewProduitCible('')
      setCreateError(null)

      startVisite(data as Visite)

      await fetchVisites()
    },
    [
      newProspectId,
      newDate,
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
      setNewTypeVisite('complete')
      setNewProduitCible('')
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

              <button
                className="btn btn-secondary"
                onClick={() =>
                  setShowImportVT(true)
                }
                disabled={!newProspectId}
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
                disabled={
                  !newProspectId ||
                  (newTypeVisite ===
                    'produit' &&
                    !newProduitCible)
                }
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

            <div>
              <div
                className="section-label"
                style={{
                  marginBottom: 8,
                }}
              >
                Type de visite
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  className={`btn ${
                    newTypeVisite ===
                    'complete'
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                  style={{ flex: 1 }}
                  onClick={() =>
                    setNewTypeVisite(
                      'complete',
                    )
                  }
                >
                  Audit complet
                  (10 sections)
                </button>

                <button
                  type="button"
                  className={`btn ${
                    newTypeVisite ===
                    'produit'
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                  style={{ flex: 1 }}
                  onClick={() =>
                    setNewTypeVisite(
                      'produit',
                    )
                  }
                >
                  Produit spécifique
                </button>
              </div>
            </div>

            {newTypeVisite ===
              'produit' && (
              <FloatSelect
                label="Produit visité"
                value={newProduitCible}
                onChange={
                  setNewProduitCible
                }
                options={PRODUITS_VISITE.map(
                  p => ({
                    value: p.id,
                    label: p.label,
                  }),
                )}
              />
            )}

            {newTypeVisite ===
              'produit' &&
              newProduitCible && (
                <p className="text-sm text-muted">
                  {
                    produitVisiteById(
                      newProduitCible,
                    )?.description
                  }
                </p>
              )}

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
            onClose={() =>
              setShowImportVT(false)
            }
            onImport={
              handleImportRapportVT
            }
          />
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
                  : 'Continuer vers Photovoltaïque'}
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
                Terminer l'audit
              </button>
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
          onClick={() =>
            setView('list')
          }
        >
          Terminer
        </button>
      </div>

      <div className="page-scroll">
        <div className="page">
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">
                {produitCibleInfo
                  ? `Vue d'ensemble — ${produitCibleInfo.label}`
                  : "Vue d'ensemble — Audit"}
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

          <div className="card card-pad">
            <div className="section-label">
              {produitCibleInfo
                ? 'Visite ciblée terminée'
                : 'Audit terminé'}
            </div>

            <p className="text-muted">
              {produitCibleInfo
                ? `Les données nécessaires à l'évaluation "${produitCibleInfo.label}" sont renseignées. Générez l'estimation pour ce geste.`
                : "L'audit technique est complet. Vous pouvez maintenant générer une simulation 3CL à partir de ces données."}
            </p>

            {alertesCoherence.length >
              0 && (
              <div
                className="card"
                style={{
                  marginTop: 16,
                  background: '#FFF7ED',
                  border:
                    '1px solid #FDBA74',
                }}
              >
                <div className="card-pad">
                  <div
                    className="section-label"
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle
                      size={16}
                    />

                    Points à vérifier
                    avant de terminer (
                    {
                      alertesCoherence.length
                    }
                    )
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {alertesCoherence.map(
                      (a, i) => (
                        <div
                          key={i}
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'flex-start',
                            gap: 8,
                            fontSize: 13,
                          }}
                        >
                          <span
                            className={`badge ${
                              a.niveau ===
                              'erreur'
                                ? 'badge-error'
                                : 'badge-warning'
                            }`}
                            style={{
                              flexShrink: 0,
                            }}
                          >
                            {a.section}
                          </span>

                          <span className="text-muted">
                            {a.message}
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  <p
                    className="text-xs text-muted mt-4"
                    style={{
                      marginBottom: 0,
                    }}
                  >
                    Ces alertes
                    n'empêchent pas
                    de continuer —
                    elles signalent
                    des données
                    manquantes ou
                    inhabituelles qui
                    pourraient rendre
                    la simulation moins
                    fiable.
                  </p>
                </div>
              </div>
            )}

            {!dpeResult && (
              <button
                className="btn btn-primary mt-6"
                onClick={calculerLeDpe}
              >
                <Zap size={18} />
                Générer le DPE
              </button>
            )}

            {dpeResult && (
              <div
                className="mt-6"
                style={{
                  display: 'flex',
                  flexDirection:
                    'column',
                  gap: 24,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    gap: 32,
                    flexWrap: 'wrap',
                  }}
                >
                  <DpeBig
                    letter={
                      dpeResult.etiquette
                    }
                  />

                  <div
                    style={{
                      flex: 1,
                      minWidth: 260,
                    }}
                  >
                    <div className="text-sm text-muted">
                      Consommation
                      énergie primaire
                    </div>

                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                      }}
                    >
                      {
                        dpeResult.consommationEP
                      }{' '}
                      kWhEP/m²·an
                    </div>

                    <div className="text-sm text-muted mt-2">
                      Émissions de gaz à
                      effet de serre
                    </div>

                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                      }}
                    >
                      {
                        dpeResult.emissionsCO2
                      }{' '}
                      kgCO₂/m²·an
                    </div>

                    <div className="text-sm text-muted mt-4">
                      Étiquette énergie :{' '}
                      <strong>
                        {
                          dpeResult.etiquetteEnergie
                        }
                      </strong>
                      {' · '}
                      Étiquette climat :{' '}
                      <strong>
                        {
                          dpeResult.etiquetteGES
                        }
                      </strong>{' '}
                      (l'étiquette finale
                      retient la moins bonne
                      des deux, méthode du
                      double seuil)
                    </div>
                  </div>
                </div>

                <DpeScale
                  activeLetter={
                    dpeResult.etiquette
                  }
                />

                <div
                  className="card card-pad"
                  style={{
                    background:
                      'var(--neutral-50)',
                  }}
                >
                  <div className="section-label">
                    Détail par poste
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 32,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div className="text-sm text-muted">
                        Chauffage
                      </div>

                      <div className="font-semibold">
                        {
                          dpeResult
                            .chauffage
                            .consommationEP
                        }{' '}
                        kWhEP/an ·{' '}
                        {
                          dpeResult
                            .chauffage
                            .emissionsCO2
                        }{' '}
                        kgCO₂/an
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted">
                        Eau chaude sanitaire
                      </div>

                      <div className="font-semibold">
                        {
                          dpeResult.ecs
                            .consommationEP
                        }{' '}
                        kWhEP/an ·{' '}
                        {
                          dpeResult.ecs
                            .emissionsCO2
                        }{' '}
                        kgCO₂/an
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted">
                  Zone climatique retenue :{' '}
                  <strong>
                    {
                      batiment3CL.zoneClimatique
                    }
                  </strong>{' '}
                  (déduite du code postal).
                  Ce calcul s'appuie sur
                  la méthode 3CL-DPE mensuelle ;
                  certaines données climatiques
                  mensuelles précises restent
                  approximées (voir la
                  documentation du moteur).
                </p>

                {simulationPV && (
                  <div
                    className="card card-pad"
                    style={{
                      background: '#FFF8E6',
                      border:
                        '1px solid #F5D98A',
                    }}
                  >
                    <div
                      className="section-label"
                      style={{
                        display: 'flex',
                        alignItems:
                          'center',
                        gap: 8,
                      }}
                    >
                      <Sun size={16} />
                      Photovoltaïque —
                      estimation
                    </div>

                    <p className="text-sm text-muted mb-4">
                      Estimation commerciale
                      basée sur l'orientation,
                      l'inclinaison et les masques
                      relevés en visite. Ne
                      remplace pas une étude
                      technique détaillée (bureau
                      d'études / PVGIS).
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        gap: 32,
                        flexWrap: 'wrap',
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div className="text-sm text-muted">
                          Puissance retenue
                        </div>

                        <div className="font-semibold">
                          {
                            simulationPV.puissanceInstallee
                          }{' '}
                          kWc
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted">
                          Surface nécessaire
                        </div>

                        <div className="font-semibold">
                          {
                            simulationPV.surfaceNecessaire
                          }{' '}
                          m²
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted">
                          Production estimée
                        </div>

                        <div className="font-semibold">
                          {simulationPV.productionAnnuelle.toLocaleString(
                            'fr-FR',
                          )}{' '}
                          kWh/an
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted">
                          Taux
                          d'autoconsommation
                        </div>

                        <div className="font-semibold">
                          {Math.round(
                            simulationPV.tauxAutoconsommation *
                              100,
                          )}
                          %
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 32,
                        flexWrap: 'wrap',
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div className="text-sm text-muted">
                          Économie sur facture
                        </div>

                        <div
                          className="font-semibold"
                          style={{
                            color:
                              'var(--success-600, #16a34a)',
                          }}
                        >
                          +
                          {simulationPV.economieAutoconsommation.toLocaleString(
                            'fr-FR',
                          )}{' '}
                          €/an
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted">
                          Revenu revente surplus
                        </div>

                        <div
                          className="font-semibold"
                          style={{
                            color:
                              'var(--success-600, #16a34a)',
                          }}
                        >
                          +
                          {simulationPV.revenuRevente.toLocaleString(
                            'fr-FR',
                          )}{' '}
                          €/an
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted">
                          Investissement estimé
                        </div>

                        <div className="font-semibold">
                          {simulationPV.investissementEstime.toLocaleString(
                            'fr-FR',
                          )}{' '}
                          € TTC
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted">
                          Prime autoconsommation
                        </div>

                        <div className="font-semibold">
                          -
                          {simulationPV.primeAutoconsommation.toLocaleString(
                            'fr-FR',
                          )}{' '}
                          €
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted">
                          Retour sur investissement
                        </div>

                        <div className="font-semibold">
                          {simulationPV.dureeAmortissementAnnees
                            ? `${simulationPV.dureeAmortissementAnnees} ans`
                            : '—'}
                        </div>
                      </div>
                    </div>

                    {simulationPV.alerteSurfaceInsuffisante && (
                      <div
                        className="badge badge-error"
                        style={{
                          marginRight: 8,
                        }}
                      >
                        Surface de toiture
                        disponible probablement
                        insuffisante pour cette
                        puissance
                      </div>
                    )}

                    {simulationPV.alerteMasquesImportants && (
                      <div className="badge badge-error">
                        Masques solaires
                        importants — la
                        production réelle
                        pourrait être
                        significativement
                        inférieure
                      </div>
                    )}

                    <div className="text-xs text-muted mt-4">
                      Coût retenu :{' '}
                      {simulationPV.coutParKwcUtilise.toLocaleString(
                        'fr-FR',
                      )}{' '}
                      €/kWc
                      {prixCataloguePV
                        ? ' (produit catalogue)'
                        : ' (tarif par défaut — configurez le catalogue ou les Paramètres pour un chiffrage plus précis)'}
                      .
                    </div>

                    <button
                      className="btn btn-primary mt-4"
                      onClick={
                        creerDevisPourPV
                      }
                      disabled={
                        creatingDevisPV
                      }
                    >
                      {creatingDevisPV
                        ? 'Création du devis…'
                        : 'Créer un devis à partir de cette simulation'}
                    </button>
                  </div>
                )}

                {bouquetsResult &&
                  bouquetsResult.length >
                    0 && (
                    <div>
                      <div
                        className="section-label"
                        style={{
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 8,
                        }}
                      >
                        <Wrench size={16} />
                        Bouquets de travaux
                        recommandés
                      </div>

                      <p className="text-sm text-muted mb-4">
                        Combinaisons de
                        plusieurs gestes simulées
                        ensemble sur le logement
                        audité — utile pour
                        présenter au client une
                        rénovation cohérente
                        plutôt qu'un geste isolé.
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection:
                            'column',
                          gap: 12,
                        }}
                      >
                        {bouquetsResult.map(
                          b => (
                            <div
                              key={b.id}
                              className="recap-card"
                              style={{
                                display: 'flex',
                                alignItems:
                                  'center',
                                gap: 20,
                                flexWrap:
                                  'wrap',
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  minWidth: 220,
                                }}
                              >
                                <div className="font-semibold">
                                  {b.titre}
                                </div>

                                <div className="text-sm text-muted mb-2">
                                  {b.description}
                                </div>

                                <div
                                  style={{
                                    display:
                                      'flex',
                                    gap: 6,
                                    flexWrap:
                                      'wrap',
                                  }}
                                >
                                  {b.gestesLabels.map(
                                    l => (
                                      <span
                                        key={l}
                                        className="badge badge-neutral"
                                      >
                                        {l}
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>

                              <div
                                style={{
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  gap: 10,
                                }}
                              >
                                <span
                                  style={{
                                    display:
                                      'inline-flex',
                                    alignItems:
                                      'center',
                                    justifyContent:
                                      'center',
                                    width: 28,
                                    height: 28,
                                    borderRadius:
                                      6,
                                    fontWeight:
                                      700,
                                    fontSize:
                                      13,
                                    color:
                                      b.etiquetteAvant >=
                                      'E'
                                        ? 'white'
                                        : 'var(--neutral-800)',
                                    background:
                                      dpeColor(
                                        b.etiquetteAvant,
                                      ),
                                  }}
                                >
                                  {
                                    b.etiquetteAvant
                                  }
                                </span>

                                <span className="text-muted">
                                  →
                                </span>

                                <span
                                  style={{
                                    display:
                                      'inline-flex',
                                    alignItems:
                                      'center',
                                    justifyContent:
                                      'center',
                                    width: 28,
                                    height: 28,
                                    borderRadius:
                                      6,
                                    fontWeight:
                                      700,
                                    fontSize:
                                      13,
                                    color:
                                      b.etiquetteApres >=
                                      'E'
                                        ? 'white'
                                        : 'var(--neutral-800)',
                                    background:
                                      dpeColor(
                                        b.etiquetteApres,
                                      ),
                                  }}
                                >
                                  {
                                    b.etiquetteApres
                                  }
                                </span>

                                {b.sautsEtiquette >
                                  0 && (
                                  <span className="badge badge-success">
                                    {
                                      b.sautsEtiquette
                                    }{' '}
                                    classe
                                    {b.sautsEtiquette >
                                    1
                                      ? 's'
                                      : ''}{' '}
                                    gagnée
                                    {b.sautsEtiquette >
                                    1
                                      ? 's'
                                      : ''}
                                  </span>
                                )}
                              </div>

                              <div
                                style={{
                                  minWidth: 140,
                                  textAlign:
                                    'right',
                                }}
                              >
                                <div
                                  style={{
                                    display:
                                      'flex',
                                    alignItems:
                                      'center',
                                    gap: 4,
                                    justifyContent:
                                      'flex-end',
                                    color:
                                      'var(--success-600, #16a34a)',
                                    fontWeight:
                                      600,
                                  }}
                                >
                                  <TrendingDown
                                    size={16}
                                  />
                                  -
                                  {
                                    b.gainPourcentage
                                  }
                                  %
                                </div>

                                <div className="text-sm text-muted">
                                  -{b.gainCEP}{' '}
                                  kWhEP/an ·
                                  -{b.gainGES}{' '}
                                  kgCO₂/an
                                </div>
                              </div>

                              {(() => {
                                const f =
                                  financementBouquet(
                                    b.gestes,
                                  )

                                if (!f)
                                  return null

                                return (
                                  <div
                                    style={{
                                      minWidth: 160,
                                      textAlign:
                                        'right',
                                    }}
                                  >
                                    <div className="text-sm text-muted">
                                      Travaux estimés :{' '}
                                      {f.montantTravauxHT.toLocaleString(
                                        'fr-FR',
                                      )}{' '}
                                      € HT
                                    </div>

                                    <div className="text-sm text-muted">
                                      Aides estimées : -
                                      {f.totalAides.toLocaleString(
                                        'fr-FR',
                                      )}{' '}
                                      €
                                    </div>

                                    <div className="font-semibold">
                                      Reste à charge :{' '}
                                      {f.resteACharge.toLocaleString(
                                        'fr-FR',
                                      )}{' '}
                                      €
                                    </div>

                                    {(!f.profilConnu ||
                                      f.sourceIndicative) && (
                                      <div className="text-xs text-muted">
                                        estimation{' '}
                                        {f.sourceIndicative
                                          ? 'indicative'
                                          : ''}
                                        {!f.profilConnu
                                          ? ' · profil foyer inconnu'
                                          : ''}
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}

                              <button
                                className="btn btn-secondary"
                                onClick={() =>
                                  selectionnerBouquet(
                                    b.gestes,
                                  )
                                }
                              >
                                Sélectionner ce
                                bouquet
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {travauxResult &&
                  travauxResult.length >
                    0 && (
                    <div>
                      <div
                        className="section-label"
                        style={{
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 8,
                        }}
                      >
                        <Wrench size={16} />
                        Recommandations de
                        travaux
                      </div>

                      <p className="text-sm text-muted mb-4">
                        Classées par impact sur la
                        consommation, calculées en
                        simulant chaque geste isolément
                        sur le logement tel qu'audité.
                        Cochez les postes à intégrer
                        au devis.
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection:
                            'column',
                          gap: 12,
                        }}
                      >
                        {travauxResult.map(
                          t => (
                            <label
                              key={t.id}
                              className="recap-card"
                              style={{
                                display: 'flex',
                                alignItems:
                                  'center',
                                gap: 20,
                                flexWrap:
                                  'wrap',
                                cursor:
                                  'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedTravaux.includes(
                                  t.id,
                                )}
                                onChange={() =>
                                  toggleTravaux(
                                    t.id,
                                  )
                                }
                                style={{
                                  width: 18,
                                  height: 18,
                                  flexShrink:
                                    0,
                                }}
                              />

                              <div
                                style={{
                                  flex: 1,
                                  minWidth: 220,
                                }}
                              >
                                <div className="font-semibold">
                                  {t.titre}
                                </div>

                                <div className="text-sm text-muted">
                                  {t.description}
                                </div>
                              </div>

                              <div
                                style={{
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  gap: 10,
                                }}
                              >
                                <span
                                  style={{
                                    display:
                                      'inline-flex',
                                    alignItems:
                                      'center',
                                    justifyContent:
                                      'center',
                                    width: 28,
                                    height: 28,
                                    borderRadius:
                                      6,
                                    fontWeight:
                                      700,
                                    fontSize:
                                      13,
                                    color:
                                      t.etiquetteAvant >=
                                      'E'
                                        ? 'white'
                                        : 'var(--neutral-800)',
                                    background:
                                      dpeColor(
                                        t.etiquetteAvant,
                                      ),
                                  }}
                                >
                                  {
                                    t.etiquetteAvant
                                  }
                                </span>

                                <span className="text-muted">
                                  →
                                </span>

                                <span
                                  style={{
                                    display:
                                      'inline-flex',
                                    alignItems:
                                      'center',
                                    justifyContent:
                                      'center',
                                    width: 28,
                                    height: 28,
                                    borderRadius:
                                      6,
                                    fontWeight:
                                      700,
                                    fontSize:
                                      13,
                                    color:
                                      t.etiquetteApres >=
                                      'E'
                                        ? 'white'
                                        : 'var(--neutral-800)',
                                    background:
                                      dpeColor(
                                        t.etiquetteApres,
                                      ),
                                  }}
                                >
                                  {
                                    t.etiquetteApres
                                  }
                                </span>
                              </div>

                              <div
                                style={{
                                  minWidth: 140,
                                  textAlign:
                                    'right',
                                }}
                              >
                                <div
                                  style={{
                                    display:
                                      'flex',
                                    alignItems:
                                      'center',
                                    gap: 4,
                                    justifyContent:
                                      'flex-end',
                                    color:
                                      'var(--success-600, #16a34a)',
                                    fontWeight:
                                      600,
                                  }}
                                >
                                  <TrendingDown
                                    size={16}
                                  />
                                  -{
                                    t.gainPourcentage
                                  }%
                                </div>

                                <div className="text-sm text-muted">
                                  -{t.gainCEP}{' '}
                                  kWhEP/an ·
                                  -{t.gainGES}{' '}
                                  kgCO₂/an
                                </div>
                              </div>

                              {financementParGeste[
                                t.id
                              ] && (
                                <div
                                  style={{
                                    minWidth: 160,
                                    textAlign:
                                      'right',
                                  }}
                                >
                                  <div className="text-sm text-muted">
                                    Travaux estimés :{' '}
                                    {financementParGeste[
                                      t.id
                                    ].montantTravauxHT.toLocaleString(
                                      'fr-FR',
                                    )}{' '}
                                    € HT
                                  </div>

                                  <div className="text-sm text-muted">
                                    Aides estimées : -
                                    {financementParGeste[
                                      t.id
                                    ].totalAides.toLocaleString(
                                      'fr-FR',
                                    )}{' '}
                                    €
                                  </div>

                                  <div className="font-semibold">
                                    Reste à charge :{' '}
                                    {financementParGeste[
                                      t.id
                                    ].resteACharge.toLocaleString(
                                      'fr-FR',
                                    )}{' '}
                                    €
                                  </div>

                                  {financementParGeste[
                                    t.id
                                  ].avertissement && (
                                    <div
                                      className="text-xs text-muted"
                                      style={{
                                        maxWidth: 180,
                                      }}
                                    >
                                      {
                                        financementParGeste[
                                          t.id
                                        ].avertissement
                                      }
                                    </div>
                                  )}
                                </div>
                              )}
                            </label>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {travauxResult &&
                  travauxResult.length >
                    0 &&
                  dispositifsAides.length >
                    0 && (
                    <div
                      className="card card-pad"
                      style={{
                        background:
                          'var(--neutral-50)',
                      }}
                    >
                      <div className="section-label">
                        Dispositifs d'aides
                        mobilisables
                      </div>

                      <p className="text-sm text-muted mb-4">
                        Fiches CEE et
                        MaPrimeRénov' actuellement
                        en vigueur pour ce type de
                        travaux (catalogue interne —
                        à vérifier au cas par cas
                        selon le profil du
                        bénéficiaire).
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection:
                            'column',
                          gap: 8,
                        }}
                      >
                        {dispositifsAides.map(
                          d => (
                            <div
                              key={d.id}
                              style={{
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                gap: 12,
                                flexWrap:
                                  'wrap',
                              }}
                            >
                              <span
                                className={`badge ${
                                  d.dispositif ===
                                  'cee'
                                    ? 'badge-info'
                                    : 'badge-success'
                                }`}
                              >
                                {d.dispositif ===
                                'cee'
                                  ? 'CEE'
                                  : "MaPrimeRénov'"}
                              </span>

                              <span className="font-semibold">
                                {d.code}
                              </span>

                              <span className="text-sm text-muted">
                                {d.libelle}
                              </span>

                              <span
                                className="badge badge-neutral"
                                style={{
                                  marginLeft:
                                    'auto',
                                }}
                              >
                                {d.public_cible ===
                                'professionnel'
                                  ? 'Professionnel'
                                  : d.public_cible ===
                                      'tous'
                                    ? 'Particulier & pro'
                                    : 'Particulier'}
                                {' · '}
                                {d.secteur ===
                                'tertiaire'
                                  ? 'Tertiaire'
                                  : 'Résidentiel'}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                <div
                  className="flex gap-3"
                  style={{
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    className="btn btn-secondary"
                    onClick={
                      calculerLeDpe
                    }
                  >
                    Recalculer
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={
                      telechargerRapport
                    }
                  >
                    <FileDown size={16} />
                    Télécharger le rapport
                    PDF
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={
                      enregistrerSimulation
                    }
                    disabled={
                      savingSimulation ||
                      simulationSaved
                    }
                  >
                    {simulationSaved
                      ? 'Simulation enregistrée ✓'
                      : savingSimulation
                        ? 'Enregistrement…'
                        : 'Enregistrer comme simulation'}
                  </button>

                  {travauxResult &&
                    travauxResult.length >
                      0 && (
                      <button
                        className="btn btn-primary"
                        onClick={creerDevis}
                        disabled={
                          creatingDevis ||
                          selectedTravaux.length ===
                            0
                        }
                      >
                        <FileSignature
                          size={16}
                        />

                        {creatingDevis
                          ? 'Création du devis…'
                          : `Créer un devis (${selectedTravaux.length} poste${
                              selectedTravaux.length >
                              1
                                ? 's'
                                : ''
                            })`}
                      </button>
                    )}
                </div>
              </div>
            )}

            <button
              className="btn btn-ghost mt-6"
              onClick={() =>
                setView('list')
              }
            >
              Retour aux visites
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}