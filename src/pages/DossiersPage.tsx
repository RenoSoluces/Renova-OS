import { useEffect, useRef, useState } from 'react'
import { alertesDossier, etapesDossier, type Aide } from '../lib/dossiers/suiviAides'
import { SuiviAidesPanel } from '../components/dossiers/SuiviAidesPanel'
import {
  Plus,
  FolderOpen,
  CheckCircle2,
  Clock,
  Wallet,
  FileText,
  Check,
  Upload,
  ExternalLink,
  Loader2,
  Trash2,
  Euro,
  PlusCircle,
  Receipt,
  CalendarCheck2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import type { Dossier, Prospect, Devis, Document as DocumentPiece, DossierFacturation } from '../types'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { FloatInput, FloatSelect } from '../components/ui/FloatInput'
import { uploadDocument } from '../lib/storage/uploadDocument'
import { removeDocumentStorageObject, resolveDocumentRows, resolveDocumentUrl } from '../lib/storage/documentUrl'
import { logAuditEvent } from '../lib/auditLog'
import { setProspectStatus } from '../lib/crm/workflow'
import { lireTout } from '../lib/lireTout'
import { PARCOURS_CEE, etapeParcours, indexEtape, libelleParcours } from '../lib/dossiers/parcoursCee'
import { genererFacturePartenairePDF } from '../lib/pdf/genererFacturePartenairePDF'
import { numeroDevis } from '../lib/devis/numeroDevis'
import { useNomEntreprise } from '../lib/organisation/useNomEntreprise'

const STATUT_BADGE: Record<string, string> = {
  en_cours: 'badge-info',
  cours: 'badge-info',
  creation: 'badge-info',
  signe: 'badge-success',
  accepte: 'badge-success',
  installation: 'badge-info',
  installe: 'badge-success',
  refuse: 'badge-error',
  annule: 'badge-error',
  attente: 'badge-warning',
  en_attente: 'badge-warning',
}

const STATUTS_DOSSIER = [
  { value: 'creation', label: 'En création' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'attente', label: 'En attente de pièces' },
  { value: 'signe', label: 'Signé' },
  { value: 'accepte', label: 'Accepté (aides validées)' },
  { value: 'installation', label: 'Installation' },
  { value: 'installe', label: 'Installé' },
  { value: 'refuse', label: 'Refusé' },
]

const COLONNES_DOSSIER = [
  { id: 'creation', label: 'Création', couleur: '#3FA3A1', statuts: ['creation', 'en_cours', 'attente', 'en_attente'] },
  { id: 'signe', label: 'Signé', couleur: '#C98A5E', statuts: ['signe', 'accepte'] },
  { id: 'installation', label: 'Installation', couleur: '#A4562A', statuts: ['installation'] },
  { id: 'installe', label: 'Installé', couleur: '#0F5C5E', statuts: ['installe'] },
  { id: 'refuse', label: 'Refusé', couleur: '#8A9A9C', statuts: ['refuse'] },
]

const ETAPES_FRISE = [
  { label: 'Création', statuts: ['creation', 'en_cours', 'attente', 'en_attente'] },
  { label: 'Signé', statuts: ['signe', 'accepte'] },
  { label: 'Installation', statuts: ['installation'] },
  { label: 'Installé', statuts: ['installe'] },
]

interface DossiersPageProps {
  initialProspectId?: string | null
  onInitialProspectHandled?: () => void
}

type DossierAvecRelations = Dossier & {
  prospect?: Prospect
}
type OrganisationOption = { id: string; nom: string; type: string }

export function DossiersPage({
  initialProspectId,
  onInitialProspectHandled,
}: DossiersPageProps = {}) {
  const { profile } = useAuth()
  const nomEntreprise = useNomEntreprise()
  const isAdmin =
    profile?.role === 'admin' || profile?.role === 'manager'
  const canViewCompanyCommission = isAdmin || ['super_admin', 'partner_admin', 'company_admin'].includes(profile?.role || '')

  const [rows, setRows] = useState<DossierAvecRelations[]>([])
  const [vue, setVue] = useState<'liste' | 'pipeline'>(() => {
    try { return localStorage.getItem('renova.dossiers.vue') === 'liste' ? 'liste' : 'pipeline' } catch { return 'pipeline' }
  })
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const [messagePipeline, setMessagePipeline] = useState('')
  const changerVue = (v: 'liste' | 'pipeline') => {
    setVue(v)
    try { localStorage.setItem('renova.dossiers.vue', v) } catch { /* stockage indisponible */ }
  }
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)

  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newProspectId, setNewProspectId] = useState('')
  const [devisDuProspect, setDevisDuProspect] = useState<Devis[]>([])
  const [newDevisId, setNewDevisId] = useState('')
  const [creating, setCreating] = useState(false)

  const [detail, setDetail] = useState<DossierAvecRelations | null>(null)
  const [pieces, setPieces] = useState<DocumentPiece[]>([])
  const [signatureDevisDetail, setSignatureDevisDetail] = useState<string | null>(null)
  const [piecesParDossier, setPiecesParDossier] = useState<Record<string, any[]>>({})
  const [detailStatut, setDetailStatut] = useState('')
  const [detailDateInstallation, setDetailDateInstallation] = useState('')
  const [savingStatut, setSavingStatut] = useState(false)
  const [detailMessage, setDetailMessage] = useState('')
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([])
  const [installateursDossier, setInstallateursDossier] = useState<{ id: string; nom: string }[]>([])
  const [savingInstallateur, setSavingInstallateur] = useState(false)
  const [detailFacturationOrganisationId, setDetailFacturationOrganisationId] = useState('')
  const [detailDestinataireOrganisationId, setDetailDestinataireOrganisationId] = useState('')
  const [savingFacturationConfig, setSavingFacturationConfig] = useState(false)

  const [deletingDossier, setDeletingDossier] = useState(false)
  const [facturation, setFacturation] = useState<DossierFacturation[]>([])
  const [factureForm, setFactureForm] = useState({ libelle: 'Prestation partenaire', montant_ht: '', taux_tva: '20', declencheur: 'installation' })
  const [factureSaving, setFactureSaving] = useState(false)
  const [editingFacturationId, setEditingFacturationId] = useState<string | null>(null)

  const [uploadingPieceId, setUploadingPieceId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [addingPiece, setAddingPiece] = useState(false)
  const extraFileInputRef = useRef<HTMLInputElement>(null)

  // Nom de l'apporteur d'affaires du prospect (affiché sur la fiche dossier).
  const [apporteurNom, setApporteurNom] = useState<string | null>(null)

  // Saisie manuelle (dossiers anciens / importés sans devis signé) : montant chantier + commissions.
  const [saisieFin, setSaisieFin] = useState({ montant: '', societe: '', commercial: '' })
  const [saisieFinSaving, setSaisieFinSaving] = useState(false)
  const [saisieFinMessage, setSaisieFinMessage] = useState('')

  // Filtres de la liste / du pipeline
  const [recherche, setRecherche] = useState('')
  const [filtreEtape, setFiltreEtape] = useState('')
  const [filtrePersonne, setFiltrePersonne] = useState('')
  const [filtreParcours, setFiltreParcours] = useState('')
  const [parcoursSaving, setParcoursSaving] = useState(false)
  // « En cours » masque les dossiers entièrement soldés ; ils restent toujours accessibles (Terminés / Tous / recherche).
  const [affichage, setAffichage] = useState<'actifs' | 'termines' | 'tous'>('actifs')
  const [lignesFacturation, setLignesFacturation] = useState<Record<string, { statut: string; ht: number }[]>>({})
  const [commissionsSoldees, setCommissionsSoldees] = useState<Record<string, boolean>>({})
  const [personnes, setPersonnes] = useState<{ id: string; nom_complet: string }[]>([])
  useEffect(() => {
    supabase.from('profiles').select('id,nom_complet,role').in('role', ['commercial', 'manager', 'admin', 'apporteur']).order('nom_complet')
      .then(({ data }) => setPersonnes((data || []).filter((x: any) => !/reno\s*soluces/i.test(x.nom_complet || '')) as any))
  }, [])

  const [commissionsParDevis, setCommissionsParDevis] = useState<
    Record<string, { montant_commercial: number; montant_societe: number }>
  >({})

  const apporteurId = (detail as any)?.prospect?.apporteur_user_id as string | undefined
  useEffect(() => {
    let annule = false
    setApporteurNom(null)
    if (!apporteurId) return
    supabase.from('profiles').select('nom_complet').eq('id', apporteurId).maybeSingle()
      .then(({ data }) => { if (!annule) setApporteurNom(data?.nom_complet || null) })
    return () => { annule = true }
  }, [apporteurId])

  // Rechargement discret : la liste reste affichée (et la position conservée) pendant la mise à jour.
  function fetchListe() {

    supabase
      .from('dossiers')
      .select('*, prospect:prospects(*)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur chargement dossiers:', error)
          setRows([])
          setLoading(false)
          return
        }

        setRows((data || []) as DossierAvecRelations[])
        setLoading(false)
      })

    // Pièces de tous les dossiers, pour signaler ceux qui ont une alerte d'aide (pièce, échéance).
    supabase.from('documents').select('dossier_id,type,nom,recu,url,obligatoire,etape,demande_le').not('dossier_id', 'is', null).limit(10000)
      .then(({ data }) => {
        const parDossier: Record<string, any[]> = {}
        for (const doc of data || []) (parDossier[(doc as any).dossier_id] ||= []).push(doc)
        setPiecesParDossier(parDossier)
      })

    lireTout<{ dossier_id: string; statut: string; montant_ht: number | null }>(() => supabase.from('dossier_facturation').select('dossier_id,statut,montant_ht').order('id'))
      .then(({ data }) => {
        const par: Record<string, { statut: string; ht: number }[]> = {}
        for (const f of data || []) (par[f.dossier_id] ||= []).push({ statut: f.statut, ht: Number(f.montant_ht) || 0 })
        setLignesFacturation(par)
      })

    // La commission d'un dossier est celle générée automatiquement (barème)
    // au moment de la signature du devis qui lui est associé.
    supabase
      .from('commissions_safe')
      .select('reference_id, montant_commercial, montant_societe, statut, date_paiement_commercial, date_paiement_societe')
      .in('reference_type', ['devis', 'dossiers'])
      .then(async ({ data, error }) => {
        if (error) {
          console.error('Erreur chargement commissions des dossiers:', error)
          return
        }

        const map: Record<string, { montant_commercial: number; montant_societe: number }> = {}
        const soldees: Record<string, boolean> = {}
        const commissionRows = data || []
        const devisIds = commissionRows.map(c => c.reference_id).filter(Boolean) as string[]
        const { data: liensDevis, error: liensError } = devisIds.length
          ? await supabase.from('devis').select('id,dossier_id').in('id', devisIds)
          : { data: [], error: null }

        if (liensError) console.error('Erreur chargement des liens devis/dossiers:', liensError)

        for (const c of commissionRows) {
          if (!c.reference_id) continue
          const value = {
            montant_commercial: Number(c.montant_commercial) || 0,
            montant_societe: Number(c.montant_societe) || 0,
          }
          map[c.reference_id] = value
          const lien = (liensDevis || []).find(v => v.id === c.reference_id)
          if (lien?.dossier_id) map[lien.dossier_id] = value
          const payee = (c as any).statut === 'payee' || (!!(c as any).date_paiement_commercial && !!(c as any).date_paiement_societe)
          for (const cle of [c.reference_id, lien?.dossier_id].filter(Boolean) as string[]) soldees[cle] = (soldees[cle] ?? true) && payee
        }

        setCommissionsParDevis(map)
        setCommissionsSoldees(soldees)
      })
  }

  useEffect(() => {
    fetchListe()
    supabase.from('organisations').select('id, nom, type').eq('actif', true).order('nom')
      .then(({ data }) => setOrganisations((data || []) as OrganisationOption[]))
    supabase.from('installateurs').select('id, nom').eq('actif', true).order('nom')
      .then(({ data }) => setInstallateursDossier((data || []) as { id: string; nom: string }[]))

    lireTout(() => supabase
      .from('prospects')
      .select('*')
      .order('nom'))
      .then(({ data }) => {
        setProspects((data || []) as Prospect[])
      })
  }, [])

  useEffect(() => {
    if (!newProspectId) {
      setDevisDuProspect([])
      setNewDevisId('')
      return
    }

    supabase
      .from('devis')
      .select('*')
      .eq('prospect_id', newProspectId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDevisDuProspect((data || []) as Devis[])
      })
  }, [newProspectId])

  useEffect(() => {
    if (!initialProspectId) return

    setNewProspectId(initialProspectId)
    setNewModalOpen(true)
    onInitialProspectHandled?.()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProspectId])

  async function creerDossier() {
    if (!newProspectId) return

    setCreating(true)

    const devisChoisi =
      devisDuProspect.find(d => d.id === newDevisId) || null

    const { data, error } = await supabase
      .from('dossiers')
      .insert({
        prospect_id: newProspectId,
        devis_id: devisChoisi?.id || null,
        visite_id: devisChoisi?.visite_id || null,
        reference: `DOS-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
        statut: devisChoisi?.statut === 'signe' ? 'signe' : 'creation',
        montant_total: devisChoisi?.montant_ttc || 0,
        aides_montant: devisChoisi?.montant_aides || 0,
        reste_a_charge: devisChoisi?.reste_a_charge || 0,
      })
      .select('id')
      .single()

    if (!error && data) {
      if (devisChoisi) {
        await supabase
          .from('devis')
          .update({ dossier_id: data.id })
          .eq('id', devisChoisi.id)

        if (devisChoisi.statut === 'signe') {
          await supabase
            .from('prospects')
            .update({ statut: 'Installation' })
            .eq('id', newProspectId)
        }
      }

      await supabase.from('documents').insert([
        { dossier_id: data.id, prospect_id: newProspectId, nom: "Avis d’impôts (avis d’imposition)", type: 'avis_imposition', categorie: 'Administratif', recu: false },
        { dossier_id: data.id, prospect_id: newProspectId, nom: 'Taxe foncière', type: 'taxe_fonciere', categorie: 'Administratif', recu: false },
        { dossier_id: data.id, prospect_id: newProspectId, nom: 'Carte nationale d’identité (CNI)', type: 'piece_identite', categorie: 'Administratif', recu: false },
        { dossier_id: data.id, prospect_id: newProspectId, nom: 'Justificatif de domicile', type: 'justificatif_domicile', categorie: 'Administratif', recu: false },
        { dossier_id: data.id, prospect_id: newProspectId, nom: 'Photos avant travaux', type: 'photos', categorie: 'Technique', recu: false },
      ])

      setNewModalOpen(false)
      setNewProspectId('')
      setNewDevisId('')
      fetchListe()
    } else if (error) {
      console.error('Erreur création dossier:', error)
    }

    setCreating(false)
  }

  async function ouvrirDetail(d: DossierAvecRelations) {
    setDetail(d)
    setDetailFacturationOrganisationId(d.facturation_organisation_id || d.organisation_id || profile?.organisation_id || '')
    setDetailDestinataireOrganisationId(d.destinataire_organisation_id || '')
    setDetailStatut(d.statut || 'creation')
    setDetailDateInstallation(d.date_installation || '')
    setUploadError('')
    setDetailMessage('')

    const [{ data }, { data: factures }, { data: devisSigne }] = await Promise.all([
      supabase.from('documents').select('*').eq('dossier_id', d.id).order('created_at'),
      supabase.from('dossier_facturation').select('*').eq('dossier_id', d.id).order('ordre').order('created_at'),
      d.devis_id ? supabase.from('devis').select('signature_date').eq('id', d.devis_id).maybeSingle() : Promise.resolve({ data: null }),
    ])
    setSignatureDevisDetail((devisSigne as any)?.signature_date || null)
    {
      const co = commissionsParDevis[d.devis_id || d.id]
      setSaisieFin({
        montant: d.montant_total != null ? String(d.montant_total) : '',
        societe: co ? String(co.montant_societe) : '',
        commercial: co ? String(co.montant_commercial) : '',
      })
      setSaisieFinMessage('')
    }

    setPieces(await resolveDocumentRows((data || []) as DocumentPiece[]))
    setFacturation((factures || []) as DossierFacturation[])
    const commission = commissionsParDevis[d.devis_id || d.id]
    const totalFactureNonAnnulee = (factures || []).filter((f: any) => f.statut !== 'annulee').reduce((sum: number, f: any) => sum + Number(f.montant_ht || 0), 0)
    const restant = Math.max(0, Number(commission?.montant_societe || 0) - totalFactureNonAnnulee)
    setFactureForm({
      libelle: totalFactureNonAnnulee > 0 ? 'Solde partenaire' : 'Prestation partenaire',
      montant_ht: restant > 0 ? String(restant) : '',
      taux_tva: '20',
      declencheur: totalFactureNonAnnulee > 0 ? 'mpr' : 'installation',
    })
  }

  /** Change l'étape (et son statut) du parcours du dossier ouvert. */
  async function majParcours(etapeId: string, statut: string | null) {
    if (!detail || !isAdmin) return
    setParcoursSaving(true)
    setDetailMessage('')
    const maintenant = new Date().toISOString()
    const { error } = await supabase.from('dossiers')
      .update({ parcours_etape: etapeId, parcours_statut: statut, parcours_maj_le: maintenant }).eq('id', detail.id)
    setParcoursSaving(false)
    if (error) { setDetailMessage(`Parcours non enregistré : ${error.message}`); return }
    const champs = { parcours_etape: etapeId, parcours_statut: statut, parcours_maj_le: maintenant } as any
    setDetail(d => d ? { ...d, ...champs } : d)
    setRows(prev => prev.map(r => r.id === detail.id ? { ...r, ...champs } : r))
    void logAuditEvent({ action: 'dossier_parcours', entityType: 'dossier', entityId: detail.id, description: `Parcours : ${libelleParcours(etapeId, statut)}`, meta: { etape: etapeId, statut } })
  }

  async function enregistrerSaisieFinanciere() {
    if (!detail || !isAdmin) return
    const nombre = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.').replace(/\s/g, '')))
    const montant = nombre(saisieFin.montant)
    // Commission société = montant facturé au partenaire (somme des échéances non annulées).
    const societe = facturation.filter(l => l.statut !== 'annulee').reduce((t, l) => t + (Number(l.montant_ht) || 0), 0)
    const commercial = nombre(saisieFin.commercial)
    if ([montant, commercial].some(v => v !== null && !Number.isFinite(v))) {
      setSaisieFinMessage('Un des montants n’est pas un nombre valide.')
      return
    }
    setSaisieFinSaving(true)
    setSaisieFinMessage('')
    try {
      if (montant !== null) {
        const { error } = await supabase.from('dossiers').update({ montant_total: montant }).eq('id', detail.id)
        if (error) throw error
        setDetail(d => d ? { ...d, montant_total: montant } as any : d)
        setRows(prev => prev.map(r => r.id === detail.id ? { ...r, montant_total: montant } as any : r))
      }
      if (commercial !== null && !detail.devis_id) {
        const commercialId = (detail.prospect as any)?.commercial_id
        if (!commercialId) throw new Error('Aucun commercial rattaché au prospect : impossible d’enregistrer la commission.')
        const { data: existante, error: lectureErreur } = await supabase.from('commissions')
          .select('id').eq('reference_type', 'dossiers').eq('reference_id', detail.id).maybeSingle()
        if (lectureErreur) throw lectureErreur
        const valeurs = { montant_societe: societe, montant_commercial: commercial ?? 0 }
        const { error } = existante
          ? await supabase.from('commissions').update(valeurs).eq('id', (existante as any).id)
          : await supabase.from('commissions').insert({
              ...valeurs, commercial_id: commercialId, type: 'dossier', reference_type: 'dossiers', reference_id: detail.id, organisation_id: (detail as any).organisation_id ?? undefined,
              libelle: `Dossier ${detail.reference || detail.id.slice(0, 8)} — saisie manuelle`, statut: 'en_attente',
            })
        if (error) throw error
        setCommissionsParDevis(prev => ({ ...prev, [detail.id]: { montant_societe: valeurs.montant_societe, montant_commercial: valeurs.montant_commercial } }))
      }
      setSaisieFinMessage('Enregistré.')
    } catch (e: any) {
      setSaisieFinMessage(`Échec de l’enregistrement : ${e?.message || e}`)
    } finally {
      setSaisieFinSaving(false)
    }
  }

  /** Recharge les pièces et le suivi des aides du dossier ouvert. */
  async function rechargerSuivi() {
    if (!detail) return
    const [{ data: docs }, { data: dossier }] = await Promise.all([
      supabase.from('documents').select('*').eq('dossier_id', detail.id).order('created_at'),
      supabase.from('dossiers').select('aides,suivi_aides').eq('id', detail.id).maybeSingle(),
    ])
    setPieces(await resolveDocumentRows((docs || []) as DocumentPiece[]))
    if (dossier) setDetail(d => d ? { ...d, ...(dossier as any) } : d)
  }

  // Un client peut avoir plusieurs dossiers posés par des installateurs différents :
  // l'installateur (et donc le destinataire de la facture partenaire) se règle dossier par dossier.
  async function changerInstallateurDossier(installateurId: string) {
    if (!detail) return
    setSavingInstallateur(true)
    setDetailMessage('')
    const { data, error } = await supabase.from('dossiers')
      .update({ installateur_id: installateurId || null })
      .eq('id', detail.id).select('*').single()
    setSavingInstallateur(false)
    if (error || !data) {
      setDetailMessage(`Impossible de changer l'installateur : ${error?.message || 'erreur inconnue'}`)
      return
    }
    setDetail({ ...detail, ...(data as Dossier) })
    setRows(prev => prev.map(row => row.id === detail.id ? { ...row, ...(data as Dossier) } : row))
    const nom = installateursDossier.find(i => i.id === installateurId)?.nom
    setDetailMessage(nom ? `Installateur du dossier : ${nom}. Les factures partenaires de ce dossier lui seront adressées.` : 'Installateur retiré du dossier.')
  }

  async function enregistrerConfigurationFacturation() {
    if (!detail) return
    setSavingFacturationConfig(true)
    setDetailMessage('')
    const { data, error } = await supabase.from('dossiers').update({
      facturation_organisation_id: detailFacturationOrganisationId || null,
      destinataire_organisation_id: detailDestinataireOrganisationId || null,
    }).eq('id', detail.id).select('*').single()
    setSavingFacturationConfig(false)
    if (error || !data) {
      setDetailMessage(`Impossible d'enregistrer les entreprises de facturation : ${error?.message || 'erreur inconnue'}`)
      return
    }
    const updated = { ...detail, ...(data as Dossier) }
    setDetail(updated)
    setRows(prev => prev.map(row => row.id === detail.id ? { ...row, ...(data as Dossier) } : row))
    setDetailMessage('Entreprises de facturation enregistrées.')
  }

  async function ajouterEcheanceFacturation() {
    if (!isAdmin) { setDetailMessage('Seuls les administrateurs et managers peuvent préparer les échéances de facturation société.'); return }
    if (!detail) return
    const montant = Number(factureForm.montant_ht)
    const tva = Number(factureForm.taux_tva)
    if (!factureForm.libelle.trim() || !Number.isFinite(montant) || montant <= 0) {
      setDetailMessage('Indiquez un libellé et un montant HT supérieur à 0 €.')
      return
    }
    setFactureSaving(true)
    const { data, error } = await supabase.from('dossier_facturation').insert({
      dossier_id: detail.id,
      libelle: factureForm.libelle.trim(),
      montant_ht: montant,
      taux_tva: Number.isFinite(tva) ? Math.max(0, tva) : 20,
      declencheur: factureForm.declencheur,
      ordre: facturation.length,
    }).select('*').single()
    setFactureSaving(false)
    if (error) { setDetailMessage(`Erreur facturation : ${error.message}`); return }
    if (data) setFacturation(prev => [...prev, data as DossierFacturation])
    setFactureForm({ libelle: 'Prestation partenaire', montant_ht: '', taux_tva: String(tva || 20), declencheur: 'installation' })
  }

  async function enregistrerModificationEcheance() {
    if (!isAdmin) { setDetailMessage('Seuls les administrateurs et managers peuvent modifier les échéances de facturation société.'); return }
    if (!editingFacturationId) return
    const montant = Number(factureForm.montant_ht)
    const tva = Number(factureForm.taux_tva)
    if (!factureForm.libelle.trim() || !Number.isFinite(montant) || montant <= 0) {
      setDetailMessage('Indiquez un libellé et un montant HT supérieur à 0 €.')
      return
    }
    setFactureSaving(true)
    const { data, error } = await supabase.from('dossier_facturation').update({
      libelle: factureForm.libelle.trim(),
      montant_ht: montant,
      taux_tva: Number.isFinite(tva) ? Math.max(0, tva) : 20,
      declencheur: factureForm.declencheur,
    }).eq('id', editingFacturationId).select('*').single()
    setFactureSaving(false)
    if (error) { setDetailMessage(`Erreur modification facture : ${error.message}`); return }
    if (data) setFacturation(prev => prev.map(x => x.id === editingFacturationId ? data as DossierFacturation : x))
    setEditingFacturationId(null)
  }

  async function supprimerEcheanceFacturation(ligne: DossierFacturation) {
    if (!isAdmin) return
    if (ligne.statut === 'a_facturer') {
      if (!confirm(`Supprimer l’échéance « ${ligne.libelle} » de ${euro(Number(ligne.montant_ht) || 0)} HT ?`)) return
      const { error } = await supabase.from('dossier_facturation').delete().eq('id', ligne.id).eq('statut', 'a_facturer')
      if (error) { setDetailMessage(`Erreur suppression : ${error.message}`); return }
      setFacturation(prev => prev.filter(x => x.id !== ligne.id))
      if (editingFacturationId === ligne.id) setEditingFacturationId(null)
      return
    }
    if (ligne.statut === 'annulee') return
    if (!confirm(`La facture ${ligne.facture_numero || ''} a déjà été générée. Elle sera marquée comme annulée et conservée dans l’historique comptable. Continuer ?`)) return
    const { error } = await supabase.from('dossier_facturation').update({ statut: 'annulee', notes: `${ligne.notes || ''}${ligne.notes ? '\n' : ''}Annulée le ${new Date().toLocaleDateString('fr-FR')} par ${profile?.nom_complet || profile?.email || 'administrateur'}` }).eq('id', ligne.id)
    if (error) { setDetailMessage(`Erreur d’annulation : ${error.message}`); return }
    setFacturation(prev => prev.map(x => x.id === ligne.id ? { ...x, statut: 'annulee' } : x))
  }

  async function genererFactureEcheance(ligne: DossierFacturation) {
    if (!isAdmin) { setDetailMessage('La génération des factures de commission société est réservée à l’administration.'); return }
    if (!detail || ligne.statut !== 'a_facturer') return
    setFactureSaving(true)
    try {
      const { data: linkedInvoice } = await supabase.from('dossier_facturation').select('devis_id').eq('id', ligne.id).maybeSingle()
      const issuerOrganisationId = detail.facturation_organisation_id || detail.organisation_id || profile?.organisation_id
      const [numeroResult, entrepriseResult] = await Promise.all([
        supabase.rpc('next_facture_number'),
        supabase.from('entreprises').select('*').eq('organisation_id', issuerOrganisationId || '').maybeSingle(),
      ])
      const numero = numeroResult.data
      const entreprise = entrepriseResult.data
      if (entrepriseResult.error) throw new Error(`Informations légales de l’entreprise émettrice indisponibles : ${entrepriseResult.error.message}`)
      if (!entreprise) throw new Error('Renseignez les informations légales de l’entreprise émettrice dans les paramètres avant de générer la facture.')
      if (numeroResult.error) throw new Error(`Numérotation de facture indisponible : ${numeroResult.error.message}. Vérifiez que la migration de facturation a été appliquée dans Supabase.`)
      if (!numero) throw new Error('La base de données n’a renvoyé aucun numéro de facture. Appliquez la migration de numérotation des factures dans Supabase.')
      const now = new Date()
      const numeroFacture = String(numero)
      const prospect = detail.prospect as any
      const partnerId = detail.installateur_id || prospect?.installateur_id || null
      const { data: partenaire } = partnerId
        ? await supabase.from('installateurs').select('*').eq('id', partnerId).maybeSingle()
        : { data: null as any }
      const { data: destinataireEntreprise } = detail.destinataire_organisation_id
        ? await supabase.from('entreprises').select('*').eq('organisation_id', detail.destinataire_organisation_id).maybeSingle()
        : { data: null as any }
      if (detail.destinataire_organisation_id && !destinataireEntreprise) {
        throw new Error('La fiche légale du destinataire est indisponible pour votre compte. Demandez à l’administrateur de vérifier les informations de facturation.')
      }
      const destinataireFacture = destinataireEntreprise ? {
        nom: destinataireEntreprise.raison_sociale,
        complement: destinataireEntreprise.forme_juridique,
        adresse: destinataireEntreprise.adresse,
        code_postal: destinataireEntreprise.code_postal,
        ville: destinataireEntreprise.ville,
        siret: destinataireEntreprise.siret,
        numero_tva: destinataireEntreprise.numero_tva,
        email: destinataireEntreprise.email,
      } : (partenaire ? {
        nom: partenaire.devis_raison_sociale || partenaire.nom,
        complement: partenaire.devis_forme_juridique || null,
        adresse: partenaire.adresse,
        code_postal: partenaire.code_postal,
        ville: partenaire.ville,
        siret: partenaire.siret,
        numero_tva: partenaire.numero_tva || partenaire.devis_numero_tva,
        email: partenaire.email,
      } : null)
      if (!destinataireFacture?.nom) {
        throw new Error('Aucun partenaire n’est défini pour ce dossier : choisissez l’installateur du dossier (ou l’entreprise destinataire) avant de générer la facture.')
      }

      const ht = Number(ligne.montant_ht) || 0
      const taux = Number(ligne.taux_tva) || 0
      const tva = ht * taux / 100
      const ttc = ht + tva
      const doc = await genererFacturePartenairePDF({
        numero: numeroFacture,
        dateEmission: now,
        datePrestation: detail.date_installation || null,
        dateEcheance: ligne.date_echeance || null,
        referenceDossier: detail.reference || null,
        emetteur: {
          nom: entreprise?.raison_sociale || nomEntreprise,
          complement: entreprise?.forme_juridique,
          capital_social: entreprise?.capital_social,
          adresse: entreprise?.adresse, code_postal: entreprise?.code_postal, ville: entreprise?.ville,
          telephone: entreprise?.telephone, email: entreprise?.email,
          siret: entreprise?.siret, numero_tva: entreprise?.numero_tva, logo_url: entreprise?.logo_url,
          banque: entreprise?.banque, iban: entreprise?.iban, bic: entreprise?.bic,
          conditions_paiement_defaut: entreprise?.conditions_paiement_defaut,
          escompte_defaut: entreprise?.escompte_defaut, taux_penalite_retard: entreprise?.taux_penalite_retard,
        },
        destinataire: {
          nom: String(destinataireFacture.nom),
          complement: (destinataireFacture as any).complement ?? null,
          adresse: destinataireFacture.adresse, code_postal: destinataireFacture.code_postal, ville: destinataireFacture.ville,
          siret: destinataireFacture.siret, numero_tva: destinataireFacture.numero_tva, email: destinataireFacture.email,
        },
        designation: ligne.libelle || 'Prestation partenaire',
        montantHt: ht,
        tauxTva: taux,
        conditionsPaiement: ligne.conditions_paiement || entreprise?.conditions_paiement_defaut || null,
        natureOperation: ligne.categorie_operation || null,
      })
      const pdfBlob = doc.output('blob')
      doc.save(`${numeroFacture}.pdf`)
      const fichierFacture = new File([pdfBlob], `${numeroFacture}.pdf`, { type: 'application/pdf' })
      const { document: documentFacture, path: cheminPdf, error: uploadFactureError } = await uploadDocument(fichierFacture, {
        dossierId: detail.id, prospectId: detail.prospect_id, partenaireId: partnerId, type: 'pdf', categorie: 'Factures partenaires',
      })
      if (uploadFactureError || !documentFacture || !cheminPdf) throw new Error(`PDF téléchargé, mais archivage dans le dossier impossible : ${uploadFactureError || 'chemin de stockage manquant'}`)

      // Devis interne de suivi : il augmente les statistiques sans générer une commission travaux.
      let devisId = linkedInvoice?.devis_id as string | null | undefined
      if (!devisId) {
        const { data: devis, error: devisError } = await supabase.from('devis').insert({
          entreprise_id: entreprise?.id || null,
          prospect_id: detail.prospect_id,
          dossier_id: detail.id,
          numero: numeroDevis(),
          statut: 'signe',
          signature_statut: 'signe',
          signature_date: now.toISOString(),
          type_operation: 'mono_geste',
          date_validite: now.toISOString().slice(0, 10),
          montant_ht: ht,
          montant_tva: tva,
          montant_ttc: ttc,
          montant_aides: 0,
          reste_a_charge: ttc,
          notes: `Devis interne de suivi de facturation partenaire — facture ${numeroFacture}. Ne constitue pas un devis de travaux client.`,
          origine_interne: true,
          emetteur_type: 'renova_soluces',
          emetteur_nom_affichage: entreprise?.raison_sociale || nomEntreprise,
        }).select('id').single()
        if (devisError || !devis) throw new Error(`Facture PDF générée, mais création du devis interne impossible : ${devisError?.message || 'erreur inconnue'}`)
        devisId = devis.id
        const { error: linkError } = await supabase.from('dossier_facturation').update({ devis_id: devisId }).eq('id', ligne.id)
        if (linkError) throw new Error(`Devis créé, mais liaison à la facture impossible : ${linkError.message}`)
        const { error: ligneError } = await supabase.from('devis_lignes').insert({
          devis_id: devisId, designation: ligne.libelle || 'Prestation partenaire',
          description: `Pièce interne liée à la facture ${numeroFacture}`,
          quantite: 1, prix_unitaire_ht: ht, tva_taux: taux, montant_ht: ht, ordre: 0,
        })
        if (ligneError) throw new Error(`Devis créé, mais sa ligne n'a pas pu être enregistrée : ${ligneError.message}`)
      }
      const { error } = await supabase.from('dossier_facturation').update({
        statut:'facturee', facturee_at:now.toISOString(), facture_numero:numeroFacture,
        date_echeance: ligne.date_echeance || null,
        conditions_paiement: ligne.conditions_paiement || entreprise?.conditions_paiement_defaut || '',
        devis_id: devisId,
        pdf_storage_path: cheminPdf,
        email_erreur: null,
      }).eq('id',ligne.id)
      if (error) throw new Error(`PDF généré, mais enregistrement impossible : ${error.message}`)
      await logAuditEvent({ action:'dossier_facture', entityType:'facture', entityId:ligne.id, description:`Facture ${numeroFacture} générée avec devis interne ${devisId}`, meta:{facture_numero:numeroFacture,montant_ht:ht,montant_ttc:ttc,devis_id:devisId} })
      setFacturation(prev=>prev.map(x=>x.id===ligne.id?{...x,statut:'facturee',facturee_at:now.toISOString(),facture_numero:numeroFacture,devis_id:devisId,pdf_storage_path:cheminPdf,email_erreur:null}:x))
      if (!destinataireFacture?.email) {
        const message = 'Facture générée et archivée, mais aucun e-mail partenaire n’est renseigné.'
        await supabase.from('dossier_facturation').update({ email_erreur: message }).eq('id', ligne.id)
        setDetailMessage(message)
      } else {
        const { data: envoi, error: envoiError } = await supabase.functions.invoke('send-invoice', { body: { storagePath: cheminPdf, recipient: destinataireFacture.email, invoiceNumber: numeroFacture, partnerName: destinataireFacture.nom, dossierId: detail.id } })
        if (envoiError || envoi?.error) {
          const message = `Facture ${numeroFacture} créée et archivée, mais l’e-mail n’a pas été envoyé : ${envoiError?.message || envoi?.error}. Configurez la fonction send-invoice et RESEND_API_KEY.`
          await supabase.from('dossier_facturation').update({ email_erreur: message }).eq('id', ligne.id)
          setFacturation(prev=>prev.map(x=>x.id===ligne.id?{...x,email_erreur:message}:x))
          setDetailMessage(message)
        } else {
          await supabase.from('dossier_facturation').update({ email_envoye_at: new Date().toISOString(), email_erreur: null }).eq('id', ligne.id)
          setFacturation(prev=>prev.map(x=>x.id===ligne.id?{...x,email_envoye_at:new Date().toISOString(),email_erreur:null}:x))
          setDetailMessage(`Facture ${numeroFacture} générée, archivée et envoyée à ${destinataireFacture.email}.`)
        }
      }
    } catch (e:any) {
      setDetailMessage(e?.message || 'Impossible de générer la facture.')
    } finally { setFactureSaving(false) }
  }

  async function genererFactureDepuisCommission() {
    if (!isAdmin) { setDetailMessage('La génération des factures de commission société est réservée à l’administration.'); return }
    if (!detail) return
    const montant = Number(factureForm.montant_ht)
    if (!Number.isFinite(montant) || montant <= 0) {
      setDetailMessage('Renseignez un montant HT supérieur à 0 € avant de générer la facture.')
      return
    }
    setFactureSaving(true)
    const { data, error } = await supabase.from('dossier_facturation').insert({
      dossier_id: detail.id,
      libelle: factureForm.libelle.trim() || 'Prestation partenaire',
      montant_ht: montant,
      taux_tva: Number(factureForm.taux_tva) || 20,
      declencheur: factureForm.declencheur || 'installation',
      ordre: facturation.length,
    }).select('*').single()
    setFactureSaving(false)
    if (error || !data) {
      setDetailMessage(`Impossible de préparer la facture : ${error?.message || 'erreur inconnue'}`)
      return
    }
    const ligne = data as DossierFacturation
    setFacturation(prev => [...prev, ligne])
    await genererFactureEcheance(ligne)
  }

  async function renvoyerFactureParEmail(ligne: DossierFacturation) {
    if (!ligne.pdf_storage_path || !ligne.facture_numero || !detail || !isAdmin) {
      setDetailMessage('Impossible de renvoyer : PDF archivé ou numéro de facture manquant.')
      return
    }
    const prospect = detail.prospect as any
    const partnerId = detail.installateur_id || prospect?.installateur_id || null
    if (!partnerId) { setDetailMessage('Aucun partenaire associé à ce dossier.'); return }
    const { data: partenaire, error } = await supabase.from('installateurs').select('nom,email').eq('id', partnerId).maybeSingle()
    if (error || !partenaire?.email) { setDetailMessage(`Adresse e-mail du partenaire indisponible : ${error?.message || 'adresse manquante'}`); return }
    setFactureSaving(true)
    const { data, error: sendError } = await supabase.functions.invoke('send-invoice', { body: { storagePath: ligne.pdf_storage_path, recipient: partenaire.email, invoiceNumber: ligne.facture_numero, partnerName: partenaire.nom, dossierId: detail.id } })
    setFactureSaving(false)
    if (sendError || data?.error) {
      const message = `Échec de l’envoi : ${sendError?.message || data?.error}`
      await supabase.from('dossier_facturation').update({ email_erreur: message }).eq('id', ligne.id)
      setDetailMessage(message)
      setFacturation(prev => prev.map(x => x.id === ligne.id ? { ...x, email_erreur: message } : x))
      return
    }
    const sentAt = new Date().toISOString()
    await supabase.from('dossier_facturation').update({ email_envoye_at: sentAt, email_erreur: null }).eq('id', ligne.id)
    setFacturation(prev => prev.map(x => x.id === ligne.id ? { ...x, email_envoye_at: sentAt, email_erreur: null } : x))
    setDetailMessage(`Facture ${ligne.facture_numero} envoyée à ${partenaire.email}.`)
  }

  async function supprimerDossier() {
    if (!detail || !isAdmin) return

    const confirme = window.confirm(
      `Supprimer définitivement le dossier ${detail.reference || ''} ? Cette action est irréversible (pièces jointes et données liées supprimées).`,
    )

    if (!confirme) return

    setDeletingDossier(true)

    const { error } = await supabase
      .from('dossiers')
      .delete()
      .eq('id', detail.id)

    setDeletingDossier(false)

    if (error) {
      console.error('Erreur suppression dossier:', error)
      setDetailMessage(`Erreur suppression : ${error.message}`)
      return
    }

    setRows(prev => prev.filter(row => row.id !== detail.id))
    setDetail(null)
  }

  async function uploaderPiece(piece: DocumentPiece, file: File | null) {
    if (!file || !detail) return

    setUploadingPieceId(piece.id)
    setUploadError('')

    try {
      const ext = file.name.split('.').pop() || 'bin'
      const path = `${detail.id}/${piece.id}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadErr) throw uploadErr

      const { data, error } = await supabase
        .from('documents')
        .update({
          url: path,
          taille: file.size,
          recu: true,
          nom: piece.nom,
        })
        .eq('id', piece.id)
        .select('*')
        .single()

      if (error) throw error

      if (data) {
        const resolvedUrl = await resolveDocumentUrl(data.url)
        const resolvedPiece = { ...(data as DocumentPiece), url: resolvedUrl }
        setPieces(prev => prev.map(p => p.id === piece.id ? resolvedPiece : p))
      }
    } catch (e: any) {
      setUploadError(
        `Échec de l'envoi de "${file.name}" : ${
          e?.message || 'erreur inconnue'
        }`
      )
    }

    setUploadingPieceId(null)
  }

  async function retirerFichier(piece: DocumentPiece) {
    await removeDocumentStorageObject(piece.url)
    supabase
      .from('documents')
      .update({ url: '', recu: false })
      .eq('id', piece.id)
      .select('*')
      .single()
      .then(({ data }) => {
        if (data) {
          setPieces(prev =>
            prev.map(p =>
              p.id === piece.id ? (data as DocumentPiece) : p
            )
          )
        }
      })
  }

  async function ajouterPieceLibre(files: FileList | null) {
    if (!files || files.length === 0 || !detail) return

    setAddingPiece(true)
    setUploadError('')

    for (const file of Array.from(files)) {
      const { error } = await uploadDocument(file, {
        dossierId: detail.id,
        type: 'autre',
      })

      if (error) {
        setUploadError(
          `Échec de l'envoi de "${file.name}" : ${error}`
        )
      }
    }

    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('dossier_id', detail.id)
      .order('created_at')

    setPieces((data || []) as DocumentPiece[])
    setAddingPiece(false)
  }

  async function supprimerPieceLibre(piece: DocumentPiece) {
    if (!confirm(`Supprimer "${piece.nom}" ?`)) return

    await supabase
      .from('documents')
      .delete()
      .eq('id', piece.id)

    setPieces(prev =>
      prev.filter(p => p.id !== piece.id)
    )
  }

  async function enregistrerStatut() {
    if (!detail) return

    setSavingStatut(true)

    const dossierUpdate: Record<string, any> = {
      statut: detailStatut,
      date_installation: detailDateInstallation || null,
    }
    if (detailStatut === 'installe' && !detailDateInstallation) {
      setDetailMessage('Indiquez la date réelle d’installation avant de passer le dossier en « Installé ».')
      setSavingStatut(false)
      return
    }
    const { data, error } = await supabase
      .from('dossiers')
      .update(dossierUpdate)
      .eq('id', detail.id)
      .select('*, prospect:prospects(*)')
      .single()

    setSavingStatut(false)

    if (error) {
      console.error('Erreur statut dossier:', error)
      return
    }

    if (data) {
      if (detail.prospect_id) {
        const nextProspectStatut =
          detailStatut === 'installe'
            ? 'Installé'
            : (
                detailStatut === 'installation' ||
                detailStatut === 'accepte' ||
                detailStatut === 'signe'
              )
              ? 'Installation'
              : null

        if (nextProspectStatut) {
          await setProspectStatus(detail.prospect_id, nextProspectStatut, `statut dossier ${detailStatut}`)
        }
      }

      const updated = { ...(data as DossierAvecRelations) }

      if (detail.prospect_id) {
        const { data: prospect } = await supabase
          .from('prospects')
          .select('*')
          .eq('id', detail.prospect_id)
          .maybeSingle()

        if (prospect) {
          updated.prospect = prospect as Prospect
        }
      }

      setDetail(updated)

      setRows(prev =>
        prev.map(r =>
          r.id === detail.id ? updated : r
        )
      )
    }
  }

  const STATUT_PAR_COLONNE: Record<string, string> = { creation: 'creation', signe: 'signe', installation: 'installation', installe: 'installe', refuse: 'refuse' }

  async function deplacerDossier(dossierId: string, colonneId: string) {
    const d = rows.find(r => r.id === dossierId)
    const cible = STATUT_PAR_COLONNE[colonneId]
    if (!d || !cible) return
    const colonneActuelle = COLONNES_DOSSIER.find(c => c.statuts.includes((d.statut || '').toLowerCase()))
    if (colonneActuelle?.id === colonneId) return
    if (!isAdmin) {
      setMessagePipeline('Seul l’administrateur peut changer le statut d’un dossier.')
      return
    }
    if (cible === 'installe' && !d.date_installation) {
      // Règle existante : la date réelle d'installation est obligatoire pour passer en « Installé ».
      ouvrirDetail(d)
      setDetailStatut('installe')
      setDetailMessage('Indiquez la date réelle d’installation avant de passer le dossier en « Installé ».')
      return
    }
    setMessagePipeline('')
    const ancien = d.statut
    setRows(prev => prev.map(r => (r.id === dossierId ? { ...r, statut: cible } : r)))
    const { error } = await supabase.from('dossiers').update({ statut: cible }).eq('id', dossierId)
    if (error) {
      console.error('Erreur déplacement dossier:', error)
      setRows(prev => prev.map(r => (r.id === dossierId ? { ...r, statut: ancien } : r)))
      setMessagePipeline('Le statut n’a pas pu être modifié. Réessayez.')
      return
    }
    if (d.prospect_id) {
      const statutProspect = cible === 'installe' ? 'Installé' : (cible === 'installation' || cible === 'signe') ? 'Installation' : null
      if (statutProspect) await setProspectStatus(d.prospect_id, statutProspect, `statut dossier ${cible}`)
    }
  }

  const normaliser = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  // Dossier « soldé » : installé, toutes les échéances (hors annulées) payées, commissions payées (s'il y en a).
  const estSolde = (d: DossierAvecRelations) => {
    if ((d.statut || '').toLowerCase() !== 'installe') return false
    const lignes = (lignesFacturation[d.id] || []).filter(x => x.statut !== 'annulee')
    if (lignes.length === 0 || lignes.some(x => x.statut !== 'payee')) return false
    const cles = [d.id, d.devis_id].filter(Boolean) as string[]
    return cles.every(k => commissionsSoldees[k] !== false)
  }
  const nbSoldes = rows.filter(estSolde).length
  const rowsFiltrees = rows.filter(d => {
    const pr: any = d.prospect || {}
    // Une recherche porte toujours sur l'ensemble des dossiers, soldés compris.
    if (!recherche.trim()) {
      if (affichage === 'actifs' && estSolde(d)) return false
      if (affichage === 'termines' && !estSolde(d)) return false
    }
    if (recherche.trim()) {
      const q = normaliser(recherche.trim())
      const texte = normaliser([d.reference, pr.prenom, pr.nom, `${pr.prenom || ''} ${pr.nom || ''}`, `${pr.nom || ''} ${pr.prenom || ''}`, pr.ville, pr.code_postal, pr.telephone, pr.email].join(' '))
      if (!q.split(/\s+/).every(m => texte.includes(m))) return false
    }
    if (filtreEtape) {
      const col = COLONNES_DOSSIER.find(c => c.id === filtreEtape)
      if (col && !col.statuts.includes((d.statut || '').toLowerCase())) return false
    }
    if (filtrePersonne && pr.commercial_id !== filtrePersonne && pr.apporteur_user_id !== filtrePersonne) return false
    if (filtreParcours && (d as any).parcours_etape !== filtreParcours) return false
    return true
  })
  const filtresActifs = [recherche.trim(), filtreEtape, filtrePersonne, filtreParcours, affichage !== 'actifs' ? affichage : ''].filter(Boolean).length

  const totalFactureHtDetail = facturation.filter(l => l.statut !== 'annulee').reduce((t, l) => t + (Number(l.montant_ht) || 0), 0)
  const total = rows.length

  const enCours = rows.filter(d => {
    const s = (d.statut || '').toLowerCase()

    return (
      s.includes('cours') ||
      s === 'attente' ||
      s === 'en_attente' ||
      s === 'creation'
    )
  }).length

  const signes = rows.filter(d => {
    const s = (d.statut || '').toLowerCase()

    return s === 'signe' || s === 'accepte'
  }).length

  // CA chantier = montant du chantier chez le partenaire (TTC, champ montant_total).
  const chantiersRenseignes = rows.filter(d => d.montant_total != null && Number(d.montant_total) > 0)
  const caChantiers = chantiersRenseignes.reduce((sum, d) => sum + Number(d.montant_total), 0)
  // Facturé aux partenaires = nos factures (HT) : échéances émises ou payées, hors annulées.
  const factureDossier = (id: string) => (lignesFacturation[id] || []).filter(l => l.statut === 'facturee' || l.statut === 'payee').reduce((t, l) => t + l.ht, 0)
  const montantFacture = rows.reduce((sum, d) => sum + factureDossier(d.id), 0)

  const euro = (
    n: number | null | undefined
  ) =>
    n != null
      ? new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(Number(n) || 0)
      : '—'

  const badgeFor = (s: string) =>
    STATUT_BADGE[(s || '').toLowerCase()] ||
    'badge-neutral'

  const kpis = [
    {
      icon: <FolderOpen size={20} />,
      value: total,
      label: 'Total dossiers',
      tone: 'blue',
    },
    {
      icon: <Clock size={20} />,
      value: enCours,
      label: 'En cours',
      tone: 'amber',
    },
    {
      icon: <CheckCircle2 size={20} />,
      value: signes,
      label: 'Signés',
      tone: 'green',
    },
    {
      icon: <Wallet size={20} />,
      value: euro(caChantiers),
      label: 'CA chantiers partenaires (TTC)',
      note: `${chantiersRenseignes.length} / ${total} renseignés`,
      tone: 'accent',
    },
    {
      icon: <Receipt size={20} />,
      value: euro(montantFacture),
      label: 'Facturé aux partenaires (HT)',
      note: 'Échéances émises ou payées',
      tone: 'accent',
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dossiers</h1>
          <p className="page-subtitle">
            Suivez vos dossiers de rénovation de la proposition à la signature
          </p>
        </div>

        <div className="page-actions">
          <div className="vue-switch" role="group" aria-label="Affichage des dossiers">
            <button type="button" className={vue === 'liste' ? 'on' : ''} onClick={() => changerVue('liste')}>Liste</button>
            <button type="button" className={vue === 'pipeline' ? 'on' : ''} onClick={() => changerVue('pipeline')}>Pipeline</button>
          </div>
          <Button
            variant="primary"
            onClick={() => setNewModalOpen(true)}
          >
            <Plus size={18} />
            Nouveau dossier
          </Button>
        </div>
      </div>

      <section className="dashboard-kpis page-kpi-strip">
        {kpis.map((k,idx) => <div className="dashboard-kpi" key={k.label}><span className={`dashboard-kpi-icon ${idx===0?'blue':idx===1?'amber':idx===2?'green':idx===3?'purple':'amber'}`}>{k.icon}</span><span className="dashboard-kpi-main"><strong>{k.value}</strong><span>{k.label}</span></span><span className="dashboard-kpi-note">{(k as any).note || 'Pilotage'}</span></div>)}
      </section>

      <div className="dossier-filtres" role="search">
        <input
          type="search"
          className="input"
          placeholder="Rechercher un nom, une référence, une ville, un téléphone…"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          aria-label="Rechercher un dossier"
        />
        <select className="input" value={affichage} onChange={e => setAffichage(e.target.value as any)} aria-label="Dossiers en cours ou soldés">
          <option value="actifs">En cours</option>
          <option value="termines">Soldés ({nbSoldes})</option>
          <option value="tous">Tous les dossiers</option>
        </select>
        <select className="input" value={filtreEtape} onChange={e => setFiltreEtape(e.target.value)} aria-label="Filtrer par étape">
          <option value="">Toutes les étapes</option>
          {COLONNES_DOSSIER.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className="input" value={filtreParcours} onChange={e => setFiltreParcours(e.target.value)} aria-label="Filtrer par étape du parcours">
          <option value="">Tout le parcours</option>
          {PARCOURS_CEE.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <select className="input" value={filtrePersonne} onChange={e => setFiltrePersonne(e.target.value)} aria-label="Filtrer par commercial ou apporteur">
          <option value="">Tous les commerciaux / apporteurs</option>
          {personnes.map(x => <option key={x.id} value={x.id}>{x.nom_complet}</option>)}
        </select>
        {filtresActifs > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRecherche(''); setFiltreEtape(''); setFiltrePersonne(''); setFiltreParcours(''); setAffichage('actifs') }}>
            Réinitialiser ({filtresActifs})
          </button>
        )}
        <span className="dossier-filtres-compte">
          {rowsFiltrees.length} / {rows.length} dossier{rows.length > 1 ? 's' : ''}
          {affichage === 'actifs' && !recherche.trim() && nbSoldes > 0 && <> · {nbSoldes} soldé{nbSoldes > 1 ? 's' : ''} masqué{nbSoldes > 1 ? 's' : ''} (la recherche les retrouve)</>}
        </span>
      </div>

      {vue === 'pipeline' && messagePipeline && <div className="dossier-board-message" role="status">{messagePipeline}</div>}
      {vue === 'pipeline' && !loading && rows.length > 0 && (
        <section className="dossier-board" aria-label="Dossiers par étape">
          {COLONNES_DOSSIER.map(col => {
            const items = rowsFiltrees.filter(d => col.statuts.includes((d.statut || '').toLowerCase()))
            const total = items.reduce((sum, d) => sum + factureDossier(d.id), 0)
            return (
              <div
                className={`dossier-col${overCol === col.id ? ' is-over' : ''}`}
                key={col.id}
                onDragOver={e => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overCol !== col.id) setOverCol(col.id) } }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null) }}
                onDrop={e => { e.preventDefault(); const id = dragId || e.dataTransfer.getData('text/plain'); setDragId(null); setOverCol(null); if (id) deplacerDossier(id, col.id) }}
              >
                <div className="dossier-col-head">
                  <span className="dossier-col-dot" style={{ background: col.couleur }} />
                  <span className="dossier-col-title">{col.label}</span>
                  <span className="dossier-col-count">{items.length}</span>
                  <span className="dossier-col-total">{euro(total)}</span>
                </div>
                {items.slice(0, 12).map(d => {
                  const nom = d.prospect ? `${d.prospect.prenom || ''} ${d.prospect.nom || ''}`.trim() : '—'
                  const initiales = nom.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?'
                  return (
                    <div
                      className={`dossier-card${dragId === d.id ? ' is-drag' : ''}${isAdmin ? ' glissable' : ''}`}
                      key={d.id}
                      draggable={isAdmin}
                      onDragStart={e => { setDragId(d.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', d.id) }}
                      onDragEnd={() => { setDragId(null); setOverCol(null) }}
                    >
                      <button type="button" className="dossier-card-open" onClick={() => ouvrirDetail(d)}>
                        <span className="dossier-card-top">
                          <span className="dossier-card-avatar">{initiales}</span>
                          <span className="dossier-card-id"><b>{nom}</b><small>{d.reference || d.id.slice(0, 8)}</small></span>
                        </span>
                        <span className="dossier-card-montant" title="Facturé au partenaire (HT)">{euro(factureDossier(d.id))} HT</span>
                      </button>
                      {isAdmin && (
                        <select
                          className="dossier-card-move"
                          aria-label={`Déplacer le dossier de ${nom}`}
                          value=""
                          onChange={e => { if (e.target.value) deplacerDossier(d.id, e.target.value) }}
                        >
                          <option value="">Déplacer vers…</option>
                          {COLONNES_DOSSIER.filter(c => c.id !== col.id).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      )}
                    </div>
                  )
                })}
                {items.length > 12 && <div className="dossier-col-more">+ {items.length - 12} autres dossiers · passez en vue Liste pour tout voir</div>}
                {items.length === 0 && <div className="dossier-col-more">Aucun dossier</div>}
              </div>
            )
          })}
        </section>
      )}

      <div className="card" style={vue === 'pipeline' && !loading && rows.length > 0 ? { display: 'none' } : undefined}>
        {loading ? (
          <div className="card-pad text-muted">
            Chargement…
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={40} />

            <h3>Aucun dossier</h3>

            <p>
              Un dossier se crée automatiquement à la signature
              d'un devis, ou manuellement ici.
            </p>

            <Button
              variant="primary"
              onClick={() => setNewModalOpen(true)}
            >
              <Plus size={18} />
              Nouveau dossier
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Prospect</th>
                  <th>Statut</th>
                  <th>Parcours</th>
                  <th>CA chantier (TTC)</th>
                  {canViewCompanyCommission && <th>Commission société <span className="text-muted" style={{ fontWeight: 400 }}>(facturé partenaire HT)</span></th>}
                  <th>Commission commerciale</th>
                </tr>
              </thead>

              <tbody>
                {rowsFiltrees.map(d => {
                  const commission = (d.devis_id && commissionsParDevis[d.devis_id]) || commissionsParDevis[d.id]

                  return (
                    <tr
                      key={d.id}
                      onClick={() => ouvrirDetail(d)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="font-semibold">
                        {d.reference ||
                          d.id.slice(0, 8)}
                      </td>

                      <td>
                        {d.prospect
                          ? `${d.prospect.prenom} ${d.prospect.nom}`
                          : '—'}
                      </td>

                      <td>
                        <span
                          className={`badge ${badgeFor(
                            d.statut
                          )}`}
                        >
                          {d.statut || '—'}
                        </span>
                        {estSolde(d) && <span className="badge badge-success" style={{ marginLeft: 6 }} title="Installé, factures et commissions payées">Soldé</span>}
                        {(() => {
                          const aides = ((d as any).aides || []) as Aide[]
                          if (!aides.length) return null
                          const n = alertesDossier(etapesDossier({ aides, suivi: (d as any).suivi_aides || {}, installation: d.date_installation, installationPrevue: (d as any).date_installation_prevue, pieces: piecesParDossier[d.id] || [] })).length
                          return n ? <span className="badge badge-error" style={{ marginLeft: 6 }} title="Alertes sur le suivi des aides">{n} alerte{n > 1 ? 's' : ''} aides</span> : <span className="badge badge-success" style={{ marginLeft: 6 }}>Aides à jour</span>
                        })()}
                      </td>

                      <td>
                        {libelleParcours((d as any).parcours_etape, (d as any).parcours_statut)}
                      </td>

                      <td>
                        {euro(d.montant_total)}
                      </td>

                      {isAdmin && (
                        <td>
                          <strong>
                            {commission
                              ? euro(commission.montant_societe)
                              : factureDossier(d.id) > 0 ? euro(factureDossier(d.id)) : '—'}
                          </strong>
                        </td>
                      )}

                      <td>
                        <strong>
                          {commission
                            ? euro(commission.montant_commercial)
                            : '—'}
                        </strong>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================
          CRÉATION MANUELLE
          ===================================================== */}

      <Modal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Nouveau dossier"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setNewModalOpen(false)}
            >
              Annuler
            </Button>

            <Button
              variant="primary"
              onClick={creerDossier}
              disabled={!newProspectId || creating}
            >
              {creating
                ? 'Création…'
                : 'Créer le dossier'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FloatSelect
            label="Prospect / client"
            value={newProspectId}
            onChange={setNewProspectId}
            options={prospects.map(p => ({
              value: p.id,
              label: `${p.prenom} ${p.nom} — ${
                p.ville || ''
              }`,
            }))}
          />

          {newProspectId && (
            <FloatSelect
              label="Devis à rattacher (optionnel)"
              value={newDevisId}
              onChange={setNewDevisId}
              options={[
                {
                  value: '',
                  label: 'Aucun devis pour le moment',
                },
                ...devisDuProspect.map(d => ({
                  value: d.id,
                  label: `${d.numero} — ${d.statut}`,
                })),
              ]}
            />
          )}

          <p className="text-sm text-muted">
            Le dossier ouvre automatiquement la checklist des pièces à recueillir : avis d’impôts,
            taxe foncière, CNI, justificatif de domicile et photos avant travaux.
          </p>
        </div>
      </Modal>

      {/* =====================================================
          DÉTAIL DOSSIER
          ===================================================== */}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={
          detail
            ? `Dossier ${detail.reference || ''}`
            : ''
        }
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            {isAdmin && detail && (
              <Button
                variant="danger"
                onClick={supprimerDossier}
                disabled={deletingDossier}
              >
                <Trash2 size={14} />
                {deletingDossier
                  ? 'Suppression…'
                  : 'Supprimer le dossier'}
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => setDetail(null)}
            >
              Fermer
            </Button>
          </div>
        }
      >
        {detail && (
          <div className="flex flex-col gap-4">

            {detailMessage && (
              <div
                className="text-sm"
                style={{ color: 'var(--c-error, #dc2626)' }}
              >
                {detailMessage}
              </div>
            )}

            {/* IDENTITÉ, AVANCEMENT ET MONTANT */}

            {(() => {
              const nom = detail.prospect ? `${detail.prospect.prenom || ''} ${detail.prospect.nom || ''}`.trim() : '—'
              const initiales = nom.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?'
              const statutCourant = (detail.statut || '').toLowerCase()
              const etape = ETAPES_FRISE.findIndex(e => e.statuts.includes(statutCourant))
              const lignes = facturation.filter(l => l.statut !== 'annulee')
              const ht = (l: DossierFacturation) => Number(l.montant_ht) || 0
              const somme = (statut: string) => lignes.filter(l => l.statut === statut).reduce((t, l) => t + ht(l), 0)
              const encaisse = somme('payee')
              const aEncaisser = somme('facturee')
              const aFacturer = somme('a_facturer')
              const totalLignes = encaisse + aEncaisser + aFacturer
              const montantDossier = totalLignes
              const pct = montantDossier > 0 ? Math.min(100, Math.round((encaisse / montantDossier) * 100)) : 0
              return (
                <div className="fiche-head">
                  <div className="fiche-identite">
                    <span className="fiche-avatar">{initiales}</span>
                    <div>
                      <small>Dossier {detail.reference || detail.id.slice(0, 8)}</small>
                      <h2>{nom}</h2>
                      {apporteurNom && <small className="fiche-apporteur">Apporteur : <strong>{apporteurNom}</strong></small>}
                    </div>
                  </div>

                  <ol className="fiche-frise" aria-label="Avancement du dossier">
                    {ETAPES_FRISE.map((e, i) => (
                      <li key={e.label} className={i < etape ? 'fait' : i === etape ? 'courant' : ''}>
                        <span>{i + 1}</span>
                        <div><b>{e.label}</b><small>{i < etape ? 'Terminé' : i === etape ? 'Étape actuelle' : 'À venir'}</small></div>
                      </li>
                    ))}
                  </ol>

                  <div className="fiche-montant">
                    <small>Facturé au partenaire (HT)</small>
                    <strong>{euro(montantDossier)}</strong>
                    <div className="fiche-barre"><i style={{ width: `${pct}%` }} /></div>
                    <div className="fiche-ligne"><span>Encaissé (HT)</span><b>{euro(encaisse)}</b></div>
                    <div className="fiche-ligne"><span>À encaisser (HT)</span><b>{euro(aEncaisser)}</b></div>
                    <div className="fiche-ligne"><span>À facturer (HT)</span><b>{euro(aFacturer)}</b></div>
                  </div>
                </div>
              )
            })()}

            {/* PARCOURS */}
            {(() => {
              const etapeCourante = (detail as any).parcours_etape as string | undefined
              const idx = indexEtape(etapeCourante)
              const def = etapeParcours(etapeCourante)
              return (
                <div className="card card-pad parcours-card" style={{ marginBottom: 14 }}>
                  <div className="font-semibold" style={{ marginBottom: 2 }}>Parcours du dossier</div>
                  <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
                    {def ? `Étape actuelle : ${def.label}${(detail as any).parcours_statut ? ` — ${(detail as any).parcours_statut}` : ''}` : 'Aucune étape définie : choisissez où en est le dossier.'}
                  </div>
                  <ol className="parcours-etapes" aria-label="Étapes du parcours">
                    {PARCOURS_CEE.map((e, i) => (
                      <li key={e.id} className={`${i < idx ? 'fait' : i === idx ? 'courant' : ''} ${e.objectif || ''}`}>
                        <button type="button" disabled={!isAdmin || parcoursSaving} onClick={() => void majParcours(e.id, e.id === etapeCourante ? ((detail as any).parcours_statut ?? null) : null)} title={isAdmin ? `Placer le dossier à l'étape « ${e.label} »` : e.label}>
                          <span>{i + 1}</span>{e.label}
                        </button>
                      </li>
                    ))}
                  </ol>
                  {def && (
                    <div style={{ marginTop: 12, maxWidth: 360 }}>
                      <FloatSelect
                        label={parcoursSaving ? 'Statut de l’étape — enregistrement…' : 'Statut de l’étape'}
                        value={(detail as any).parcours_statut || ''}
                        onChange={v => void majParcours(def.id, v || null)}
                        options={[{ value: '', label: 'Aucun statut' }, ...def.statuts.map(s => ({ value: s, label: s }))]}
                      />
                    </div>
                  )}
                </div>
              )
            })()}

            {/* MONTANTS EXISTANTS */}

            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div className="text-sm text-muted">
                  CA chantier (TTC)
                </div>

                <div className="font-semibold">
                  {euro(detail.montant_total)}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted">
                  Aides
                </div>

                <div className="font-semibold">
                  {euro(detail.aides_montant)}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted">
                  Reste à charge
                </div>

                <div className="font-semibold">
                  {euro(detail.reste_a_charge)}
                </div>
              </div>
            </div>

            {/* =================================================
                BLOC FINANCIER (lecture seule)
                ================================================= */}

            <div
              className="recap-card"
              style={{
                padding: 16,
                border: '1px solid var(--c-border, #e5e7eb)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <Euro size={17} />

                <div>
                  <div
                    className="font-semibold"
                    style={{ fontSize: 15 }}
                  >
                    Suivi financier
                  </div>

                  <div
                    className="text-sm text-muted"
                    style={{ marginTop: 2 }}
                  >
                    Commission générée automatiquement à la signature du devis (barème)
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    className="text-sm text-muted"
                    style={{ marginBottom: 5 }}
                  >
                    CA chantier (TTC)
                  </div>

                  <div className="font-semibold" style={{ fontSize: 16 }}>
                    {euro(detail.montant_total)}
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <div
                      className="text-sm text-muted"
                      style={{ marginBottom: 5 }}
                    >
                      Commission société
                    </div>

                    <div className="font-semibold" style={{ fontSize: 16 }}>
                      {commissionsParDevis[detail.devis_id || detail.id]
                        ? euro(commissionsParDevis[detail.devis_id || detail.id].montant_societe)
                        : totalFactureHtDetail > 0 ? euro(totalFactureHtDetail) : '—'}
                    </div>
                  </div>
                )}

                <div>
                  <div
                    className="text-sm text-muted"
                    style={{ marginBottom: 5 }}
                  >
                    Commission commerciale
                  </div>

                  <div className="font-semibold" style={{ fontSize: 16 }}>
                    {commissionsParDevis[detail.devis_id || detail.id]
                      ? euro(commissionsParDevis[detail.devis_id || detail.id].montant_commercial)
                      : '—'}
                  </div>
                </div>
              </div>

              {!commissionsParDevis[detail.devis_id || detail.id] && (
                <div
                  className="text-sm text-muted"
                  style={{ marginTop: 12 }}
                >
                  {detail.devis_id
                    ? "Pas encore de règle de rémunération applicable dans le barème pour ce devis — la commission s'affichera ici une fois la règle créée."
                    : "Ce dossier n'est rattaché à aucun devis signé."}
                </div>
              )}

              {isAdmin && (
                <div className="saisie-financiere" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border, #d9dfdf)' }}>
                  <div className="text-sm font-semibold" style={{ marginBottom: 8 }}>
                    {detail.devis_id ? 'Ajuster le montant du chantier' : 'Saisie manuelle (dossier sans devis signé)'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, alignItems: 'end' }}>
                    <label className="text-sm">Montant du chantier (€ TTC)
                      <input className="input" inputMode="decimal" value={saisieFin.montant} onChange={e => setSaisieFin(f => ({ ...f, montant: e.target.value }))} />
                    </label>
                    {!detail.devis_id && (
                      <>
                        <label className="text-sm">Commission commerciale (€)
                          <input className="input" inputMode="decimal" value={saisieFin.commercial} onChange={e => setSaisieFin(f => ({ ...f, commercial: e.target.value }))} />
                        </label>
                      </>
                    )}
                    <Button variant="primary" onClick={enregistrerSaisieFinanciere} disabled={saisieFinSaving}>
                      {saisieFinSaving ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                  </div>
                  {saisieFinMessage && <div className="text-sm text-muted" style={{ marginTop: 8 }} role="status">{saisieFinMessage}</div>}
                </div>
              )}
            </div>

            {isAdmin && (
            <div className="card card-pad" style={{ marginBottom: 14 }}>
              <div className="font-semibold" style={{ marginBottom: 4 }}>Facturation du dossier</div>
              <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
                Choisissez séparément l’entreprise qui émet la facture et l’entreprise destinataire. Les coordonnées légales doivent être renseignées dans les paramètres de chaque entreprise.
              </div>
              <div style={{ marginBottom: 12 }}>
                <FloatSelect
                  label={savingInstallateur ? 'Installateur du dossier — enregistrement…' : 'Installateur du dossier'}
                  value={detail.installateur_id || ''}
                  onChange={v => void changerInstallateurDossier(v)}
                  options={[
                    { value: '', label: 'Aucun installateur' },
                    ...installateursDossier.map(i => ({ value: i.id, label: i.nom })),
                  ]}
                />
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  Repris du devis signé à la création du dossier. C’est à lui qu’est adressée la facture partenaire quand le destinataire est « Installateur associé au dossier ».
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, alignItems: 'end' }}>
                <FloatSelect
                  label="Entreprise émettrice"
                  value={detailFacturationOrganisationId}
                  onChange={setDetailFacturationOrganisationId}
                  options={organisations.map(org => ({ value: org.id, label: org.nom }))}
                />
                <FloatSelect
                  label="Destinataire de la facture"
                  value={detailDestinataireOrganisationId}
                  onChange={setDetailDestinataireOrganisationId}
                  options={[
                    { value: '', label: 'Installateur associé au dossier' },
                    ...organisations.map(org => ({ value: org.id, label: org.nom })),
                  ]}
                />
                <Button variant="secondary" onClick={enregistrerConfigurationFacturation} disabled={savingFacturationConfig || !detailFacturationOrganisationId}>
                  {savingFacturationConfig ? 'Enregistrement…' : 'Enregistrer la facturation'}
                </Button>
              </div>
            </div>
            )}

            {/* STATUT + DATE D'INSTALLATION */}
            <div style={{ display:'grid', gridTemplateColumns:'minmax(220px,1fr) minmax(180px,260px) auto', gap:8, alignItems:'end' }}>
              <FloatSelect label="Statut du dossier" value={detailStatut} onChange={setDetailStatut} options={STATUTS_DOSSIER} />
              <FloatInput label="Date d'installation" type="date" value={detailDateInstallation} onChange={setDetailDateInstallation} disabled={!isAdmin} />
              <Button
                variant="secondary"
                onClick={enregistrerStatut}
                disabled={savingStatut || (!isAdmin && (detailStatut !== detail.statut || detailDateInstallation !== (detail.date_installation || '')))}
              >
                {savingStatut ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
            {!isAdmin && <div className="text-xs text-muted">Seul l’administrateur peut modifier le statut et la date d’installation.</div>}
            {detail.date_installation && (
              <div className="text-sm text-muted" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <CalendarCheck2 size={15} /> Installation réalisée le <strong>{new Date(detail.date_installation).toLocaleDateString('fr-FR')}</strong>
              </div>
            )}

            {/* FACTURATION PARTENAIRE */}
            {isAdmin && <div className="recap-card" style={{ padding: 16, border: '1px solid var(--c-border, #e5e7eb)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Receipt size={17} />
                <div><div className="font-semibold" style={{ fontSize: 15 }}>Facturation partenaire</div><div className="text-sm text-muted">Découpez la commission société en plusieurs échéances et facturez-les directement depuis le dossier.</div></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'minmax(160px,1.5fr) minmax(100px,1fr) 90px minmax(150px,1fr) auto', gap:8, alignItems:'end' }}>
                <FloatInput label="Libellé" value={factureForm.libelle} onChange={v=>setFactureForm(f=>({...f,libelle:v}))} />
                <FloatInput label="Montant HT" value={factureForm.montant_ht} onChange={v=>setFactureForm(f=>({...f,montant_ht:v}))} />
                <FloatInput label="TVA %" value={factureForm.taux_tva} onChange={v=>setFactureForm(f=>({...f,taux_tva:v}))} />
                <FloatSelect label="Échéance" value={factureForm.declencheur} onChange={v=>setFactureForm(f=>({...f,declencheur:v}))} options={[{value:'installation',label:"À l'installation"},{value:'mpr',label:'Au paiement MaPrimeRénov’'},{value:'autre',label:'Autre échéance'}]} />
                <Button variant="secondary" onClick={editingFacturationId ? enregistrerModificationEcheance : ajouterEcheanceFacturation} disabled={factureSaving}><PlusCircle size={14}/> {editingFacturationId ? 'Enregistrer' : 'Ajouter'}</Button>{editingFacturationId && <Button variant="ghost" onClick={()=>setEditingFacturationId(null)}>Annuler</Button>}
              </div>
              <div style={{marginTop:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                <div className="text-sm text-muted">Chaque échéance peut donner lieu à une facture distincte : installation, paiement MaPrimeRénov’ ou autre jalon. Commission société du dossier : <strong>{commissionsParDevis[detail.devis_id || detail.id] ? euro(commissionsParDevis[detail.devis_id || detail.id].montant_societe) : '—'}</strong>.</div>
                {!editingFacturationId && <Button variant="primary" onClick={genererFactureDepuisCommission} disabled={factureSaving}><Receipt size={14}/> {factureSaving ? 'Génération…' : 'Ajouter et générer la facture'}</Button>}
              </div>
              {facturation.length===0 ? <div className="text-sm text-muted" style={{marginTop:12}}>Aucune échéance enregistrée pour le moment.</div> : <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:8}}>
                {facturation.map(ligne=>{const ht=Number(ligne.montant_ht)||0;const ttc=ht*(1+(Number(ligne.taux_tva)||0)/100);const annulee=ligne.statut==='annulee';return <div key={ligne.id} style={{display:'grid',gridTemplateColumns:'minmax(180px,1fr) 110px 120px minmax(130px,1fr) auto',gap:8,alignItems:'center',padding:'10px 0',borderTop:'1px solid #edf1ef',opacity: annulee ? 0.65 : 1}}>
                  <div><strong>{ligne.libelle}</strong><div className="text-sm text-muted">{ligne.declencheur==='installation'?'À l’installation':ligne.declencheur==='mpr'?'Au paiement MaPrimeRénov’':'Autre échéance'}</div></div>
                  <strong>{euro(ht)} HT</strong><span>{euro(ttc)} TTC</span><span className={`badge ${ligne.statut==='payee'?'badge-success':ligne.statut==='facturee'?'badge-info':annulee?'badge-error':'badge-warning'}`}>{ligne.statut==='a_facturer'?'À facturer':ligne.statut==='facturee'?'Facturée':ligne.statut==='payee'?'Payée':'Annulée'}{ligne.facture_numero?` · ${ligne.facture_numero}`:''}</span>
                  <div style={{display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap'}}>{ligne.statut==='a_facturer'&&<><Button size="sm" variant="ghost" onClick={()=>{setEditingFacturationId(ligne.id);setFactureForm({libelle:ligne.libelle,montant_ht:String(ligne.montant_ht),taux_tva:String(ligne.taux_tva),declencheur:ligne.declencheur})}}>Éditer</Button><Button size="sm" variant="secondary" onClick={()=>genererFactureEcheance(ligne)} disabled={factureSaving}><Receipt size={13}/> Facturer</Button></>}{ligne.statut==='facturee' && <Button size="sm" variant="secondary" onClick={()=>renvoyerFactureParEmail(ligne)} disabled={factureSaving}>{ligne.email_envoye_at?'Renvoyer l’e-mail':'Envoyer par e-mail'}</Button>}{!annulee&&<Button size="sm" variant="ghost" onClick={()=>supprimerEcheanceFacturation(ligne)}>{ligne.statut==='a_facturer'?'Supprimer':'Annuler'}</Button>}</div>{ligne.email_erreur && <div className="text-xs" style={{gridColumn:'1 / -1',color:'#b91c1c'}}>{ligne.email_erreur}</div>}
                </div>})}
                <div style={{display:'flex',justifyContent:'space-between',paddingTop:8,fontWeight:700}}><span>Total des échéances non annulées</span><span>{euro(facturation.filter(x=>x.statut!=='annulee').reduce((s,x)=>s+Number(x.montant_ht||0),0))} HT</span></div>
              </div>}
            </div>}

            <SuiviAidesPanel
              key={detail.id}
              dossier={detail as any}
              prospect={detail.prospect as any}
              signatureDevis={signatureDevisDetail}
              pieces={pieces as any}
              onChange={() => void rechargerSuivi()}
            />

            {/* ÉTAT DOSSIER */}

            <div
              className="recap-card"
              style={{ padding: 14 }}
            >
              {(() => {
                const attendues = pieces.length

                const recues = pieces.filter(
                  p => p.recu || p.url
                ).length

                const score = attendues
                  ? Math.round(
                      (recues / attendues) * 100
                    )
                  : 0

                const actions: string[] = []

                if (score < 100) {
                  actions.push(
                    `${attendues - recues} pièce(s) encore manquante(s)`
                  )
                }

                if (!detail.visite_id) {
                  actions.push(
                    'Visite technique non rattachée'
                  )
                }

                if (!detail.devis_id) {
                  actions.push(
                    'Devis non rattaché'
                  )
                }

                if (
                  detail.statut === 'installation' &&
                  !detail.installateur_id
                ) {
                  actions.push(
                    'Installateur à affecter'
                  )
                }

                return (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div className="text-sm text-muted">
                          État du dossier
                        </div>

                        <strong
                          style={{ fontSize: 22 }}
                        >
                          {score}% complet
                        </strong>
                      </div>

                      <span
                        className={`badge ${
                          score === 100
                            ? 'badge-success'
                            : score >= 70
                              ? 'badge-warning'
                              : 'badge-error'
                        }`}
                      >
                        {score === 100
                          ? 'Prêt'
                          : score >= 70
                            ? 'À compléter'
                            : 'Incomplet'}
                      </span>
                    </div>

                    {actions.length > 0 && (
                      <div
                        className="text-sm text-muted"
                        style={{ marginTop: 8 }}
                      >
                        Prochaines actions :{' '}
                        {actions.join(' · ')}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* PIÈCES */}

            <div>
              <div
                className="section-label"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <FileText size={16} />
                Pièces à recueillir
              </div>

              {uploadError && (
                <div
                  className="text-sm"
                  style={{
                    color: 'var(--c-error)',
                    marginTop: 6,
                  }}
                >
                  {uploadError}
                </div>
              )}

              {pieces.length === 0 ? (
                <p className="text-sm text-muted">
                  Aucune pièce suivie pour ce dossier.
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {pieces.map(p => {
                    const inputId =
                      `piece-upload-${p.id}`

                    const isUploading =
                      uploadingPieceId === p.id

                    return (
                      <div
                        key={p.id}
                        className="recap-card"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                          padding: 10,
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            minWidth: 140,
                          }}
                        >
                          {p.nom}
                        </span>

                        {p.recu ? (
                          <span className="badge badge-success">
                            <Check size={12} />
                            Reçu
                          </span>
                        ) : (
                          <span className="badge badge-neutral">
                            Attendu
                          </span>
                        )}

                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-icon-sm"
                            title="Voir le fichier"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}

                        <input
                          id={inputId}
                          type="file"
                          hidden
                          onChange={e =>
                            uploaderPiece(
                              p,
                              e.target.files?.[0] ||
                                null
                            )
                          }
                        />

                        <label
                          htmlFor={inputId}
                          className="btn btn-sm btn-secondary"
                          style={{
                            cursor: 'pointer',
                          }}
                        >
                          {isUploading ? (
                            <Loader2
                              size={14}
                              className="spin"
                            />
                          ) : (
                            <Upload size={14} />
                          )}

                          {isUploading
                            ? 'Envoi…'
                            : p.url
                              ? 'Remplacer'
                              : 'Envoyer'}
                        </label>

                        {p.url && (
                          <button
                            className="btn-icon-sm"
                            title="Retirer le fichier"
                            onClick={() =>
                              retirerFichier(p)
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        {p.type === 'autre' && (
                          <button
                            className="btn-icon-sm"
                            title="Supprimer cette pièce"
                            onClick={() =>
                              supprimerPieceLibre(p)
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-3">
                <input
                  ref={extraFileInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={e =>
                    ajouterPieceLibre(e.target.files)
                  }
                />

                <Button
                  variant="secondary"
                  onClick={() =>
                    extraFileInputRef.current?.click()
                  }
                  disabled={addingPiece}
                >
                  {addingPiece ? (
                    <Loader2
                      size={16}
                      className="spin"
                    />
                  ) : (
                    <Plus size={16} />
                  )}

                  {addingPiece
                    ? 'Envoi…'
                    : 'Ajouter une pièce'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}