import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Plus, FileSignature, ArrowLeft, Trash2, Send, Save, Download, PenTool, CheckCircle2, Lock, FilePlus, Sparkles, ImagePlus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { setProspectStatus } from '../lib/crm/workflow'
import { logAuditEvent } from '../lib/auditLog'
import type { Devis, DevisLigne, DevisAide, Prospect, Produit, Entreprise, Installateur } from '../types'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { FloatSelect, FloatInput, FloatTextarea } from '../components/ui/FloatInput'
import { SignaturePad } from '../components/shared/SignaturePad'
import {
  calculMontantLigneHT, calculTotauxDevis, calculResteACharge, type RemiseType,
  CATEGORIE_VERS_GESTE_MPR, CATEGORIE_VERS_GESTE_CEE, MPR_ISOLATION_PAR_GESTE_ACTIF,
} from '../lib/devis/calculDevis'
import { calculAideMPR, determinerProfilMPR, ProfilMPR, LABEL_PROFIL } from '../lib/aides/baremeMaPrimeRenov'
import { prixProduitPourZone } from '../lib/catalogue/prixParZone'
import { analyserRentabilite, descriptionConsommables } from '../lib/devis/rentabilite'

/** Lignes de prestation ajoutées automatiquement avec un produit (reconnues par leur libellé). */
const PREFIXES_ASSOCIES = ['Pose', 'Dépose et évacuation', 'Évacuation des déchets', 'Consommables']
const estLigneAssociee = (designation: string, produit: string) =>
  PREFIXES_ASSOCIES.some(prefixe => designation === `${prefixe} — ${produit}`)
import { estimerPrimeCEE } from '../lib/aides/calculAidesCEE'
import { telechargerDevisPDF, devisPDFFichier } from '../lib/pdf/genererDevisPDF'
import { SignatureSurPlace, type ConsentementsSignature, type ResultatSignature } from '../components/devis/SignatureSurPlace'
import { useAuth } from '../lib/auth/AuthContext'
import { numeroDevis } from '../lib/devis/numeroDevis'
import { uploadDocument } from '../lib/storage/uploadDocument'
import { ConformitePanel } from '../components/devis/ConformitePanel'
import { LigneFicheFields } from '../components/devis/LigneFicheFields'
import { SectionsConformite } from '../components/devis/SectionsConformite'
import { Search } from 'lucide-react'
import '../components/devis/rv.css'
import {
  controlerDevis, ficheDuProduit, fusionnerMeta, META_PAR_DEFAUT, categorieRevenusDepuisLabel,
  estChampDeFiche, libellesFiche, CLES_AUTO_ISOLATION, LABEL_CATEGORIE_REVENUS,
  type ConformiteMeta, type PointConformite,
} from '../lib/devis/conformite'
import { REGLES_FICHES } from '../lib/devis/reglesFichesCEE'

const CLE_PRO_LOCAL = 'renova.devis.pro'
const pick = (o: any, cles: string[]) => { for (const k of cles) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return String(o[k]); return '' }

/** Valeurs initiales de la conformité : défauts + infos du prospect + dernières infos « pro » saisies sur ce poste. */
function metaInitiale(prospect: any): ConformiteMeta {
  let pro = META_PAR_DEFAUT.pro
  try {
    const brut = localStorage.getItem(CLE_PRO_LOCAL)
    if (brut) pro = { ...pro, ...JSON.parse(brut), couvre: {} }
  } catch { /* stockage indisponible */ }
  const type = pick(prospect, ['type_logement', 'type_habitation'])
  return {
    ...META_PAR_DEFAUT,
    pro,
    logement: {
      ...META_PAR_DEFAUT.logement,
      type: /appart/i.test(type) ? 'Appartement' : 'Maison individuelle',
      annee: pick(prospect, ['annee_construction', 'annee_logement']),
      zone: pick(prospect, ['zone_climatique', 'zone_cee']).toUpperCase(),
      surface: pick(prospect, ['surface_habitable', 'surface_chauffee', 'surface']),
      energie: pick(prospect, ['energie_chauffage', 'chauffage_actuel']),
    },
  }
}

const STATUT_BADGE: Record<string, string> = {
  brouillon: 'badge-neutral', envoye: 'badge-warning',
  signe: 'badge-success', refuse: 'badge-error', expire: 'badge-error',
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'combles_perdus', label: 'Isolation des combles perdus' },
  { value: 'rampants', label: 'Isolation des rampants' },
  { value: 'ite', label: 'Isolation par l’extérieur (ITE)' },
  { value: 'plancher', label: 'Isolation plancher bas' },
  { value: 'menuiseries', label: 'Menuiseries Extérieures - Fenêtres' },
  { value: 'menuiseries_portes', label: 'Menuiseries Extérieures - Portes' },
  { value: 'pac_air_eau', label: 'PAC Air/Eau' },
  { value: 'pac_air_air', label: 'PAC Air/Air' },
  { value: 'pac_geothermie', label: 'PAC géothermique' },
  { value: 'ballon_thermodynamique', label: 'Ballon thermodynamique' },
  { value: 'vmc', label: 'VMC' },
  { value: 'photovoltaique', label: 'Panneaux photovoltaïques' },
  { value: 'batterie_stockage', label: 'Batterie de stockage' },
  { value: 'domotique', label: 'Domotique et pilotage énergétique' },
  { value: 'solaire_thermique', label: 'Solaire thermique — BAR-TH-168' },
  { value: 'ssc', label: 'Système solaire combiné (SSC) — BAR-TH-143' },
  { value: 'destratificateur', label: 'Destratificateur d’air' },
  { value: 'hp_flottante', label: 'HP flottante' },
  { value: 'isolation_toiture_pro', label: 'Isolation toiture plate' },
  { value: 'pro_photovoltaique', label: 'Panneaux photovoltaïques' },
  { value: 'professionnel_cee', label: 'Professionnels — CEE' },
  { value: 'professionnel_hors_cee', label: 'Professionnels — hors CEE' },
  { value: 'autre', label: 'Autre prestation' },
]

type AssistantSuggestion = { product_id: string; quantite: number; justification: string }

/** Hiérarchie d’affichage du devis : famille, puis opération, puis lignes chiffrées. */
function familleCategorie(categorie: string): string {
  if (['combles_perdus', 'rampants', 'ite', 'plancher', 'isolation_toiture_pro'].includes(categorie)) return 'isolation'
  if (['pac_air_eau', 'pac_air_air', 'pac_geothermie', 'destratificateur', 'hp_flottante'].includes(categorie)) return 'chauffage'
  if (['ballon_thermodynamique', 'solaire_thermique', 'ssc'].includes(categorie)) return 'eau_chaude'
  if (['photovoltaique', 'pro_photovoltaique', 'batterie_stockage', 'domotique'].includes(categorie)) return 'electricite'
  if (['menuiseries', 'menuiseries_portes'].includes(categorie)) return 'menuiseries'
  if (categorie === 'vmc') return 'ventilation'
  if (categorie === 'professionnel_cee' || categorie === 'professionnel_hors_cee') return 'professionnels'
  return 'autre'
}

function libelleFamilleCategorie(categorie: string): string {
  const famille = familleCategorie(categorie)
  const labels: Record<string, string> = { isolation: 'Isolation', chauffage: 'Système de chauffage', eau_chaude: 'Production d’eau chaude', electricite: 'Production d’électricité', menuiseries: 'Menuiseries extérieures', ventilation: 'Ventilation', professionnels: 'Prestations professionnelles', autre: 'Autres prestations' }
  return labels[famille] || 'Autres prestations'
}

function libelleSousCategorie(categorie: string): string {
  return CATEGORIES.find(c => c.value === categorie)?.label || categorie || 'Autre prestation'
}

const euro = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0)

interface DevisPageProps {
  /** Devis à ouvrir automatiquement (ex: venant d'être créé depuis une visite technique) */
  openDevisId?: string | null
  /** Appelé une fois le devis demandé ouvert, pour que le parent nettoie son état */
  onOpenedDevis?: () => void
  /** Prospect à préremplir en arrivant (depuis la fiche prospect, action "Continuer"). */
  initialProspectId?: string | null
  /** Appelé une fois le prospect initial pris en compte, pour que le parent nettoie son état. */
  onInitialProspectHandled?: () => void
}

export function DevisPage({
  openDevisId, onOpenedDevis, initialProspectId, onInitialProspectHandled }: DevisPageProps = {}) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [rows, setRows] = useState<(Devis & { prospect?: Prospect })[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newProspectId, setNewProspectId] = useState('')
  const [filtrePublic, setFiltrePublic] = useState<'particulier' | 'professionnel' | 'tous'>('particulier')
  const [partenairesDevis, setPartenairesDevis] = useState<Installateur[]>([])
  const [quoteIssuerId, setQuoteIssuerId] = useState<string>('renova_soluces')
  const [creationError, setCreationError] = useState('')

  const [current, setCurrent] = useState<(Devis & { prospect?: Prospect }) | null>(null)
  const [lignes, setLignes] = useState<DevisLigne[]>([])
  const [aides, setAides] = useState<DevisAide[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [filtreCategorie, setFiltreCategorie] = useState<string>('combles_perdus')
  const [saving, setSaving] = useState(false)
  const [tauxCEE, setTauxCEE] = useState(6)
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantDescription, setAssistantDescription] = useState('')
  const [assistantPhotos, setAssistantPhotos] = useState<File[]>([])
  const [assistantSuggestions, setAssistantSuggestions] = useState<AssistantSuggestion[]>([])
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantError, setAssistantError] = useState('')
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [nomSignataire, setNomSignataire] = useState('')
  const [signing, setSigning] = useState(false)
  const [devisParent, setDevisParent] = useState<Devis | null>(null)
  const [avenants, setAvenants] = useState<Devis[]>([])
  const [creatingAvenant, setCreatingAvenant] = useState(false)
  const [remiseType, setRemiseType] = useState<RemiseType>('montant')
  const [remiseValeur, setRemiseValeur] = useState(0)
  const [conf, setConf] = useState<ConformiteMeta>(META_PAR_DEFAUT)
  const [rechercheProduit, setRechercheProduit] = useState('')

  function fetchListe() {
    setLoading(true)
    supabase.from('devis').select('*, prospect:prospects(*)').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setRows([]); setLoading(false); return }
        setRows((data || []) as any)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchListe()
    supabase.from('prospects').select('*').order('nom').then(({ data }) => setProspects((data || []) as Prospect[]))
    void (async () => {
      // Supabase REST peut limiter une réponse à 1 000 lignes. Charger toutes les pages
      // pour ne pas masquer les catégories situées en fin de catalogue (SSC, VMC, etc.).
      const pageSize = 1000
      const all: Produit[] = []
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('catalogue_produits')
          .select('id,entreprise_id,categorie,nom,marque,reference,description,caracteristiques,prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,created_at,zones_prix,forfait_pose_ht,forfait_evacuation_ht,public_cible,catalogue_groupe,forfait_consommables_ht,prix_conseille_ht,prix_plancher_ht,consommables_detail')
          .eq('actif', true)
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1)
        if (error) {
          console.error('Impossible de charger le catalogue pour les devis', error)
          setProduits([])
          return
        }
        const batch = (data || []) as Produit[]
        all.push(...batch)
        if (batch.length < pageSize) break
      }
      setProduits(all)
    })()
    supabase.from('installateurs').select('*').eq('devis_autorise', true).eq('actif', true).order('nom')
      .then(({ data }) => setPartenairesDevis((data || []) as Installateur[]))
    supabase.from('entreprises').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setEntreprise(data as Entreprise)
        if (data.taux_cee_eur_par_mwh_cumac) setTauxCEE(data.taux_cee_eur_par_mwh_cumac)
      }
    })
  }, [])

  // Devis créé depuis une visite technique (recommandations de travaux) : on l'ouvre directement
  useEffect(() => {
    if (!openDevisId) return
    supabase.from('devis').select('*, prospect:prospects(*)').eq('id', openDevisId).maybeSingle()
      .then(({ data }) => {
        if (data) ouvrirDevis(data as any)
        onOpenedDevis?.()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDevisId])

  // Arrivée depuis la fiche d'un prospect ("Continuer" -> générer une proposition commerciale) :
  // on ouvre directement le formulaire de nouveau devis avec le prospect préselectionné.
  useEffect(() => {
    if (!initialProspectId) return
    setNewProspectId(initialProspectId)
    setShowNewModal(true)
    onInitialProspectHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProspectId])

  useEffect(() => {
    const prospect = prospects.find(p => p.id === newProspectId)
    const partenaire = prospect?.installateur_id
      ? partenairesDevis.find(x => x.id === prospect.installateur_id && x.devis_autorise)
      : null
    setQuoteIssuerId(partenaire ? partenaire.id : 'renova_soluces')
  }, [newProspectId, prospects, partenairesDevis])

  async function creerDevis() {
    setCreationError('')
    if (!newProspectId) {
      setCreationError('Sélectionnez un prospect.')
      return
    }

    const { data: entreprise, error: entrepriseError } = await supabase
      .from('entreprises')
      .select('id, raison_sociale, forme_juridique, siret, numero_tva, adresse, code_postal, ville, telephone, email, logo_url, devis_duree_validite_jours, devis_conditions_paiement_defaut, conditions_generales_devis')
      .limit(1)
      .maybeSingle()

    if (entrepriseError) {
      setCreationError(`Impossible de charger les informations de l'entreprise : ${entrepriseError.message}`)
      return
    }

    const partenaire = quoteIssuerId !== 'renova_soluces'
      ? partenairesDevis.find(x => x.id === quoteIssuerId)
      : null

    if (quoteIssuerId !== 'renova_soluces' && !partenaire) {
      setCreationError('Le partenaire sélectionné n’est plus autorisé à émettre des devis.')
      return
    }

    const dureeValidite = entreprise?.devis_duree_validite_jours ?? 30
    const dateValidite = new Date(Date.now() + dureeValidite * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const issuer = partenaire
      ? {
          emetteur_type: 'partenaire',
          emetteur_installateur_id: partenaire.id,
          emetteur_nom_affichage: partenaire.devis_nom_affichage || partenaire.nom,
          emetteur_raison_sociale: partenaire.devis_raison_sociale || partenaire.nom,
          emetteur_forme_juridique: partenaire.devis_forme_juridique || '',
          emetteur_siret: partenaire.siret || '',
          emetteur_numero_tva: partenaire.numero_tva || '',
          emetteur_adresse: partenaire.adresse || '',
          emetteur_code_postal: partenaire.code_postal || '',
          emetteur_ville: partenaire.ville || '',
          emetteur_telephone: partenaire.telephone || '',
          emetteur_email: partenaire.email || '',
          emetteur_logo_url: partenaire.devis_logo_url || '',
          emetteur_cgv: partenaire.devis_cgv || '',
        }
      : {
          emetteur_type: 'renova_soluces',
          emetteur_installateur_id: null,
          emetteur_nom_affichage: entreprise?.raison_sociale || 'Reno Soluces',
          emetteur_raison_sociale: entreprise?.raison_sociale || 'Reno Soluces',
          emetteur_forme_juridique: entreprise?.forme_juridique || '',
          emetteur_siret: entreprise?.siret || '',
          emetteur_numero_tva: entreprise?.numero_tva || '',
          emetteur_adresse: entreprise?.adresse || '',
          emetteur_code_postal: entreprise?.code_postal || '',
          emetteur_ville: entreprise?.ville || '',
          emetteur_telephone: entreprise?.telephone || '',
          emetteur_email: entreprise?.email || '',
          emetteur_logo_url: entreprise?.logo_url || '',
          emetteur_cgv: entreprise?.conditions_generales_devis || '',
        }

    const { data, error } = await supabase.from('devis').insert({
      entreprise_id: entreprise?.id || null,
      prospect_id: newProspectId,
      numero: numeroDevis(),
      statut: 'brouillon',
      type_operation: 'mono_geste',
      date_validite: dateValidite,
      conditions_paiement: entreprise?.devis_conditions_paiement_defaut || '',
      remise_type: 'montant',
      remise_valeur: 0,
      montant_ht_avant_remise: 0,
      remise_montant_ht: 0,
      ...issuer,
    }).select('*').single()

    if (error || !data) {
      const message = error?.message || 'Le devis n’a pas pu être créé.'
      setCreationError(message)
      alert(`Impossible de créer le devis : ${message}`)
      return
    }

    const { data: prospectData } = await supabase.from('prospects').select('*').eq('id', newProspectId).maybeSingle()
    const devisComplet = { ...data, prospect: prospectData || prospects.find(p => p.id === newProspectId) || undefined }

    setShowNewModal(false)
    setNewProspectId('')
    setQuoteIssuerId('renova_soluces')
    ouvrirDevis(devisComplet as any)
    fetchListe()
  }

  async function ouvrirDevis(devis: Devis & { prospect?: Prospect }) {
    setCurrent(devis)
    setConf(fusionnerMeta((devis as any).conformite_devis, metaInitiale(devis.prospect)))
    setRemiseType((devis.remise_type || 'montant') as RemiseType)
    setRemiseValeur(Number(devis.remise_valeur || 0))
    setNomSignataire(devis.signature_nom_signataire || (devis.prospect ? `${devis.prospect.civilite || ''} ${devis.prospect.prenom} ${devis.prospect.nom}`.trim() : ''))
    setSignatureData(devis.signature_image_data || null)
    setDevisParent(null)
    setAvenants([])
    const [{ data: l }, { data: a }] = await Promise.all([
      supabase.from('devis_lignes').select('*').eq('devis_id', devis.id).order('ordre'),
      supabase.from('devis_aides').select('*').eq('devis_id', devis.id),
    ])
    setLignes((l || []) as DevisLigne[])
    setAides((a || []) as DevisAide[])
    if (devis.devis_parent_id) {
      supabase.from('devis').select('*').eq('id', devis.devis_parent_id).maybeSingle()
        .then(({ data }) => setDevisParent(data as Devis | null))
    }
    supabase.from('devis').select('*').eq('devis_parent_id', devis.id).order('numero_avenant')
      .then(({ data }) => setAvenants((data || []) as Devis[]))
    setView('editor')
  }

  async function creerAvenant() {
    if (!current) return
    setCreatingAvenant(true)
    const numeroAvenant = (avenants.length || 0) + 1
    const { data: entreprise } = await supabase.from('entreprises').select('devis_duree_validite_jours, devis_conditions_paiement_defaut').limit(1).maybeSingle()
    const dureeValidite = entreprise?.devis_duree_validite_jours ?? 30
    const dateValidite = new Date(Date.now() + dureeValidite * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data: nouveau, error } = await supabase.from('devis').insert({
      entreprise_id: current.entreprise_id,
      prospect_id: current.prospect_id,
      visite_id: current.visite_id,
      numero: `${current.numero}-AV${numeroAvenant}`,
      statut: 'brouillon',
      type_operation: current.type_operation,
      devis_parent_id: current.id,
      numero_avenant: numeroAvenant,
      date_validite: dateValidite,
      conditions_paiement: current.conditions_paiement || entreprise?.devis_conditions_paiement_defaut || '',
      notes: `Avenant n°${numeroAvenant} au devis ${current.numero} (signé le ${current.signature_date ? new Date(current.signature_date).toLocaleDateString('fr-FR') : '—'}).`,
      remise_type: current.remise_type || 'montant',
      remise_valeur: current.remise_valeur || 0,
      montant_ht_avant_remise: current.montant_ht_avant_remise || current.montant_ht || 0,
      remise_montant_ht: current.remise_montant_ht || 0,
      conformite_devis: conf,
    }).select('*, prospect:prospects(*)').single()

    if (!error && nouveau) {
      // On repart des lignes/aides du devis signé, modifiables dans l'avenant
      if (lignes.length > 0) {
        await supabase.from('devis_lignes').insert(lignes.map((l, i) => ({
          devis_id: nouveau.id, produit_id: l.produit_id, designation: l.designation,
          description: l.description, caracteristiques: l.caracteristiques,
          quantite: l.quantite, prix_unitaire_ht: l.prix_unitaire_ht, tva_taux: l.tva_taux,
          montant_ht: l.montant_ht, ordre: i,
        })))
      }
      if (aides.length > 0) {
        await supabase.from('devis_aides').insert(aides.map(a => ({
          devis_id: nouveau.id, type: a.type, libelle: a.libelle, montant: a.montant, details: a.details,
        })))
      }
      fetchListe()
      ouvrirDevis(nouveau as any)
    }
    setCreatingAvenant(false)
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error(`Lecture impossible pour ${file.name}`))
      reader.readAsDataURL(file)
    })
  }

  async function proposerLignesAssistantes() {
    if (!current) return
    if (!assistantDescription.trim() && assistantPhotos.length === 0) {
      setAssistantError('Décrivez le besoin ou joignez au moins une photo.')
      return
    }
    setAssistantLoading(true)
    setAssistantError('')
    setAssistantSuggestions([])
    try {
      const produitsEligibles = produits.filter(prod => prod.actif && prod.catalogue_groupe !== 'visite_technique' && (filtrePublic === 'tous' || prod.public_cible === filtrePublic || prod.public_cible === 'tous'))
      if (produitsEligibles.length === 0) throw new Error('Aucun produit actif ne correspond au public sélectionné dans le catalogue.')
      const photos = await Promise.all(assistantPhotos.map(fileToDataUrl))
      // Important : aucun prix ni tarif de pose n'est transmis au modèle. Les prix affichés
      // et ajoutés au devis sont toujours relus depuis le catalogue local de Renova-OS.
      const catalogueSansPrix = produitsEligibles.map(prod => ({ id: prod.id, nom: prod.nom, marque: prod.marque, reference: prod.reference, description: prod.description, categorie: prod.categorie, public_cible: prod.public_cible, caracteristiques: prod.caracteristiques }))
      const { data, error } = await supabase.functions.invoke('suggest-devis-lines', { body: { description: assistantDescription, photos, publicCible: filtrePublic, catalogue: catalogueSansPrix } })
      if (error || data?.error) throw new Error(error?.message || data?.error || 'L’assistant n’a pas pu analyser la demande.')
      const suggestions = (Array.isArray(data?.suggestions) ? data.suggestions : []).filter((x: any) => produitsEligibles.some(prod => prod.id === x.product_id)).map((x: any) => ({ product_id: String(x.product_id), quantite: Math.max(1, Math.min(100, Math.floor(Number(x.quantite) || 1))), justification: String(x.justification || 'Produit correspondant à la demande.') })) as AssistantSuggestion[]
      if (!suggestions.length) throw new Error('Aucun produit du catalogue ne semble correspondre. Vous pouvez continuer à ajouter les lignes manuellement.')
      setAssistantSuggestions(suggestions)
      // Archive les photos dans le dossier/prospect afin qu'elles restent consultables.
      for (const photo of assistantPhotos) {
        const { error: uploadError } = await uploadDocument(photo, { dossierId: current.dossier_id || null, prospectId: current.prospect_id, categorie: 'Photos demande devis', type: photo.type.startsWith('image/') ? photo.type.split('/')[1] : 'fichier' })
        if (uploadError) setAssistantError(`Suggestions prêtes, mais une photo n’a pas pu être archivée : ${uploadError}`)
      }
    } catch (e: any) {
      setAssistantError(e?.message || 'Erreur pendant la proposition des lignes.')
    } finally {
      setAssistantLoading(false)
    }
  }

  const profilMPR: ProfilMPR | null = useMemo(() => {
    const p = current?.prospect
    if (!p?.rfr || !p.nombre_personnes_foyer) return null
    return determinerProfilMPR(p.rfr, p.nombre_personnes_foyer, !!p.zone_ile_de_france)
  }, [current])

  // Prime CEE ITE selon le barème transmis par Reno Soluces :
  // Bleu = 12 €/m² ; Jaune/Violet/Rose = 8 €/m².
  // La surface est calculée à partir des seules lignes de produits isolants ITE,
  // jamais à partir de l'échafaudage ou de l'enduit pour éviter le double comptage.
  useEffect(() => {
    if (!current) return
    const surfaceIte = lignes.reduce((total, ligne) => {
      if (!ligne.produit_id) return total
      const produit = produits.find(item => item.id === ligne.produit_id)
      if (produit?.categorie !== 'ite') return total
      const reference = String(produit.reference || '').toUpperCase()
      const designation = String(produit.nom || ligne.designation || '').toLowerCase()
      if (reference.startsWith('FAC_') || reference.includes('INJECTION') || reference.includes('ECOBILLES') || designation.includes('échafaudage') || designation.includes('enduit') || designation.includes('écobilles')) return total
      return total + Math.max(0, Number(ligne.quantite) || 0)
    }, 0)
    const autoAideId = `cee_ite_surface:${current.id}`
    const tauxM2 = profilMPR === 'bleu' ? 12 : 8
    const montant = profilMPR && surfaceIte > 0 ? Math.round(surfaceIte * tauxM2 * 100) / 100 : 0

    setAides(previous => {
      const existing = previous.find(a => a.devis_id === current.id && (a.details as any)?.calculType === 'ite_surface')
      if (montant <= 0 || !profilMPR) {
        return existing ? previous.filter(a => a !== existing) : previous
      }
      const libelleProfil: Record<ProfilMPR, string> = {
        bleu: 'Bleu — très modestes',
        jaune: 'Jaune — modestes',
        violet: 'Violet — intermédiaires',
        rose: 'Rose — supérieurs / aisés',
      }
      const next = {
        id: existing?.id || `tmp_${Date.now()}_cee_ite`,
        devis_id: current.id,
        type: 'cee' as const,
        libelle: `Prime CEE ITE — profil ${libelleProfil[profilMPR]} (${tauxM2} €/m² × ${surfaceIte} m²)`,
        montant,
        details: { calculType: 'ite_surface', profil: profilMPR, taux_eur_m2: tauxM2, surface_m2: surfaceIte, formule: `${surfaceIte} × ${tauxM2}`, aide_id: autoAideId },
        created_at: existing?.created_at || new Date().toISOString(),
      }
      if (existing && existing.montant === next.montant && existing.libelle === next.libelle && (existing.details as any)?.surface_m2 === surfaceIte) return previous
      return existing ? previous.map(a => a === existing ? next : a) : [...previous, next]
    })
  }, [current?.id, lignes, produits, profilMPR])

  // CEE rampants/sarking : estimation recalculée sur la surface des seules lignes isolantes
  // dont la résistance thermique catalogue atteint R ≥ 6. L'aide reste distincte de la CEE ITE.
  useEffect(() => {
    if (!current) return
    const lignesRampants = lignes.filter(ligne => {
      if (!ligne.produit_id) return false
      const produit = produits.find(item => item.id === ligne.produit_id)
      if (!produit || !['rampants', 'combles'].includes(produit.categorie)) return false
      const ref = String(produit.reference || '').toUpperCase()
      const nom = String(produit.nom || ligne.designation || '').toLowerCase()
      const c = produit.caracteristiques || {}
      const r = Number(c.resistance_thermique_R_m2K_W ?? c.resistance_thermique ?? c.r ?? ligne.caracteristiques?.resistance_thermique ?? 0)
      return r >= 6 && Number(ligne.quantite) > 0
    })
    const surface = lignesRampants.reduce((total, ligne) => total + Math.max(0, Number(ligne.quantite) || 0), 0)
    const tauxRampantsM2 = profilMPR === 'bleu' ? 13 : 10
    const montant = surface > 0 ? Math.round(surface * tauxRampantsM2 * 100) / 100 : 0
    setAides(previous => {
      const existing = previous.find(a => a.devis_id === current.id && ((a.details as any)?.calculType === 'cee_rampants_surface' || (a.type === 'cee' && ['isolation_combles', 'isolation_rampants'].includes((a.details as any)?.gesteId))))
      const autres = previous.filter(a => { const details = a.details as any; const estCEEComblesAuto = details?.calculType === 'cee_rampants_surface' || (a.type === 'cee' && ['isolation_combles', 'isolation_rampants'].includes(details?.gesteId)); return !(a.devis_id === current.id && estCEEComblesAuto) })
      if (!surface || !profilMPR || montant <= 0) return autres
      const next: DevisAide = {
        id: existing?.id || `tmp_${current.id}_cee_rampants`,
        devis_id: current.id,
        type: 'cee',
        libelle: `Prime CEE rampants / sarking — ${surface} m² × ${tauxRampantsM2} €/m² (barème Reno Soluces)`,
        montant,
        details: { calculType: 'cee_rampants_surface', gesteId: 'isolation_rampants', surface_m2: surface, taux_eur_m2: tauxRampantsM2, fiche: 'BAR-EN-101', estimation: false },
        created_at: existing?.created_at || new Date().toISOString(),
      }
      return [...autres, next]
    })
    const tauxMPRRampants = profilMPR === 'bleu' ? 25 : profilMPR === 'jaune' ? 20 : profilMPR === 'violet' ? 15 : 0
    setAides(previous => {
      const existing = previous.find(a => a.devis_id === current.id && (a.details as any)?.calculType === 'mpr_rampants_surface')
      const autres = previous.filter(a => !(a.devis_id === current.id && (a.details as any)?.calculType === 'mpr_rampants_surface'))
      if (!MPR_ISOLATION_PAR_GESTE_ACTIF || !surface || !profilMPR || tauxMPRRampants <= 0) return autres
      const next: DevisAide = {
        id: existing?.id || `tmp_${current.id}_mpr_rampants`,
        devis_id: current.id,
        type: 'maprimerenov',
        libelle: `MaPrimeRénov’ rampants — ${surface} m² × ${tauxMPRRampants} €/m²`,
        montant: Math.round(surface * tauxMPRRampants * 100) / 100,
        details: { calculType: 'mpr_rampants_surface', gesteId: 'isolation_combles_amenages', profil: profilMPR, surface_m2: surface, taux_eur_m2: tauxMPRRampants },
        created_at: existing?.created_at || new Date().toISOString(),
      }
      return [...autres, next]
    })
  }, [current?.id, lignes, produits, profilMPR])

  // Combles perdus : barème 2026 communiqué par Reno Soluces, distinct des rampants.
  useEffect(() => {
    if (!current) return
    const surface = lignes.reduce((total, ligne) => {
      if (!ligne.produit_id) return total
      const produit = produits.find(item => item.id === ligne.produit_id)
      if (!produit || produit.categorie !== 'combles_perdus') return total
      const c = produit.caracteristiques || {}
      const r = Number(c.resistance_thermique_R_m2K_W ?? c.resistance_thermique ?? c.r ?? 0)
      if (r < 7) return total
      const nom = String(produit.nom || ligne.designation || '').toLowerCase()
      if (nom.includes('pose') || nom.includes('déchet') || nom.includes('évacuation')) return total
      return total + Math.max(0, Number(ligne.quantite) || 0)
    }, 0)
    const tauxCEE = profilMPR === 'bleu' ? 13 : 10
    const montantCEE = surface > 0 ? Math.round(surface * tauxCEE * 100) / 100 : 0
    setAides(previous => {
      const existing = previous.find(a => a.devis_id === current.id && (a.details as any)?.calculType === 'cee_combles_perdus_surface')
      const autres = previous.filter(a => !(a.devis_id === current.id && (a.details as any)?.calculType === 'cee_combles_perdus_surface'))
      if (!surface || !profilMPR || montantCEE <= 0) return autres
      const next: DevisAide = { id: existing?.id || `tmp_${current.id}_cee_combles_perdus`, devis_id: current.id, type: 'cee', libelle: `Prime CEE combles perdus — ${surface} m² × ${tauxCEE} €/m²`, montant: montantCEE, details: { calculType: 'cee_combles_perdus_surface', gesteId: 'isolation_combles_perdus', surface_m2: surface, taux_eur_m2: tauxCEE, fiche: 'BAR-EN-101', estimation: false }, created_at: existing?.created_at || new Date().toISOString() }
      return [...autres, next]
    })
    // Le nettoyage de l'aide MPR existante doit toujours s'exécuter (même si la surface retombe à 0).
    const tauxMPR = profilMPR === 'bleu' ? 25 : profilMPR === 'jaune' ? 20 : profilMPR === 'violet' ? 15 : 0
    setAides(previous => {
      const existing = previous.find(a => a.devis_id === current.id && (a.details as any)?.calculType === 'mpr_combles_perdus_surface')
      const autres = previous.filter(a => !(a.devis_id === current.id && (a.details as any)?.calculType === 'mpr_combles_perdus_surface'))
      if (!MPR_ISOLATION_PAR_GESTE_ACTIF || surface <= 0 || !profilMPR || tauxMPR <= 0) return autres
      const next: DevisAide = { id: existing?.id || `tmp_${current.id}_mpr_combles_perdus`, devis_id: current.id, type: 'maprimerenov', libelle: `MaPrimeRénov’ combles perdus — ${surface} m² × ${tauxMPR} €/m²`, montant: Math.round(surface * tauxMPR * 100) / 100, details: { calculType: 'mpr_combles_perdus_surface', gesteId: 'isolation_combles_perdus', profil: profilMPR, surface_m2: surface, taux_eur_m2: tauxMPR }, created_at: existing?.created_at || new Date().toISOString() }
      return [...autres, next]
    })
  }, [current?.id, lignes, produits, profilMPR])

  function ajouterProduit(produit: Produit, quantite = 1) {
    const prixApplicable = prixProduitPourZone(produit, current?.prospect?.code_postal)
    const qte = Math.max(1, Math.floor(Number(quantite) || 1))
    const ordreBase = lignes.length
    const caracteristiquesProduit: Record<string, string | number> = {
      ...(produit.caracteristiques || {}),
      ...(produit.marque ? { Marque: produit.marque } : {}),
      ...(produit.reference ? { Référence: produit.reference } : {}),
    }
    if (['combles_perdus', 'rampants', 'combles', 'ite'].includes(produit.categorie)) {
      caracteristiquesProduit.marque_isolant = caracteristiquesProduit.marque_isolant || [produit.marque, produit.reference].filter(Boolean).join(' ') || produit.description || produit.nom
      const rCatalogue = caracteristiquesProduit.resistance_thermique_R_m2K_W ?? caracteristiquesProduit.resistance_thermique ?? caracteristiquesProduit.r
      if (rCatalogue !== undefined && rCatalogue !== null && rCatalogue !== '') caracteristiquesProduit.resistance_thermique = Number(rCatalogue) || String(rCatalogue)
      caracteristiquesProduit.surface_isolee = qte
    }
    const ligne: DevisLigne = {
      id: `tmp_${Date.now()}_${Math.random()}`,
      devis_id: current!.id,
      produit_id: produit.id,
      designation: produit.nom,
      description: produit.description,
      caracteristiques: caracteristiquesProduit,
      quantite: qte,
      prix_unitaire_ht: prixApplicable,
      tva_taux: produit.tva_taux,
      montant_ht: prixApplicable * qte,
      ordre: ordreBase,
      created_at: new Date().toISOString(),
    }
    const lignesAjoutees: DevisLigne[] = [ligne]

    // Pose et évacuation des déchets : ajoutées automatiquement à la suite du
    // produit si un forfait est renseigné dans le catalogue, avec la même
    // quantité (elles suivront donc la quantité du produit si l'utilisateur
    // l'ajuste ensuite). Non liées à produit_id : ce sont des lignes de
    // prestation, pas des rachats du même produit.
    if (produit.forfait_pose_ht > 0) {
      lignesAjoutees.push({
        id: `tmp_${Date.now()}_${Math.random()}`,
        devis_id: current!.id,
        produit_id: null,
        designation: `Pose — ${produit.nom}`,
        description: '',
        caracteristiques: {},
        quantite: qte,
        prix_unitaire_ht: produit.forfait_pose_ht,
        tva_taux: produit.tva_taux,
        montant_ht: produit.forfait_pose_ht * qte,
        ordre: ordreBase + 1,
        created_at: new Date().toISOString(),
      })
    }
    if (produit.forfait_evacuation_ht > 0) {
      lignesAjoutees.push({
        id: `tmp_${Date.now()}_${Math.random()}`,
        devis_id: current!.id,
        produit_id: null,
        designation: `Dépose et évacuation — ${produit.nom}`,
        description: 'Dépose de l’ancien équipement, évacuation et traitement des déchets en filière agréée.',
        caracteristiques: {},
        quantite: qte,
        prix_unitaire_ht: produit.forfait_evacuation_ht,
        tva_taux: produit.tva_taux,
        montant_ht: produit.forfait_evacuation_ht * qte,
        ordre: ordreBase + 2,
        created_at: new Date().toISOString(),
      })
    }
    if ((produit.forfait_consommables_ht || 0) > 0) {
      lignesAjoutees.push({
        id: `tmp_${Date.now()}_${Math.random()}`,
        devis_id: current!.id,
        produit_id: null,
        designation: `Consommables — ${produit.nom}`,
        description: descriptionConsommables(produit.consommables_detail),
        caracteristiques: {},
        quantite: qte,
        prix_unitaire_ht: produit.forfait_consommables_ht || 0,
        tva_taux: produit.tva_taux,
        montant_ht: (produit.forfait_consommables_ht || 0) * qte,
        ordre: ordreBase + 3,
        created_at: new Date().toISOString(),
      })
    }
    setLignes(ls => [...ls, ...lignesAjoutees])

    if (produit.eligible_mpr && profilMPR) {
      const gesteId = CATEGORIE_VERS_GESTE_MPR[produit.categorie]
      if (gesteId) {
        const resultat = calculAideMPR(gesteId as any, profilMPR, prixApplicable * qte)
        if (resultat.montant > 0 && !aides.some(a => a.type === 'maprimerenov' && (a.details as any)?.gesteId === gesteId)) {
          setAides(as => [...as, {
            id: `tmp_${Date.now()}_mpr`,
            devis_id: current!.id,
            type: 'maprimerenov',
            libelle: `MaPrimeRénov' — ${resultat.geste.nom} (profil ${LABEL_PROFIL[profilMPR]})`,
            montant: resultat.montant,
            details: { gesteId, profil: profilMPR },
            created_at: new Date().toISOString(),
          }])
        }
      }
    }
    if (produit.eligible_cee && !['combles', 'combles_perdus', 'rampants'].includes(produit.categorie)) {
      const gesteId = CATEGORIE_VERS_GESTE_CEE[produit.categorie]
      if (gesteId) {
        const estimation = estimerPrimeCEE(gesteId, qte, tauxCEE)
        if (estimation.montantEstime > 0 && !aides.some(a => a.type === 'cee' && (a.details as any)?.gesteId === gesteId)) {
          setAides(as => [...as, {
            id: `tmp_${Date.now()}_cee`,
            devis_id: current!.id,
            type: 'cee',
            libelle: `CEE — ${estimation.coefficient?.nom || gesteId} (estimation)`,
            montant: estimation.montantEstime,
            details: { gesteId, estimation: true },
            created_at: new Date().toISOString(),
          }])
        }
      }
    }
  }

  function updateLigne(id: string, patch: Partial<DevisLigne>) {
    setLignes(ls => {
      const cible = ls.find(l => l.id === id)
      const updated = ls.map(l => {
        if (l.id !== id) return l
        const u = { ...l, ...patch }
        if (patch.quantite !== undefined && (['combles', 'combles_perdus', 'rampants', 'ite'].includes(u.categorie || '') || l.caracteristiques?.surface_isolee !== undefined)) {
          u.caracteristiques = { ...(u.caracteristiques || {}), surface_isolee: Number(patch.quantite) || 0 }
        }
        u.montant_ht = calculMontantLigneHT(u)
        return u
      })
      // Si on modifie la quantité d'une ligne "produit" (celle qui porte le
      // produit_id), on répercute la même quantité sur ses lignes de pose et
      // d'évacuation des déchets associées (reconnues par leur libellé), pour
      // qu'elles restent cohérentes avec la surface/quantité réellement posée.
      if (cible?.produit_id && patch.quantite !== undefined) {
        return updated.map(l => {
          if (l.produit_id) return l
          if (!estLigneAssociee(l.designation, cible.designation)) return l
          const u = { ...l, quantite: patch.quantite! }
          u.montant_ht = calculMontantLigneHT(u)
          return u
        })
      }
      return updated
    })
  }

  function removeLigne(id: string) {
    setLignes(ls => {
      const cible = ls.find(l => l.id === id)
      if (cible?.produit_id) {
        return ls.filter(l => l.id !== id && (l.produit_id || !estLigneAssociee(l.designation, cible.designation)))
      }
      return ls.filter(l => l.id !== id)
    })
  }

  function removeAide(id: string) {
    setAides(as => as.filter(a => a.id !== id))
  }

  function ajouterAideManuelle(type: DevisAide['type']) {
    const libelles: Record<string, string> = {
      anah_ampleur: "Aide Anah — rénovation d'ampleur",
      eco_ptz: 'Éco-PTZ',
      tva_reduite: 'TVA réduite 5,5% (déjà appliquée sur les lignes)',
    }
    setAides(as => [...as, {
      id: `tmp_${Date.now()}_manuel`,
      devis_id: current!.id,
      type,
      libelle: libelles[type] || type,
      montant: 0,
      details: {},
      created_at: new Date().toISOString(),
    }])
  }

  const totaux = useMemo(() => calculTotauxDevis(lignes, remiseValeur, remiseType), [lignes, remiseValeur, remiseType])
  const produitsParId = useMemo(() => new Map(produits.map(pr => [pr.id, pr])), [produits])
  const rentabilite = useMemo(() => analyserRentabilite(lignes, produitsParId, totaux.montantHT), [lignes, produitsParId, totaux.montantHT])
  const lignesAvecCategorie = useMemo(() => {
    let categorieCourante = 'autre'
    return lignes.map(l => {
      const produit = l.produit_id ? produits.find(p => p.id === l.produit_id) : undefined
      if (produit?.categorie) categorieCourante = produit.categorie
      return { ...l, categorie: produit?.categorie || categorieCourante }
    })
  }, [lignes, produits])
  const categorieRevenus = useMemo(() => profilMPR ? categorieRevenusDepuisLabel(String(LABEL_PROFIL[profilMPR])) : null, [profilMPR])
  const fichesDuDevis = useMemo(() => Array.from(new Set(lignes.map(l => ficheDuProduit(l.produit_id ? produits.find(x => x.id === l.produit_id) : null)).filter((f): f is string => !!f))), [lignes, produits])
  const ficheLigne = (l: { produit_id: string | null }) => ficheDuProduit(l.produit_id ? produits.find(x => x.id === l.produit_id) : null)
  const pointsConformite: PointConformite[] = useMemo(() => controlerDevis({
    lignes, produits, aides, meta: conf, totalTTC: totaux.montantTTC, categorieRevenus,
    societe: { siret: current?.emetteur_siret || entreprise?.siret },
    client: { nom: current?.prospect ? `${current.prospect.prenom || ''} ${current.prospect.nom || ''}`.trim() : '', adresse: current?.prospect?.adresse_rue || (current?.prospect as any)?.adresse },
    devis: { dateValidite: current?.date_validite, dateDevis: current?.created_at?.slice(0, 10), dateSignature: current?.signature_date },
  }), [lignes, produits, aides, conf, totaux.montantTTC, categorieRevenus, current, entreprise])
  const blocsConformite = pointsConformite.filter(x => x.gravite === 'bloc')
  // Un devis sous le prix plancher doit être validé par la direction : un commercial ne peut pas le faire signer.
  // Seule la remise du commercial bloque : un prix catalogue déjà sous le plancher est signalé à la direction, pas au commercial.
  const nonRentableBloquant = rentabilite.niveau === 'non_rentable' && totaux.remiseHT > 0 && !isAdmin
  const signatureBloquee = (blocsConformite.length > 0 || nonRentableBloquant) && !isAdmin
  const aMontantCEE = aides.some(a => a.type === 'cee')

  /** Un admin peut passer outre les points bloquants, après confirmation explicite. */
  function confirmerMalgreBlocs(action: string): boolean {
    if (blocsConformite.length === 0) return true
    return window.confirm(`Ce devis présente ${blocsConformite.length} point(s) non conforme(s) aux règles CEE / MaPrimeRénov' intégrées (risque de refus du dossier).\n\n${blocsConformite.slice(0, 6).map(x => '• ' + x.message).join('\n')}\n\n${action} malgré tout ?`)
  }
  function ouvrirSignature() { if (confirmerMalgreBlocs('Signer')) setShowSignatureModal(true) }
  const totalAides = useMemo(() => aides.reduce((s, a) => s + (a.montant || 0), 0), [aides])
  const resteACharge = useMemo(() => calculResteACharge(totaux.montantTTC, aides), [totaux, aides])

  async function enregistrer() {
    if (!current) return false
    setSaving(true)
    try {
    const { error: devisError } = await supabase.from('devis').update({
      montant_ht: totaux.montantHT,
      montant_ht_avant_remise: totaux.montantHTAvantRemise,
      remise_type: remiseType,
      remise_valeur: remiseValeur,
      remise_montant_ht: totaux.remiseHT,
      montant_tva: totaux.montantTVA,
      montant_ttc: totaux.montantTTC,
      montant_aides: totalAides,
      reste_a_charge: resteACharge,
      niveau_rentabilite: rentabilite.analysable ? rentabilite.niveau : null,
      plancher_ht: rentabilite.analysable ? rentabilite.plancherHT : null,
      date_validite: current.date_validite,
      conditions_paiement: current.conditions_paiement,
      conformite_devis: conf,
    }).eq('id', current.id)
    if (devisError) throw devisError
    try { localStorage.setItem(CLE_PRO_LOCAL, JSON.stringify({ rge: conf.pro.rge, organisme: conf.pro.organisme, validite: conf.pro.validite, assurance: conf.pro.assurance })) } catch { /* ignoré */ }

    const { error: deleteLignesError } = await supabase.from('devis_lignes').delete().eq('devis_id', current.id)
    if (deleteLignesError) throw deleteLignesError
    if (lignes.length > 0) {
      const { error: lignesError } = await supabase.from('devis_lignes').insert(lignes.map((l, i) => ({
        devis_id: current.id,
        produit_id: l.produit_id,
        designation: l.designation,
        description: l.description,
        caracteristiques: l.caracteristiques,
        quantite: l.quantite,
        prix_unitaire_ht: l.prix_unitaire_ht,
        tva_taux: l.tva_taux,
        montant_ht: l.montant_ht,
        ordre: i,
      })))
      if (lignesError) throw lignesError
    }

    const { error: deleteAidesError } = await supabase.from('devis_aides').delete().eq('devis_id', current.id)
    if (deleteAidesError) throw deleteAidesError
    if (aides.length > 0) {
      const { error: aidesError } = await supabase.from('devis_aides').insert(aides.map(a => ({
        devis_id: current.id,
        type: a.type,
        libelle: a.libelle,
        montant: a.montant,
        details: a.details,
      })))
      if (aidesError) throw aidesError
    }

    setCurrent(c => c ? {
      ...c,
      montant_ht: totaux.montantHT,
      montant_ht_avant_remise: totaux.montantHTAvantRemise,
      remise_type: remiseType,
      remise_valeur: remiseValeur,
      remise_montant_ht: totaux.remiseHT,
      montant_tva: totaux.montantTVA,
      montant_ttc: totaux.montantTTC,
      montant_aides: totalAides,
      reste_a_charge: resteACharge,
    } : c)
    fetchListe()
    return true
    } catch (error: any) {
      window.alert(`Échec de l’enregistrement du devis : ${error?.message || 'erreur inconnue'}`)
      return false
    } finally { setSaving(false) }
  }

  async function envoyerSignature() {
    if (!confirmerMalgreBlocs('Envoyer')) return
    if (!current) return
    const saved = await enregistrer()
    if (!saved) return
    await supabase.from('devis').update({ statut: 'envoye', signature_statut: 'envoye' }).eq('id', current.id)
    setCurrent(c => c ? { ...c, statut: 'envoye', signature_statut: 'envoye' } : c)
    fetchListe()
  }

  function telechargerPDF() {
    if (!current) return
    telechargerDevisPDF(
      { ...current, montant_ht: totaux.montantHT, montant_ht_avant_remise: totaux.montantHTAvantRemise, remise_type: remiseType, remise_valeur: remiseValeur, remise_montant_ht: totaux.remiseHT, montant_tva: totaux.montantTVA, montant_ttc: totaux.montantTTC, montant_aides: totalAides, reste_a_charge: resteACharge },
      lignesAvecCategorie,
      aides,
      current.prospect || null,
      entreprise
    )
  }

  async function validerSignature(nomSignataire: string, signatureData: string, consentements: ConsentementsSignature): Promise<ResultatSignature> {
    if (!current || !signatureData || !nomSignataire.trim()) return { ok: false, erreur: 'Signature ou nom manquant.' }
    setSigning(true)

    // On enregistre d'abord les lignes/aides en l'état, un devis signé ne doit plus être
    // modifiable ensuite (valeur juridique du "bon pour accord")
    const saved = await enregistrer()
    if (!saved) { setSigning(false); return { ok: false, erreur: 'Le devis n’a pas pu être enregistré.' } }

    const dateSignature = new Date().toISOString()

    // Empreinte du contenu signé (montants + signataire + horodatage) pour renforcer la
    // valeur probante : toute modification ultérieure du devis serait détectable.
    const contenuAHacher = JSON.stringify({
      devisId: current.id, numero: current.numero,
      montantHTAvantRemise: totaux.montantHTAvantRemise, remiseType, remiseValeur, remiseHT: totaux.remiseHT,
      montantTTC: totaux.montantTTC, resteACharge, nomSignataire: nomSignataire.trim(), dateSignature,
    })
    let hash = ''
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(contenuAHacher))
      hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    } catch { /* SubtleCrypto indisponible (contexte non sécurisé) — audit dégradé sans hash */ }

    const signatureAudit = {
      hash_document: hash,
      user_agent: navigator.userAgent,
      langue: navigator.language,
      signe_par_compte: profile?.nom_complet || null,
      consentements: {
        cgv_acceptees: consentements.cgv_acceptees,
        bordereau_retractation_remis: consentements.bordereau_remis,
        execution_avant_fin_retractation: consentements.execution_anticipee,
        vente_hors_etablissement: conf.venteHorsEtablissement,
        cgv_empreinte: (current.emetteur_cgv || entreprise?.conditions_generales_devis || '').length,
      },
      note_juridique: 'Signature manuscrite capturée en présence du client (tablette). Horodatage et empreinte du document fournis à titre de preuve renforcée ; ceci ne constitue pas une signature électronique qualifiée au sens eIDAS.',
    }

    const { data, error } = await supabase.from('devis').update({
      statut: 'signe',
      signature_statut: 'signe',
      signature_provider: 'tablette',
      signature_date: dateSignature,
      signature_image_data: signatureData,
      signature_nom_signataire: nomSignataire.trim(),
      signature_audit: signatureAudit,
    }).eq('id', current.id).select('*, prospect:prospects(*)').single()

    if (!error && current.prospect_id) {
      await supabase.from('interactions').insert({
        prospect_id: current.prospect_id, type: 'devis', auteur: profile?.nom_complet || 'Vous',
        contenu: `Devis ${current.numero} signé — ${euro(totaux.montantTTC)} TTC`,
      })
      await setProspectStatus(current.prospect_id, 'Signé', `devis ${current.numero} signé`)
    }

    // Un devis signé ouvre (ou complète) le dossier de suivi du client : c'est le pivot
    // entre "vente" et "suivi CRM/administratif" du dossier de rénovation.
    if (!error && current.prospect_id && !current.dossier_id) {
      const { data: dossier } = await supabase.from('dossiers').insert({
        prospect_id: current.prospect_id,
        visite_id: current.visite_id || null,
        devis_id: current.id,
        reference: `DOS-${current.numero.replace('DEV-', '')}`,
        statut: 'signe',
        montant_total: totaux.montantTTC,
        aides_montant: totalAides,
        reste_a_charge: resteACharge,
      }).select('id').single()

      if (dossier) {
        await supabase.from('devis').update({ dossier_id: dossier.id }).eq('id', current.id)
        // Le devis signé ouvre le cycle travaux : le prospect passe en Installation.
        await setProspectStatus(current.prospect_id, 'Installation', `devis ${current.numero} → installation`)
        // Checklist des pièces administratives usuelles à recueillir pour instruire le dossier
        await supabase.from('documents').insert([
          { dossier_id: dossier.id, prospect_id: current.prospect_id, nom: 'Devis signé', type: 'devis_signe', categorie: 'Contractuel', recu: true },
          { dossier_id: dossier.id, prospect_id: current.prospect_id, nom: 'Avis d’impôts (avis d’imposition)', type: 'avis_imposition', categorie: 'Administratif', recu: false },
          { dossier_id: dossier.id, prospect_id: current.prospect_id, nom: 'Taxe foncière', type: 'taxe_fonciere', categorie: 'Administratif', recu: false },
          { dossier_id: dossier.id, prospect_id: current.prospect_id, nom: 'Carte nationale d’identité (CNI)', type: 'piece_identite', categorie: 'Administratif', recu: false },
          { dossier_id: dossier.id, prospect_id: current.prospect_id, nom: 'Justificatif de domicile', type: 'justificatif_domicile', categorie: 'Administratif', recu: false },
          { dossier_id: dossier.id, prospect_id: current.prospect_id, nom: 'Photos avant travaux', type: 'photos', categorie: 'Technique', recu: false },
        ])
      }
    }

    if (!error) {
      await logAuditEvent({ action: 'devis_signe', entityType: 'devis', entityId: current.id, description: `Devis ${current.numero} signé`, meta: { montant_ttc: totaux.montantTTC } })
    }

    if (!error && current.prospect_id && current.dossier_id) {
      await setProspectStatus(current.prospect_id, 'Installation', `devis ${current.numero} → installation`)
    }

    if (error || !data) {
      setSigning(false)
      return { ok: false, erreur: error?.message || 'La signature n’a pas pu être enregistrée.' }
    }

    // PDF signé (CGV et bordereau inclus) : archivé dans le dossier, puis envoyé au client.
    const signe = data as any
    const resultat: ResultatSignature = { ok: true, pdfArchive: false, emailEnvoyeA: null, erreurEmail: null }
    const { data: devisAJour } = await supabase.from('devis').select('dossier_id').eq('id', current.id).maybeSingle()
    const dossierId = devisAJour?.dossier_id || current.dossier_id || null
    let cheminPdf: string | null = null
    try {
      const fichier = await devisPDFFichier({ ...signe, montant_ht: totaux.montantHT, montant_ht_avant_remise: totaux.montantHTAvantRemise, remise_montant_ht: totaux.remiseHT, montant_tva: totaux.montantTVA, montant_ttc: totaux.montantTTC, montant_aides: totalAides, reste_a_charge: resteACharge }, lignesAvecCategorie, aides, signe.prospect || current.prospect || null, entreprise)
      const chemin = `${dossierId || current.prospect_id || 'divers'}/${current.numero}-signe-${Date.now()}.pdf`
      const { error: upErr } = await supabase.storage.from('documents').upload(chemin, fichier, { contentType: 'application/pdf', upsert: false })
      if (!upErr) {
        const champs = { nom: fichier.name, url: chemin, taille: fichier.size, recu: true, type: 'devis_signe', categorie: 'Contractuel' }
        const { data: existant } = dossierId
          ? await supabase.from('documents').select('id').eq('dossier_id', dossierId).eq('type', 'devis_signe').limit(1).maybeSingle()
          : { data: null }
        const { error: docErr } = existant
          ? await supabase.from('documents').update(champs).eq('id', existant.id)
          : await supabase.from('documents').insert({ ...champs, dossier_id: dossierId, prospect_id: current.prospect_id })
        if (!docErr) { cheminPdf = chemin; resultat.pdfArchive = true }
      }
    } catch (e) { console.error('PDF signé non archivé', e) }

    const emailClient = signe.prospect?.email || current.prospect?.email
    if (consentements.envoyer_copie && emailClient && current.prospect_id) {
      const prenom = signe.prospect?.prenom || current.prospect?.prenom || ''
      const message = [
        `Bonjour${prenom ? ` ${prenom}` : ''},`,
        `Merci pour votre confiance. Vous trouverez ci-joint votre devis ${current.numero} signé ce jour (${euro(totaux.montantTTC)} TTC${totalAides > 0 ? `, reste à charge estimé ${euro(resteACharge)}` : ''}), accompagné de nos conditions générales de vente.`,
        conf.venteHorsEtablissement ? 'Conformément au Code de la consommation, vous disposez d’un délai de 14 jours pour exercer votre droit de rétractation, à l’aide du bordereau joint au devis.' : '',
        'Nous revenons vers vous très vite pour la suite de votre projet (documents à fournir et planification des travaux).',
        'Bien cordialement,',
      ].filter(Boolean).join('\n\n')
      if (cheminPdf) {
        const { data: env, error: envErr } = await supabase.functions.invoke('envoyer-email-prospect', { body: { prospect_id: current.prospect_id, sujet: `Votre devis ${current.numero} signé`, message, modele: 'devis_signe', piece_jointe: cheminPdf } })
        if (envErr || env?.error) {
          let detail = env?.error || envErr?.message || 'erreur inconnue'
          try { const j = await (envErr as any)?.context?.json?.(); if (j?.error) detail = j.error } catch { /* ignoré */ }
          resultat.erreurEmail = detail
        } else resultat.emailEnvoyeA = emailClient
      } else resultat.erreurEmail = 'le PDF n’a pas pu être archivé'
    }

    setSigning(false)
    setCurrent(signe)
    fetchListe()
    return resultat
  }

  async function supprimerDevis() {
    if (!current || !isAdmin) return

    const message = current.statut === 'signe'
      ? `Le devis ${current.numero} est signé. Sa suppression retirera également la commission associée et détachera le devis du dossier éventuel. Continuer ?`
      : `Supprimer définitivement le devis ${current.numero} ? Cette action est irréversible.`

    if (!window.confirm(message)) return

    const { error } = await supabase
      .from('devis')
      .delete()
      .eq('id', current.id)

    if (error) {
      alert(`Impossible de supprimer le devis : ${error.message}`)
      return
    }

    setCurrent(null)
    setLignes([])
    setAides([])
    setDevisParent(null)
    setAvenants([])
    setView('list')
    fetchListe()
  }

  const categoriesProOnly = ['destratificateur', 'hp_flottante', 'isolation_toiture_pro', 'pro_photovoltaique', 'professionnel_cee', 'professionnel_hors_cee']
  const categoriesDevis = CATEGORIES.filter(c => filtrePublic === 'tous' || (filtrePublic === 'professionnel' ? (categoriesProOnly.includes(c.value) || c.value === 'pac_air_eau' || c.value === 'autre') : !categoriesProOnly.includes(c.value)))
  const sectionsParticuliers = [
    { label: 'Isolation', values: ['combles_perdus','rampants','ite','plancher'] },
    { label: 'Menuiseries Extérieures', values: ['menuiseries','menuiseries_portes'] },
    { label: 'Chauffage', values: ['pac_air_eau','pac_air_air','pac_geothermie'] },
    { label: "Production d’eau chaude", values: ['ballon_thermodynamique','solaire_thermique','ssc'] },
    { label: 'Production d’électricité', values: ['photovoltaique','batterie_stockage'] },
    { label: 'VMC', values: ['vmc'] },
    { label: 'Autres prestations', values: ['autre'] },
  ]
  const sectionsProfessionnels = [
    { label: 'HP flottante', values: ['hp_flottante'] },
    { label: 'Destratificateur d’air', values: ['destratificateur'] },
    { label: 'Chauffage', values: ['pac_air_eau'] },
    { label: 'Isolation', values: ['isolation_toiture_pro','professionnel_cee','professionnel_hors_cee'] },
    { label: 'Production d’électricité', values: ['pro_photovoltaique'] },
    { label: 'Autres prestations', values: ['autre'] },
  ]
  const sectionsCatalogue = (filtrePublic === 'professionnel' ? sectionsProfessionnels : sectionsParticuliers).map(section => ({
    ...section,
    categories: section.values.map(value => categoriesDevis.find(c => c.value === value)).filter((c): c is { value: string; label: string } => Boolean(c)),
  })).filter(section => section.categories.length > 0)
  const produitsFiltres = produits.filter(p =>
    (p.categorie === filtreCategorie || (filtreCategorie === 'rampants' && p.categorie === 'combles')) &&
    p.catalogue_groupe !== 'visite_technique' &&
    (filtrePublic === 'tous' || p.public_cible === filtrePublic || p.public_cible === 'tous') &&
    (!rechercheProduit.trim() || [p.nom, p.marque, p.reference].some(v => String(v || '').toLowerCase().includes(rechercheProduit.trim().toLowerCase())))
  )

  if (view === 'list') {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Devis</h1>
            <p className="page-subtitle">Devis clients avec calcul automatique des aides mobilisables</p>
          </div>
          <div className="page-actions">
            <Button variant="primary" onClick={() => { setCreationError(''); setQuoteIssuerId('renova_soluces'); setShowNewModal(true) }}>
              <Plus size={18} /> Nouveau devis
            </Button>
          </div>
        </div>

        <section className="dashboard-kpis page-kpi-strip">
          <div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><FileSignature size={19}/></span><span className="dashboard-kpi-main"><strong>{rows.filter(d => d.statut === 'brouillon').length}</strong><span>Brouillons</span></span><span className="dashboard-kpi-note">À finaliser</span></div>
          <div className="dashboard-kpi"><span className="dashboard-kpi-icon blue"><Send size={19}/></span><span className="dashboard-kpi-main"><strong>{rows.filter(d => d.statut === 'envoye').length}</strong><span>Envoyés</span></span><span className="dashboard-kpi-note">En attente</span></div>
          <div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><CheckCircle2 size={19}/></span><span className="dashboard-kpi-main"><strong>{rows.filter(d => d.statut === 'signe').length}</strong><span>Signés</span></span><span className="dashboard-kpi-note">Clients engagés</span></div>
        </section>

        <div className="card">
          {loading ? (
            <div className="card-pad text-muted">Chargement…</div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <FileSignature size={40} />
              <h3>Aucun devis</h3>
              <p>Créez votre premier devis à partir de votre catalogue produits.</p>
              <Button variant="primary" onClick={() => { setCreationError(''); setQuoteIssuerId('renova_soluces'); setShowNewModal(true) }}>
                <Plus size={18} /> Nouveau devis
              </Button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Numéro</th><th>Client</th><th>Statut</th>
                  <th>Montant TTC</th><th>Aides</th><th>Reste à charge</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(d => (
                  <tr key={d.id} onClick={() => ouvrirDevis(d)} style={{ cursor: 'pointer' }}>
                    <td className="font-semibold">
                      {d.numero}
                      {d.devis_parent_id && <span className="badge badge-neutral" style={{ marginLeft: 8, fontSize: 10 }}>Avenant</span>}
                    </td>
                    <td>{d.prospect ? `${d.prospect.prenom} ${d.prospect.nom}` : '—'}</td>
                    <td><span className={`badge ${STATUT_BADGE[d.statut] || 'badge-neutral'}`}>{d.statut}</span></td>
                    <td>{euro(d.montant_ttc)}</td>
                    <td>{euro(d.montant_aides)}</td>
                    <td className="font-semibold">{euro(d.reste_a_charge)}</td>
                    <td className="text-muted">{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal
          open={showNewModal}
          onClose={() => setShowNewModal(false)}
          title="Nouveau devis"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowNewModal(false)}>Annuler</Button>
              <Button variant="primary" onClick={creerDevis} disabled={!newProspectId}>Créer le devis</Button>
            </>
          }
        >
          {creationError && <div className="card card-pad text-sm" style={{ color: '#b91c1c', background: '#fef2f2', marginBottom: 12 }}>{creationError}</div>}
          <FloatSelect
            label="Client"
            value={newProspectId}
            onChange={setNewProspectId}
            options={prospects.map(p => ({ value: p.id, label: `${p.prenom} ${p.nom} — ${p.ville || ''}` }))}
          />
          <div className="mt-4">
            <FloatSelect
              label="Émetteur du devis"
              value={quoteIssuerId}
              onChange={setQuoteIssuerId}
              options={[
                { value: 'renova_soluces', label: entreprise?.raison_sociale || 'Reno Soluces' },
                ...partenairesDevis.map(p => ({ value: p.id, label: p.devis_nom_affichage || p.nom })),
              ]}
            />
            {quoteIssuerId !== 'renova_soluces' && (
              <div className="text-xs text-muted mt-2">
                Le devis sera édité au nom du partenaire autorisé et utilisera ses coordonnées légales et ses CGV enregistrées.
              </div>
            )}
          </div>
        </Modal>
      </div>
    )
  }

  const p = current?.prospect
  const estSigne = current?.signature_statut === 'signe'

  return (
    <div className="page rv">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setView('list')}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="page-title">{current?.numero}</h1>
            <p className="page-subtitle">
              {p ? `${p.prenom} ${p.nom} · ${p.adresse_rue || p.adresse || ''} ${p.code_postal || ''} ${p.ville || ''}` : ''}
            </p>
          </div>
        </div>
        <div className="page-actions">
          {!estSigne && (
            <Button variant="secondary" onClick={enregistrer} disabled={saving}>
              <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          )}
          <Button variant="secondary" onClick={telechargerPDF} disabled={lignes.length === 0}>
            <Download size={16} /> PDF
          </Button>
          {isAdmin && (
            <Button variant="secondary" onClick={supprimerDevis}>
              <Trash2 size={16} /> Supprimer
            </Button>
          )}
          {estSigne && (
            <Button variant="secondary" onClick={creerAvenant} disabled={creatingAvenant}>
              <FilePlus size={16} /> {creatingAvenant ? 'Création…' : 'Créer un avenant'}
            </Button>
          )}
          {!estSigne && (
            <>
              <Button variant="primary" onClick={ouvrirSignature} disabled={saving || lignes.length === 0 || signatureBloquee} title={signatureBloquee ? (nonRentableBloquant ? 'Devis sous le prix plancher : réduisez la remise ou faites valider par la direction' : `${blocsConformite.length} point(s) à corriger avant signature`) : undefined}>
                <PenTool size={16} /> Signer sur tablette
              </Button>
              <Button variant="secondary" onClick={envoyerSignature} disabled={saving || lignes.length === 0 || signatureBloquee} title={signatureBloquee ? (nonRentableBloquant ? 'Devis sous le prix plancher : réduisez la remise ou faites valider par la direction' : `${blocsConformite.length} point(s) à corriger avant envoi`) : undefined}>
                <Send size={16} /> Envoyer pour signature électronique
              </Button>
            </>
          )}
        </div>
      </div>

      {estSigne && (
        <div className="card card-pad mb-4" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--c-primary-50, #eafaf1)' }}>
          <CheckCircle2 size={20} color="#16a34a" />
          <div>
            <div className="font-semibold">Devis signé</div>
            <div className="text-sm text-muted">
              Par {current?.signature_nom_signataire} le {current?.signature_date ? new Date(current.signature_date).toLocaleString('fr-FR') : ''} — signature manuscrite sur tablette
            </div>
          </div>
          <span title="Devis verrouillé, non modifiable" style={{ marginLeft: 'auto' }}>
            <Lock size={16} className="text-muted" />
          </span>
        </div>
      )}

      {devisParent && (
        <div className="card card-pad mb-4 text-sm" style={{ background: 'var(--neutral-50)' }}>
          Avenant n°{current?.numero_avenant} du devis{' '}
          <a onClick={() => ouvrirDevis(devisParent)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{devisParent.numero}</a>
        </div>
      )}

      {avenants.length > 0 && (
        <div className="card card-pad mb-4">
          <div className="section-label">Avenants de ce devis</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {avenants.map(av => (
              <div key={av.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => ouvrirDevis(av as any)}>
                <span className="font-semibold">{av.numero}</span>
                <span className={`badge ${STATUT_BADGE[av.statut] || 'badge-neutral'}`}>{av.statut}</span>
                <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>{euro(av.montant_ttc)} TTC</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {profilMPR ? (
        <div className="card card-pad mb-4" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span className="badge badge-info">Profil MaPrimeRénov' : {LABEL_PROFIL[profilMPR]}</span>
          <span className="text-sm text-muted">RFR {euro(p?.rfr)} · {p?.nombre_personnes_foyer} personne(s) · {p?.zone_ile_de_france ? 'Île-de-France' : 'Hors Île-de-France'}</span>
        </div>
      ) : (
        <div className="card card-pad mb-4 text-sm text-muted">
          Renseignez le revenu fiscal de référence et la composition du foyer sur la fiche prospect pour calculer les aides selon le profil de revenus.
        </div>
      )}

      <div className="devis">
        <div className="stack">
          <section className="panel">
            <h2 className="rv-h">Client</h2>
            <div className="grid g2">
              <label className="lab">Nom du client<input readOnly value={p ? `${p.civilite || ''} ${p.prenom || ''} ${p.nom || ''}`.trim() : ''} /></label>
              <label className="lab">Téléphone<input readOnly value={p?.telephone || ''} /></label>
              <label className="lab">Adresse du client<input readOnly value={[p?.adresse_rue || p?.adresse, p?.code_postal, p?.ville].filter(Boolean).join(' ')} /></label>
              <label className="lab">E-mail<input readOnly value={p?.email || ''} /></label>
            </div>
            <p className="note" style={{ margin: '8px 0 0' }}>Ces informations proviennent de la fiche prospect : modifiez-les depuis le prospect.</p>
          </section>

          <SectionsConformite
            meta={conf}
            onChange={maj => setConf(maj)}
            points={pointsConformite}
            disabled={estSigne}
            fichesDuDevis={fichesDuDevis}
            categorieRevenusLabel={categorieRevenus ? LABEL_CATEGORIE_REVENUS[categorieRevenus] : null}
          />

          <section className="panel">
            <h2 className="rv-h">Produits et prestations</h2>
            {lignes.length === 0 ? (
              <p className="note" style={{ margin: '0 0 12px' }}>Aucune ligne. Ajoutez des produits depuis le catalogue ci-dessous.</p>
            ) : (
              <div className="scroll">
                <table className="lines">
                  <colgroup><col style={{ width: isAdmin ? '27%' : '31%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '8%' }} />{isAdmin && <col style={{ width: '10%' }} />}<col style={{ width: '7%' }} /><col style={{ width: '12%' }} /><col style={{ width: '4%' }} /></colgroup>
                  <thead><tr><th>Produit</th><th>Marque</th><th>Référence</th><th>Qté</th>{isAdmin && <th>PU HT</th>}<th>TVA</th><th>Total HT</th><th></th></tr></thead>
                  <tbody>
                    {lignesAvecCategorie.map((l, index) => {
                      const fiche = l.produit_id ? ficheLigne(l) : null
                      const marqueBad = pointsConformite.some(x => x.ligneId === l.id && x.champ === 'marque')
                      const refBad = pointsConformite.some(x => x.ligneId === l.id && x.champ === 'reference')
                      const visibles = Object.entries(l.caracteristiques || {}).filter(([k]) => !['Marque', 'Référence'].includes(k) && !CLES_AUTO_ISOLATION.includes(k) && !(fiche && REGLES_FICHES[fiche]?.verifiee && estChampDeFiche(fiche, k)))
                      return (
                        <Fragment key={l.id}>
                          {(index === 0 || familleCategorie(l.categorie) !== familleCategorie(lignesAvecCategorie[index - 1]?.categorie || 'autre')) && (
                            <tr className="famrow"><td colSpan={isAdmin ? 8 : 7}>{libelleFamilleCategorie(l.categorie)}</td></tr>
                          )}
                          {(index === 0 || l.categorie !== lignesAvecCategorie[index - 1]?.categorie) && (
                            <tr className="famrow"><td colSpan={isAdmin ? 8 : 7}>{libelleSousCategorie(l.categorie)}</td></tr>
                          )}
                          <tr>
                            <td>
                              <div className="pn">{l.designation}
                                <small>
                                  {fiche && <><span className="pill">{fiche}</span>{' '}</>}
                                  {l.produit_id && aides.some(a => a.type === 'maprimerenov') && produits.find(x => x.id === l.produit_id)?.eligible_mpr && <><span className="pill g">MaPrimeRénov’</span>{' '}</>}
                                  {l.description}
                                </small>
                              </div>
                              {visibles.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{visibles.map(([k, v]) => <span key={k} className="pill n">{k} : {String(v)}</span>)}</div>}
                            </td>
                            <td className={marqueBad ? 'bad' : ''}>{l.produit_id ? <input className="cell" placeholder="Marque" disabled={estSigne} value={String(l.caracteristiques?.Marque || '')} onChange={e => updateLigne(l.id, { caracteristiques: { ...(l.caracteristiques || {}), Marque: e.target.value } })} /> : null}</td>
                            <td className={refBad ? 'bad' : ''}>{l.produit_id ? <input className="cell" placeholder="Référence" disabled={estSigne} value={String(l.caracteristiques?.Référence || '')} onChange={e => updateLigne(l.id, { caracteristiques: { ...(l.caracteristiques || {}), Référence: e.target.value } })} /> : null}</td>
                            <td><input className="cell n" type="number" min={0} step="0.01" disabled={estSigne} value={l.quantite} onChange={e => updateLigne(l.id, { quantite: parseFloat(e.target.value) || 0 })} /></td>
                            {isAdmin && <td>{(() => {
                              const pr = l.produit_id ? produitsParId.get(l.produit_id) : undefined
                              const sous = !!pr?.prix_plancher_ht && l.prix_unitaire_ht < Number(pr.prix_plancher_ht) - 0.005
                              return <>
                                <input className={`cell n${sous ? ' sous-plancher' : ''}`} type="number" min={0} step="0.01" disabled={estSigne} value={l.prix_unitaire_ht} onChange={e => updateLigne(l.id, { prix_unitaire_ht: parseFloat(e.target.value) || 0 })} title={pr?.prix_plancher_ht ? `Conseillé ${euro(Number(pr.prix_conseille_ht) || 0)} · plancher ${euro(Number(pr.prix_plancher_ht))}` : undefined} />
                                {pr?.prix_conseille_ht ? <div className={`cell-aide${sous ? ' alerte' : ''}`}>{sous ? 'Sous plancher' : `Conseillé ${euro(Number(pr.prix_conseille_ht))}`}</div> : null}
                              </>
                            })()}</td>}
                            <td className="nw num">{l.tva_taux} %</td>
                            <td className="nw num"><strong>{euro(l.montant_ht)}</strong></td>
                            <td>{!estSigne && <button className="iconbtn" title="Retirer la ligne" onClick={() => removeLigne(l.id)}><Trash2 size={15} /></button>}</td>
                          </tr>
                          {fiche && (
                            <tr><td colSpan={isAdmin ? 8 : 7} style={{ paddingTop: 0 }}>
                              <LigneFicheFields
                                fiche={fiche}
                                caracteristiques={l.caracteristiques}
                                contexte={{ categorie: l.categorie, description: l.description, quantite: l.quantite }}
                                disabled={estSigne}
                                onChange={car => updateLigne(l.id, { caracteristiques: car })}
                              />
                            </td></tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!estSigne && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--rv-line)', paddingTop: 14 }}>
                <div className="toolbar" style={{ marginTop: 0 }}>
                  <div className="chips">
                    {([['particulier', 'Particuliers'], ['professionnel', 'Professionnels']] as const).map(([value, label]) => (
                      <button key={value} className="chip" aria-pressed={filtrePublic === value} onClick={() => { setFiltrePublic(value); setFiltreCategorie(value === 'professionnel' ? 'hp_flottante' : 'combles_perdus'); setRechercheProduit('') }}>{label}</button>
                    ))}
                  </div>
                  <div className="spacer" />
                  <button className="rbtn sm" onClick={() => { setAssistantError(''); setAssistantSuggestions([]); setAssistantOpen(true) }}><Sparkles size={14} /> Assistant</button>
                </div>
                {sectionsCatalogue.map(section => (
                  <div key={section.label} className="fam">
                    <b>{section.label}</b>
                    <div className="chips">{section.categories.map(c => (
                      <button key={c.value} className="chip" aria-pressed={filtreCategorie === c.value} onClick={() => setFiltreCategorie(c.value)}>
                        {c.label}<small>{produits.filter(x => (x.categorie === c.value || (c.value === 'rampants' && x.categorie === 'combles')) && x.catalogue_groupe !== 'visite_technique').length}</small>
                      </button>
                    ))}</div>
                  </div>
                ))}
                <div className="toolbar">
                  <span style={{ position: 'relative', display: 'inline-flex', flex: 1, maxWidth: 380 }}>
                    <Search size={15} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--rv-mute)' }} />
                    <input className="search" style={{ paddingLeft: 32, width: '100%' }} value={rechercheProduit} onChange={e => setRechercheProduit(e.target.value)} placeholder="Rechercher un produit, une marque, une référence…" />
                  </span>
                  <span className="note">{produitsFiltres.length} référence{produitsFiltres.length > 1 ? 's' : ''}</span>
                </div>
                <div className="scroll">
                  <table className="cat">
                    <thead><tr><th>Produit</th><th>Fiche</th>{isAdmin && <th>Prix HT</th>}<th>TVA</th><th></th></tr></thead>
                    <tbody>
                      {produitsFiltres.map(prod => {
                        const f = ficheDuProduit(prod)
                        return (
                          <tr key={prod.id} className="row">
                            <td><div className="pn">{prod.nom}<small>{[prod.marque, prod.reference].filter(Boolean).join(' · ') || prod.unite}</small></div></td>
                            <td>{f ? <span className="pill">{f}</span> : <span className="pill n">Hors CEE</span>}{prod.eligible_mpr && <> <span className="pill g">MaPrimeRénov’</span></>}</td>
                            {isAdmin && <td className="num">{euro(prixProduitPourZone(prod, current?.prospect?.code_postal))} / {prod.unite}</td>}
                            <td className="num">{prod.tva_taux} %</td>
                            <td style={{ textAlign: 'right' }}><button className="rbtn sm pri" onClick={() => ajouterProduit(prod)}><Plus size={14} /> Ajouter</button></td>
                          </tr>
                        )
                      })}
                      {produitsFiltres.length === 0 && <tr><td colSpan={isAdmin ? 5 : 4} className="note" style={{ padding: 22 }}>Aucun produit actif dans cette catégorie. Ajoutez-en depuis le Catalogue.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <h2 className="rv-h" style={{ margin: 0 }}>Aides</h2>
              {!estSigne && <div style={{ display: 'flex', gap: 6 }}>
                <button className="rbtn sm" onClick={() => ajouterAideManuelle('anah_ampleur')}>+ Anah</button>
                <button className="rbtn sm" onClick={() => ajouterAideManuelle('eco_ptz')}>+ Éco-PTZ</button>
              </div>}
            </div>
            {aides.length === 0 ? (
              <p className="note" style={{ margin: 0 }}>Aucune aide ajoutée. Les aides éligibles sont proposées automatiquement à l'ajout d'un produit du catalogue.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {aides.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{a.libelle}</span>
                    <label className="lab" style={{ width: 130 }}>
                      <div className="u"><input type="number" value={a.montant} disabled={estSigne} onChange={e => setAides(as => as.map(x => x.id === a.id ? { ...x, montant: parseFloat(e.target.value) || 0 } : x))} /><span>€</span></div>
                    </label>
                    {!estSigne && <button className="iconbtn" onClick={() => removeAide(a.id)} title="Retirer l’aide"><Trash2 size={15} /></button>}
                  </div>
                ))}
              </div>
            )}
            {aMontantCEE && (
              <div className="grid g2" style={{ marginTop: 12 }}>
                <label className={`lab ${pointsConformite.some(x => x.champ === 'oblige') ? 'bad' : ''}`}>Obligé ou délégataire CEE
                  <input disabled={estSigne} value={conf.oblige} onChange={e => setConf(m => ({ ...m, oblige: e.target.value }))} />
                </label>
              </div>
            )}
            <p className="note" style={{ margin: '12px 0 0' }}>
              {filtreCategorie === 'combles_perdus' ? 'Combles perdus — barème Reno Soluces 2026 : MaPrimeRénov’ Bleu 25 €/m², Jaune 20 €/m², Violet 15 €/m², Rose non éligible en geste seul ; CEE BAR-EN-101 : Bleu 13 €/m², autres profils 10 €/m². Les montants sont calculés sur la quantité des lignes de produits combles perdus.' : filtreCategorie === 'rampants' || filtreCategorie === 'combles' ? 'Rampants / sarking — prime CEE calculée séparément sur la surface des isolants rampants éligibles (R ≥ 6 m²·K/W), hors injection/écobilles et prestations annexes. Barème CEE : Bleu 13 €/m² ; Jaune, Violet et Rose 10 €/m². Vérifier la résistance thermique et la conformité de la solution réellement posée.' : filtreCategorie === 'ite' ? 'ITE — barème CEE Reno Soluces : Bleu 12 €/m² ; Jaune, Violet et Rose 8 €/m². Le calcul suit la quantité des lignes d’isolant ITE et exclut l’échafaudage et l’enduit.' : `Pour les autres gestes, les montants CEE sont estimatifs selon le taux configuré (${tauxCEE} €/MWh cumac) et doivent être confirmés avec le délégataire.`}
            </p>
          </section>

          <section className="panel">
            <h2 className="rv-h">Remise et conditions de vente</h2>
            <div className="grid g3">
              <label className="lab">Type de remise
                <select value={remiseType} onChange={e => setRemiseType(e.target.value as RemiseType)} disabled={estSigne}>
                  <option value="montant">Montant (€ HT)</option>
                  <option value="pourcentage">Pourcentage (%)</option>
                </select>
              </label>
              <label className="lab">{remiseType === 'montant' ? 'Remise (€ HT)' : 'Remise (%)'}
                <input type="number" min={0} max={remiseType === 'pourcentage' ? 100 : undefined} step="0.01" value={remiseValeur || ''} onChange={e => setRemiseValeur(Math.max(0, parseFloat(e.target.value) || 0))} disabled={estSigne} placeholder="0" />
              </label>
              <label className="lab">Date de validité du devis
                <input type="date" value={current?.date_validite ? current.date_validite.slice(0, 10) : ''} onChange={e => setCurrent(c => c ? { ...c, date_validite: e.target.value || null } : c)} disabled={estSigne} />
              </label>
            </div>
            {rentabilite.analysable && lignes.length > 0 && (
              <div className={`rentab rentab-${rentabilite.niveau}`} role={rentabilite.niveau === 'non_rentable' ? 'alert' : 'status'}>
                <div className="rentab-tete">
                  <span className="rentab-pastille" aria-hidden="true" />
                  <b>{rentabilite.niveau === 'non_rentable' ? 'Devis non rentable' : rentabilite.niveau === 'sous_conseille' ? 'Sous le prix conseillé' : 'Devis rentable'}</b>
                  <span className="rentab-jauge" aria-hidden="true">
                    <span style={{ width: `${Math.max(4, Math.min(100, rentabilite.conseilleHT > rentabilite.plancherHT ? ((rentabilite.montantHT - rentabilite.plancherHT) / (rentabilite.conseilleHT - rentabilite.plancherHT)) * 100 : 100))}%` }} />
                  </span>
                </div>
                <div className="rentab-chiffres">
                  <div><span>Total HT</span><b className="num">{euro(rentabilite.montantHT)}</b></div>
                  <div><span>Prix conseillé</span><b className="num">{euro(rentabilite.conseilleHT)}</b></div>
                  <div><span>Prix plancher</span><b className="num">{euro(rentabilite.plancherHT)}</b></div>
                  <div><span>{rentabilite.niveau === 'non_rentable' ? 'Manque' : 'Remise encore possible'}</span><b className="num">{euro(rentabilite.niveau === 'non_rentable' ? rentabilite.ecartPlancherHT : rentabilite.remiseMaxRestanteHT)}</b></div>
                </div>
                <p className="rentab-msg">
                  {rentabilite.niveau === 'non_rentable'
                    ? <>Le total est {euro(rentabilite.ecartPlancherHT)} sous le prix plancher. {isAdmin ? (totaux.remiseHT > 0 ? 'Vous pouvez le valider en connaissance de cause.' : 'Les prix du catalogue sont sous le plancher : corrigez-les dans Catalogue → Tarification.') : totaux.remiseHT > 0 ? 'Réduisez la remise : la signature est bloquée tant que la direction n’a pas validé ce prix.' : 'Les prix catalogue de ce produit sont à revoir : la direction est informée.'}</>
                    : rentabilite.niveau === 'sous_conseille'
                      ? <>Le devis reste rentable, mais la marge est entamée. Remise encore possible : {euro(rentabilite.remiseMaxRestanteHT)} HT.</>
                      : <>Prix conforme au tarif conseillé. Remise encore possible avant le plancher : {euro(rentabilite.remiseMaxRestanteHT)} HT.</>}
                </p>
                {isAdmin && rentabilite.lignesSousPlancher.length > 0 && (
                  <ul className="rentab-lignes">
                    {rentabilite.lignesSousPlancher.map((l, i) => <li key={i}>{l.designation} : {euro(l.prix)} pour un plancher de {euro(l.plancher)}</li>)}
                  </ul>
                )}
              </div>
            )}
            <label className="lab" style={{ marginTop: 14 }}>Conditions de paiement
              <textarea rows={2} value={current?.conditions_paiement || ''} onChange={e => setCurrent(c => c ? { ...c, conditions_paiement: e.target.value } : c)} disabled={estSigne} />
            </label>
          </section>
        </div>

        <div className="side">
          <ConformitePanel points={pointsConformite} verrouille={estSigne} />
          <article className="sheet" aria-label="Aperçu du devis">
            <div className="hd">
              <div><h3>DEVIS</h3><div className="co">N° {current?.numero || '—'} · {current?.created_at ? new Date(current.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')} · valable jusqu’au {current?.date_validite ? new Date(`${current.date_validite.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR') : 'à définir'}</div></div>
              <div style={{ textAlign: 'right' }}>
                <b style={{ fontSize: 14 }}>{current?.emetteur_nom_affichage || entreprise?.raison_sociale || 'Reno Soluces'}</b>
                <div className="co">{(current?.emetteur_siret || entreprise?.siret) ? `SIRET ${current?.emetteur_siret || entreprise?.siret}` : <span className="ph">SIRET à renseigner</span>}<br />
                  {fichesDuDevis.length > 0 && <>RGE n° {conf.pro.rge ? `${conf.pro.rge} · ${conf.pro.organisme}` : <span className="ph">à renseigner</span>}<br /></>}
                  {current?.emetteur_telephone || entreprise?.telephone || ''} · {current?.emetteur_email || entreprise?.email || ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div><b>Client</b><br />{p ? `${p.prenom || ''} ${p.nom || ''}`.trim() : 'Client à renseigner'}<br />{p?.adresse_rue || p?.adresse || ''}<br />{[p?.code_postal, p?.ville].filter(Boolean).join(' ')}<br />{p?.telephone || ''}{p?.email ? ` · ${p.email}` : ''}</div>
              <div style={{ textAlign: 'right' }}><b>Chantier</b><br />{p?.adresse_rue || p?.adresse || 'Adresse à renseigner'}<br />{conf.logement.type}{conf.logement.annee ? `, construit en ${conf.logement.annee}` : ''}{conf.logement.zone ? `, zone ${conf.logement.zone}` : ''}</div>
            </div>
            <table><thead><tr><th>Désignation</th><th className="r">Qté</th><th className="r">PU HT</th><th className="r">TVA</th><th className="r">Total HT</th></tr></thead><tbody>
              {lignesAvecCategorie.map((l, index) => (
                <Fragment key={l.id}>
                  {(index === 0 || familleCategorie(l.categorie) !== familleCategorie(lignesAvecCategorie[index - 1]?.categorie || 'autre')) && <tr className="famrow"><td colSpan={5}>{libelleFamilleCategorie(l.categorie)}</td></tr>}
                  {(index === 0 || l.categorie !== lignesAvecCategorie[index - 1]?.categorie) && <tr className="famrow"><td colSpan={5}>{libelleSousCategorie(l.categorie)}</td></tr>}
                  <tr>
                    <td><b>{l.designation}</b>
                      {l.produit_id && <div className="spec">Marque : {l.caracteristiques?.Marque ? String(l.caracteristiques.Marque) : <span className="ph">à renseigner</span>} · Réf. : {l.caracteristiques?.Référence ? String(l.caracteristiques.Référence) : <span className="ph">à renseigner</span>}</div>}
                      {(() => {
                        const f = l.produit_id ? ficheLigne(l) : null
                        const specs = [
                          ...libellesFiche(f, l.caracteristiques, { categorie: l.categorie, description: l.description, quantite: l.quantite }),
                          ...Object.entries(l.caracteristiques || {}).filter(([k]) => !['Marque', 'Référence'].includes(k) && !CLES_AUTO_ISOLATION.includes(k) && !(f && REGLES_FICHES[f]?.verifiee && estChampDeFiche(f, k))).map(([k, v]) => `${k} : ${String(v)}`),
                        ]
                        return specs.length > 0 ? <div className="spec">{specs.join(' · ')}</div> : null
                      })()}
                      {l.produit_id && ficheLigne(l) && <div className="spec">Opération CEE {ficheLigne(l)}</div>}
                    </td>
                    <td className="r">{l.quantite}</td><td className="r">{euro(l.prix_unitaire_ht)}</td><td className="r">{l.tva_taux} %</td><td className="r">{euro(l.montant_ht)}</td>
                  </tr>
                </Fragment>
              ))}
              {lignes.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#8a97a0', padding: 22 }}>Les produits ajoutés apparaîtront ici.</td></tr>}
            </tbody></table>
            <div className="tot">
              {totaux.remiseHT > 0 && <div><span>Total HT avant remise</span><span className="num">{euro(totaux.montantHTAvantRemise)}</span></div>}
              {totaux.remiseHT > 0 && <div><span>Remise commerciale</span><span className="num">− {euro(totaux.remiseHT)}</span></div>}
              <div><span>Total HT</span><span className="num">{euro(totaux.montantHT)}</span></div>
              <div><span>TVA</span><span className="num">{euro(totaux.montantTVA)}</span></div>
              <div className="big"><span>Total TTC</span><span className="num">{euro(totaux.montantTTC)}</span></div>
              {aides.filter(a => a.montant > 0).map(a => <div key={a.id}><span>{a.libelle}</span><span className="num">− {euro(a.montant)}</span></div>)}
              {totalAides > 0 && <div className="big"><span>Reste à charge</span><span className="num">{euro(resteACharge)}</span></div>}
            </div>
            <div className="leg">
              Visite préalable le {conf.dates.visite ? new Date(`${conf.dates.visite}T12:00:00`).toLocaleDateString('fr-FR') : '…'}. Début des travaux {conf.dates.debut ? new Date(`${conf.dates.debut}T12:00:00`).toLocaleDateString('fr-FR') : '…'}, durée {conf.dates.duree || '…'}. Acompte de {conf.dates.acompte || '…'} %{conf.venteHorsEtablissement ? ', après expiration du délai de rétractation de 14 jours (formulaire joint)' : ''}. Pénalités de retard et indemnité forfaitaire de 40 €. Garanties légales : parfait achèvement, biennale, décennale ({conf.pro.assurance || <span className="ph">assureur à renseigner</span>}).
              {current?.conditions_paiement ? <><br />Conditions de paiement : {current.conditions_paiement}</> : null}
              <div className="sign"><div><b>Bon pour accord</b>, date et signature du client</div><div>Pour l’entreprise</div></div>
            </div>
          </article>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="rbtn" onClick={telechargerPDF} disabled={lignes.length === 0}><Download size={15} /> Générer le PDF</button>
            <button className="rbtn pri" onClick={enregistrer} disabled={saving || estSigne}><Save size={15} />{saving ? 'Enregistrement…' : 'Enregistrer le devis'}</button>
          </div>
        </div>
      </div>

      <Modal
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        title="Assistant de création de devis"
        width={760}
        footer={<><Button variant="secondary" onClick={() => setAssistantOpen(false)}>Fermer</Button><Button variant="primary" onClick={() => void proposerLignesAssistantes()} disabled={assistantLoading}>{assistantLoading ? 'Analyse…' : <><Sparkles size={15}/> Proposer des lignes</>}</Button></>}
      >
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <p className="text-sm text-muted">Décrivez la demande du client et joignez des photos si besoin. L’assistant sélectionne uniquement des références du catalogue ; les prix restent ceux du catalogue ou ceux que vous modifierez ensuite.</p>
          <label className="field"><span>Demande du client</span><textarea className="input" rows={4} value={assistantDescription} onChange={e=>setAssistantDescription(e.target.value)} placeholder="Ex. : maison de 110 m², chauffage au fioul, souhaite remplacer la chaudière par une PAC air/eau…"/></label>
          <label className="field"><span>Photos (façade, équipement existant, étiquette technique…)</span><input className="input" type="file" accept="image/*" multiple onChange={e=>setAssistantPhotos(Array.from(e.target.files||[]))}/><span className="text-xs text-muted">{assistantPhotos.length ? `${assistantPhotos.length} photo(s) sélectionnée(s)` : 'Aucune photo sélectionnée'}</span></label>
          {assistantError && <div className="card card-pad text-sm" style={{color:'#b91c1c'}}>{assistantError}</div>}
          {assistantSuggestions.length > 0 && <div style={{display:'flex',flexDirection:'column',gap:8}}><strong>Produits proposés</strong>{assistantSuggestions.map(suggestion=>{const prod=produits.find(x=>x.id===suggestion.product_id);if(!prod)return null;return <div key={suggestion.product_id} className="recap-card" style={{padding:12,display:'flex',gap:12,alignItems:'center'}}><div style={{flex:1}}><div className="font-semibold">{prod.nom}</div><div className="text-sm text-muted">{suggestion.justification}</div><div className="text-sm">Prix catalogue : {euro(prixProduitPourZone(prod,p?.code_postal))} HT / {prod.unite} · Quantité suggérée : {suggestion.quantite}</div></div><Button size="sm" variant="primary" disabled={estSigne} onClick={()=>{ajouterProduit(prod,suggestion.quantite);setAssistantSuggestions(prev=>prev.filter(x=>x.product_id!==suggestion.product_id))}}><Plus size={14}/> Ajouter</Button></div>})}</div>}
          <p className="text-xs text-muted">Si la fonction d’analyse n’est pas configurée, il faudra renseigner la clé OPENAI_API_KEY dans les secrets Supabase. Aucune valeur de prix n’est transmise à l’assistant.</p>
        </div>
      </Modal>

      <SignatureSurPlace
        open={showSignatureModal}
        onClose={() => { if (!signing) setShowSignatureModal(false) }}
        numero={current?.numero || ''}
        client={p ? `${p.prenom || ''} ${p.nom || ''}`.trim() : ''}
        emailClient={p?.email || null}
        lignes={lignesAvecCategorie.map(l => ({ designation: l.designation, quantite: Number(l.quantite) || 0, montant_ht: Number(l.montant_ht) || 0 }))}
        totalHT={totaux.montantHT}
        totalTTC={totaux.montantTTC}
        remiseHT={totaux.remiseHT}
        aides={aides.filter(a => a.montant > 0).map(a => ({ libelle: a.libelle, montant: a.montant }))}
        resteACharge={resteACharge}
        cgv={current?.emetteur_cgv || entreprise?.conditions_generales_devis || ''}
        horsEtablissement={conf.venteHorsEtablissement}
        nomParDefaut={p ? `${p.prenom || ''} ${p.nom || ''}`.trim() : ''}
        onSigner={validerSignature}
        onTelecharger={telechargerPDF}
      />
    </div>
  )
}
