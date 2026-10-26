import { useEffect, useState, useMemo } from 'react'
import {
  Plus, Search, ChevronLeft, ChevronRight, Check, Phone, Mail, MapPin,
  Pencil, Trash2, Zap, Home, Wrench, User, Users, Wallet, ArrowRight,
  AlertTriangle, FileText, Calendar, LayoutGrid, List as ListIcon,
  Flame, Snowflake, Minus, Tag, X as XIcon, UploadCloud, Download,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Prospect, CrmTask } from '../types'
import { FloatInput, FloatSelect, FloatTextarea } from '../components/ui/FloatInput'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { AddressAutocomplete } from '../components/shared/AddressAutocomplete'
import { determinerCategorieRevenu, estIleDeFrance } from '../lib/moteurAides'
import { PipelineBoard } from '../components/crm/PipelineBoard'
import { Timeline } from '../components/crm/Timeline'
import { TasksPanel } from '../components/crm/TasksPanel'
import { ProspectChat } from '../components/crm/ProspectChat'
import { PIPELINE_STAGES, TEMPERATURES, euro, stageOf } from '../lib/crm/constants'
import { EmailProspectModal } from '../components/crm/EmailProspectModal'
import { useAuth } from '../lib/auth/AuthContext'
import { uploadDocument } from '../lib/storage/uploadDocument'
import { resolveDocumentRows } from '../lib/storage/documentUrl'
import { ProspectShareControl } from '../components/crm/ProspectShareControl'

interface Props {
  onProspectClick?: (p: Prospect) => void
  /** Redirige vers la page adaptée à la prochaine étape du cycle de vie du prospect (VT, devis, dossier). */
  onContinueLifecycle?: (target: 'visite' | 'simulation' | 'devis' | 'dossier', prospect: Prospect) => void
  initialView?: 'liste' | 'pipeline'
}

const CIVILITES = [
  { value: 'M.', label: 'M.' },
  { value: 'Mme', label: 'Mme' },
  { value: 'M. et Mme', label: 'M. et Mme' },
]

const STATUTS = [
  { value: 'Nouveau', label: 'Nouveau' },
  { value: 'Qualifié', label: 'Qualifié' },
  { value: 'Visite planifiée', label: 'Visite planifiée' },
  { value: 'Visite faite', label: 'Visite faite' },
  { value: 'Dossier', label: 'Dossier' },
  { value: 'Signé', label: 'Signé' },
  { value: 'Installation', label: 'Installation' },
  { value: 'Installé', label: 'Installé' },
]

const STATUTS_OCC = [
  { value: 'propriétaire_occupant', label: 'Propriétaire occupant' },
  { value: 'locataire', label: 'Locataire' },
  { value: 'bailleur', label: 'Bailleur' },
  { value: 'syndic', label: 'Syndic' },
]

const SOURCES = [
  'Site web', 'Appel entrant', 'Parrainage', 'Partenaire',
  'Salon / événement', 'Facebook / Instagram', 'Autre',
]

const FICHES_CEE = [
  { code: 'BAR-EN-101', cat: 'Isolation murs ITI', title: 'Isolation des murs en ITI', desc: 'Isolation thermique par l\'intérieur des murs', group: 'Isolation' },
  { code: 'BAR-EN-102', cat: 'Isolation murs ITE', title: 'Isolation thermique par l\'extérieur', desc: 'Isolation des murs par l\'extérieur (ITE)', group: 'Isolation' },
  { code: 'BAR-EN-103', cat: 'Isolation combles', title: 'Isolation des combles et toitures', desc: 'Isolation en toiture / combles perdus', group: 'Isolation' },
  { code: 'BAR-EN-104', cat: 'Isolation rampants', title: 'Isolation des rampants de toiture', desc: 'Isolation sous-rampants / fenêtres de toiture', group: 'Isolation' },
  { code: 'BAR-EN-105', cat: 'Isolation plancher', title: 'Isolation du plancher bas', desc: 'Isolation plancher bas / vide sanitaire', group: 'Isolation' },
  { code: 'BAR-TH-112', cat: 'PAC air/eau', title: 'Pompe à chaleur air/eau', desc: 'PAC air/eau pour chauffage central', group: 'Chauffage' },
  { code: 'BAR-TH-113', cat: 'PAC géothermique', title: 'PAC géothermique / hydrothermie', desc: 'PAC sur capteurs enterrés / eau', group: 'Chauffage' },
  { code: 'BAR-TH-127', cat: 'Chaudière biomasse', title: 'Chaudière biomasse', desc: 'Chaudière à granulés / bois', group: 'Chauffage' },
  { code: 'BAR-TH-129', cat: 'CESI', title: 'Chauffe-eau solaire individuel', desc: 'Production d\'eau chaude sanitaire solaire', group: 'Eau chaude' },
  { code: 'BAR-TH-174', cat: 'Rénovation d\'ampleur', title: 'Rénovation d\'ampleur (BAR TH 174)', desc: 'Rénovation globale par saut de classes DPE', group: 'Rénovation globale' },
  { code: 'BAR-VENT-132', cat: 'VMC double flux', title: 'VMC double flux', desc: 'Ventilation mécanique double flux', group: 'Ventilation' },
  { code: 'BAR-EN-104-FEN', cat: 'Fenêtres', title: 'Fenêtres double vitrage', desc: 'Remplacement des menuiseries', group: 'Isolation' },
  { code: 'VISITE-TECHNIQUE', cat: 'Visite technique', title: 'Visite technique / audit', desc: 'Audit énergétique préalable, sans engagement contractuel', group: 'Services' },
]

const LIFECYCLE_STEPS = [
  { num: 1, title: 'Prospect', sub: 'Créé' },
  { num: 2, title: 'Visite technique', sub: 'Audit énergétique' },
  { num: 3, title: 'Simulation', sub: 'Calcul 3CL + aides' },
  { num: 4, title: 'Proposition', sub: 'Devis & contrat' },
  { num: 5, title: 'Dossier', sub: 'Suivi travaux' },
]

function statutToStep(statut: string): number {
  const s = statut?.toLowerCase() || ''
  if (s.includes('signé') || s.includes('signe')) return 5
  if (s.includes('dossier')) return 4
  if (s.includes('visite faite') || s.includes('visite_faite')) return 3
  if (s.includes('visite planif') || s.includes('visite_planifiee')) return 2
  if (s.includes('qualif')) return 2
  return 1
}

function statutClass(statut: string): string {
  const s = statut?.toLowerCase() || 'nouveau'
  if (s.includes('install')) return 'prospect-status-visite'
  if (s.includes('signé') || s.includes('signe')) return 'prospect-status-signe'
  if (s.includes('qualif')) return 'prospect-status-qualifie'
  if (s.includes('visite')) return 'prospect-status-visite'
  if (s.includes('dossier')) return 'prospect-status-brouillon'
  return 'prospect-status-nouveau'
}

function statutLabel(statut: string): string {
  const found = STATUTS.find(s => s.value.toLowerCase() === (statut || '').toLowerCase())
  return found?.label || statut || 'Nouveau'
}

const AVATAR_COLORS = ['#2D6A4F', '#1B4332', '#52B788', '#3A86C8', '#D4A574', '#E8A317', '#D62828', '#7B2D8E']

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(prenom: string, nom: string): string {
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?'
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TYPES_PROSPECT = [
  { value: 'particulier', label: 'Particulier' },
  { value: 'professionnel', label: 'Professionnel (entreprise, copropriété…)' },
]

const EMPTY_FORM = {
  type_prospect: 'particulier' as 'particulier' | 'professionnel',
  raison_sociale: '', siret: '',
  civilite: 'M.', nom: '', prenom: '', telephone: '', email: '',
  adresse_rue: '', adresse_complement: '', code_postal: '', ville: '',
  statut_occupation: 'propriétaire_occupant', nombre_personnes_foyer: 1,
  rfr: '', prenom_conjoint: '', nom_conjoint: '',
  zone_climatique: '', regime_aide_commission: '',
  source: 'Site web', commentaires: '', fiches_cee: [] as string[],
}

export function ProspectsPage({ onProspectClick, onContinueLifecycle, initialView = 'liste' }: Props) {
  const { profile } = useAuth()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [temperatureFilter, setTemperatureFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [commercialFilter, setCommercialFilter] = useState('')
  const [potCommunOnly, setPotCommunOnly] = useState(false)
  const [selected, setSelected] = useState<Prospect | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [emailOuvert, setEmailOuvert] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const [confirmDelete, setConfirmDelete] = useState<Prospect | null>(null)
  const [view, setView] = useState<'liste' | 'pipeline'>(initialView)
  useEffect(() => { setView(initialView) }, [initialView])
  const [tasksByProspect, setTasksByProspect] = useState<Record<string, CrmTask[]>>({})
  const [linkedCounts, setLinkedCounts] = useState<{ visites: number; simulations: number; devis: number; dossiers: number } | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [timelineRefresh, setTimelineRefresh] = useState(0)
  const [prospectDocuments, setProspectDocuments] = useState<any[]>([])
  const [uploadingPartnerQuote, setUploadingPartnerQuote] = useState(false)
  const [partnerQuotePartnerId, setPartnerQuotePartnerId] = useState('')
  const [partnerQuoteInput, setPartnerQuoteInput] = useState<HTMLInputElement | null>(null)
  const [commerciaux, setCommerciaux] = useState<{ id: string; nom_complet: string; role: string }[]>([])
  const [anciensCommerciaux, setAnciensCommerciaux] = useState<{ id: string; nom_complet: string }[]>([])
  const [installateurs, setInstallateurs] = useState<{ id: string; nom: string; actif: boolean }[]>([])
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  const extended = (p: Prospect): any => p as any

  async function fetchProspects() {
    if (profile?.role === 'admin') await actualiserPotCommun()
    let canViewTeam = ['admin', 'manager', 'partner_admin', 'company_admin'].includes(profile?.role || '')
    if (!canViewTeam && profile?.id) {
      const { data: directReports } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', profile.id)
        .limit(1)
      canViewTeam = Boolean(directReports?.length)
    }
    let query = supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false })
    if (!canViewTeam && profile?.id) {
      query = query.or(`commercial_id.eq.${profile.id},pot_commun.eq.true`)
    }
    const { data, error } = await query
    if (error) { setProspects([]); return }
    setProspects((data || []) as Prospect[])
  }

  async function fetchCommerciaux() {
    const { data } = await supabase.from('profiles').select('id, nom_complet, role, manager_id, organisation_id').order('nom_complet')
    setCommerciaux((data || []) as any)
    const { data: anciens } = await supabase.from('commerciaux_historique').select('id, nom_complet').order('nom_complet')
    setAnciensCommerciaux((anciens || []) as any)
  }

  // Le pot commun est désormais actualisé chaque nuit côté serveur (tâche planifiée pg_cron).
  async function actualiserPotCommun() {}

  async function fetchInstallateurs() {
    if (!['admin', 'manager', 'partner_admin', 'company_admin'].includes(profile?.role || '')) {
      setInstallateurs([])
      return
    }
    const { data } = await supabase.from('installateurs').select('id, nom, actif').eq('actif', true).order('nom')
    setInstallateurs((data || []) as any)
  }

  async function fetchOpenTasks() {
    const { data } = await supabase.from('tasks').select('*').eq('done', false).order('due_at', { ascending: true, nullsFirst: false })
    const map: Record<string, CrmTask[]> = {}
    ;(data || []).forEach((t: any) => {
      if (!map[t.prospect_id]) map[t.prospect_id] = []
      map[t.prospect_id].push(t)
    })
    setTasksByProspect(map)
  }

  useEffect(() => {
    if (!profile) return
    Promise.all([fetchProspects(), fetchOpenTasks(), fetchCommerciaux(), fetchInstallateurs()]).finally(() => setLoading(false))
  }, [profile?.id, profile?.role])

  async function fetchProspectDocuments(prospectId: string) {
    const { data } = await supabase
      .from('documents')
      .select('id, nom, type, taille, url, categorie, partenaire_id, created_at')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false })
    setProspectDocuments(await resolveDocumentRows(data || []))
  }

  async function ajouterDevisPartenaire(files: FileList | null) {
    if (!files || files.length === 0 || !selected) return
    setUploadingPartnerQuote(true)
    for (const file of Array.from(files)) {
      const partnerId = (selected as any).installateur_id || null
      const { error } = await uploadDocument(file, {
        prospectId: selected.id,
        type: 'devis_partenaire',
        categorie: 'Devis partenaire',
        partenaireId: partnerQuotePartnerId || partnerId,
      })
      if (error) window.alert(`Impossible d'ajouter \"${file.name}\" : ${error}`)
    }
    await fetchProspectDocuments(selected.id)
    setUploadingPartnerQuote(false)
    if (partnerQuoteInput) partnerQuoteInput.value = ''
  }

  async function fetchLinkedCounts(prospectId: string) {
    setLinkedCounts(null)
    const [v, s, d, dos] = await Promise.all([
      supabase.from('visites').select('id', { count: 'exact', head: true }).eq('prospect_id', prospectId),
      supabase.from('simulations').select('id', { count: 'exact', head: true }).eq('prospect_id', prospectId),
      supabase.from('devis').select('id', { count: 'exact', head: true }).eq('prospect_id', prospectId),
      supabase.from('dossiers').select('id', { count: 'exact', head: true }).eq('prospect_id', prospectId),
    ])
    setLinkedCounts({
      visites: v.count || 0, simulations: s.count || 0, devis: d.count || 0, dossiers: dos.count || 0,
    })
  }

  useEffect(() => {
    if (selected) {
      fetchLinkedCounts(selected.id)
      fetchProspectDocuments(selected.id)
      setPartnerQuotePartnerId((selected as any).installateur_id || '')
    } else {
      setProspectDocuments([])
    }
  }, [selected?.id])

  async function updateStage(prospectId: string, newStatut: string) {
    const prospect = prospects.find(p => p.id === prospectId)
    if (!prospect || stageOf(prospect.statut).value === newStatut) return
    setProspects(ps => ps.map(p => p.id === prospectId ? { ...p, statut: newStatut } : p))
    if (selected?.id === prospectId) setSelected(s => s ? { ...s, statut: newStatut } : s)
    await supabase.from('prospects').update({ statut: newStatut }).eq('id', prospectId)
    await supabase.from('interactions').insert({
      prospect_id: prospectId, type: 'statut', auteur: profile?.nom_complet || 'Vous',
      contenu: `Étape changée : ${newStatut}`,
    })
    setTimelineRefresh(r => r + 1)
  }

  async function updateProspectField(field: string, value: unknown) {
    if (!selected) return
    setSelected(s => s ? { ...s, [field]: value } as Prospect : s)
    setProspects(ps => ps.map(p => p.id === selected.id ? { ...p, [field]: value } as Prospect : p))
    await supabase.from('prospects').update({ [field]: value }).eq('id', selected.id)
  }

  function addTag() {
    if (!selected || !tagInput.trim()) return
    const tags = Array.from(new Set([...(selected.tags || []), tagInput.trim()]))
    updateProspectField('tags', tags)
    setTagInput('')
  }

  function removeTag(tag: string) {
    if (!selected) return
    updateProspectField('tags', (selected.tags || []).filter(t => t !== tag))
  }

  const sourcesDisponibles = useMemo(
    () => Array.from(new Set(prospects.map(p => p.source).filter(Boolean))).sort(),
    [prospects]
  )
  const tagsDisponibles = useMemo(
    () => Array.from(new Set(prospects.flatMap(p => p.tags || []))).sort(),
    [prospects]
  )

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      const e = extended(p)
      const q = search.toLowerCase()
      const matchesSearch = !q ||
        `${e.prenom} ${e.nom}`.toLowerCase().includes(q) ||
        (e.ville || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        (e.telephone || '').toLowerCase().includes(q)
      const matchesStatut = !statutFilter ||
        (e.statut || '').toLowerCase() === statutFilter.toLowerCase()
      const matchesTemperature = !temperatureFilter || (p.temperature || 'tiede') === temperatureFilter
      const matchesSource = !sourceFilter || p.source === sourceFilter
      const matchesTag = !tagFilter || (p.tags || []).includes(tagFilter)
      const matchesCommercial = !commercialFilter || p.commercial_id === commercialFilter
      const matchesPool = !potCommunOnly || !!(p as any).pot_commun
      return matchesSearch && matchesStatut && matchesTemperature && matchesSource && matchesTag && matchesCommercial && matchesPool
    })
  }, [prospects, search, statutFilter, temperatureFilter, sourceFilter, tagFilter, commercialFilter, potCommunOnly])

  const filtresActifsCount = [temperatureFilter, sourceFilter, tagFilter, commercialFilter, potCommunOnly ? 'pot' : ''].filter(Boolean).length

  function reinitialiserFiltres() {
    setStatutFilter(''); setTemperatureFilter(''); setSourceFilter(''); setTagFilter(''); setCommercialFilter(''); setPotCommunOnly(false)
  }

  function openWizard() {
    setForm({ ...EMPTY_FORM })
    setWizardStep(1)
    setWizardOpen(true)
  }

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function toggleFiche(code: string) {
    setForm(f => ({
      ...f,
      fiches_cee: f.fiches_cee.includes(code)
        ? f.fiches_cee.filter(c => c !== code)
        : [...f.fiches_cee, code],
    }))
  }

  const rfrNum = typeof form.rfr === 'string' ? parseFloat(form.rfr) || 0 : form.rfr
  const ileDeFrance = useMemo(() => estIleDeFrance(form.code_postal), [form.code_postal])

  const categorie = useMemo(() => {
    if (rfrNum <= 0) return null
    return determinerCategorieRevenu(rfrNum, form.nombre_personnes_foyer, ileDeFrance)
  }, [rfrNum, form.nombre_personnes_foyer, ileDeFrance])

  const fichesByGroup = useMemo(() => {
    const groups: Record<string, typeof FICHES_CEE> = {}
    FICHES_CEE.forEach(f => {
      if (!groups[f.group]) groups[f.group] = []
      groups[f.group].push(f)
    })
    return groups
  }, [])

  async function saveProspect() {
    if (form.type_prospect === 'professionnel' ? !form.raison_sociale : !(form.nom && form.prenom)) return
    setSaving(true)

    // Relire l'identité et l'organisation depuis Supabase juste avant l'insertion :
    // le contrôle RLS s'appuie sur auth.uid(), pas seulement sur l'état React du profil.
    const { data: authResult, error: authError } = await supabase.auth.getUser()
    if (authError || !authResult.user) {
      setSaving(false)
      alert("Création du prospect impossible : session expirée. Reconnectez-vous puis réessayez.")
      return
    }

    const { data: creatorProfile, error: creatorProfileError } = await supabase
      .from('profiles')
      .select('id, nom_complet, role, organisation_id')
      .eq('id', authResult.user.id)
      .maybeSingle()

    if (creatorProfileError || !creatorProfile) {
      setSaving(false)
      alert("Création du prospect impossible : profil utilisateur introuvable. Reconnectez-vous ou contactez l'administrateur.")
      return
    }
    if (!creatorProfile.organisation_id) {
      setSaving(false)
      alert("Création du prospect impossible : votre compte n'est rattaché à aucune entreprise. Contactez l'administrateur.")
      return
    }

    const payload: any = {
      type_prospect: form.type_prospect,
      raison_sociale: form.type_prospect === 'professionnel' ? (form.raison_sociale || null) : null,
      siret: form.type_prospect === 'professionnel' ? (form.siret || null) : null,
      civilite: form.civilite,
      prenom: form.prenom,
      nom: form.nom,
      telephone: form.telephone || null,
      email: form.email || null,
      adresse_rue: form.adresse_rue || null,
      adresse_complement: form.adresse_complement || null,
      adresse: form.adresse_rue || null,
      code_postal: form.code_postal || null,
      ville: form.ville || null,
      statut_occupation: form.statut_occupation,
      nombre_personnes_foyer: form.nombre_personnes_foyer,
      rfr: rfrNum || null,
      categorie_mpr: categorie?.categorie || null,
      zone_climatique: form.zone_climatique || null,
      regime_aide_commission: form.regime_aide_commission || null,
      zone_ile_de_france: ileDeFrance,
      prenom_conjoint: form.civilite === 'M. et Mme' ? form.prenom_conjoint || null : null,
      nom_conjoint: form.civilite === 'M. et Mme' ? form.nom_conjoint || null : null,
      source: form.source,
      commentaires: form.commentaires || null,
      fiches_cee: form.fiches_cee,
      statut: 'Nouveau',
      commercial: creatorProfile.nom_complet || null,
      commercial_id: authResult.user.id,
      organisation_id: creatorProfile.organisation_id,
    }
    const { data: nouveauProspect, error: insertError } = await supabase.from('prospects').insert(payload).select('id').single()
    setSaving(false)
    if (insertError || !nouveauProspect) { alert(`Création du prospect impossible : ${insertError?.message || 'erreur inconnue'}`); return }
    const { error: notificationError, data: notificationResult } = await supabase.functions.invoke('notify-new-prospect', { body: { prospectIds: [nouveauProspect.id] } })
    if (notificationError || notificationResult?.error) console.warn('Prospect créé, mais e-mail de notification non envoyé :', notificationError?.message || notificationResult?.error)
    setWizardOpen(false)
    fetchProspects()
  }

  function openEdit(p: Prospect) {
    const e = extended(p)
    setEditForm({
      type_prospect: (e.type_prospect as 'particulier' | 'professionnel') || 'particulier',
      raison_sociale: e.raison_sociale || '', siret: e.siret || '',
      civilite: e.civilite || 'M.',
      nom: p.nom || '', prenom: p.prenom || '',
      telephone: p.telephone || '', email: p.email || '',
      adresse_rue: e.adresse_rue || p.adresse || '',
      adresse_complement: e.adresse_complement || '',
      code_postal: p.code_postal || '', ville: p.ville || '',
      statut_occupation: e.statut_occupation || 'propriétaire_occupant',
      nombre_personnes_foyer: e.nombre_personnes_foyer || 1,
      rfr: e.rfr ? String(e.rfr) : '',
      zone_climatique: e.zone_climatique || '',
      regime_aide_commission: e.regime_aide_commission || '',
      prenom_conjoint: e.prenom_conjoint || '',
      nom_conjoint: e.nom_conjoint || '',
      source: p.source || 'Site web',
      commentaires: e.commentaires || p.notes || '',
      fiches_cee: e.fiches_cee || [],
    })
    setEditModal(true)
  }

  async function saveEdit() {
    if (!selected) return
    const e = extended(selected)
    const rfrEditNum = parseFloat(editForm.rfr) || 0
    const ileDeFranceEdit = estIleDeFrance(editForm.code_postal)
    const cat = rfrEditNum > 0 ? determinerCategorieRevenu(rfrEditNum, editForm.nombre_personnes_foyer, ileDeFranceEdit) : null
    const payload: any = {
      type_prospect: editForm.type_prospect,
      raison_sociale: editForm.type_prospect === 'professionnel' ? (editForm.raison_sociale || null) : null,
      siret: editForm.type_prospect === 'professionnel' ? (editForm.siret || null) : null,
      civilite: editForm.civilite,
      prenom: editForm.prenom, nom: editForm.nom,
      telephone: editForm.telephone || null,
      email: editForm.email || null,
      adresse_rue: editForm.adresse_rue || null,
      adresse: editForm.adresse_rue || null,
      adresse_complement: editForm.adresse_complement || null,
      code_postal: editForm.code_postal || null,
      ville: editForm.ville || null,
      statut_occupation: editForm.statut_occupation,
      nombre_personnes_foyer: editForm.nombre_personnes_foyer,
      rfr: rfrEditNum || null,
      categorie_mpr: cat?.categorie || null,
      zone_climatique: editForm.zone_climatique || null,
      regime_aide_commission: editForm.regime_aide_commission || null,
      zone_ile_de_france: ileDeFranceEdit,
      prenom_conjoint: editForm.civilite === 'M. et Mme' ? editForm.prenom_conjoint || null : null,
      nom_conjoint: editForm.civilite === 'M. et Mme' ? editForm.nom_conjoint || null : null,
      source: editForm.source,
      commentaires: editForm.commentaires || null,
      fiches_cee: editForm.fiches_cee,
    }
    await supabase.from('prospects').update(payload).eq('id', selected.id)
    setEditModal(false)
    fetchProspects().then(() => {
      const updated = prospects.find(p => p.id === selected.id)
      if (updated) setSelected({ ...updated, ...payload } as Prospect)
    })
  }

  function setEdit<K extends keyof typeof editForm>(key: K, val: (typeof editForm)[K]) {
    setEditForm(f => ({ ...f, [key]: val }))
  }

  function toggleEditFiche(code: string) {
    setEditForm(f => ({
      ...f,
      fiches_cee: f.fiches_cee.includes(code)
        ? f.fiches_cee.filter(c => c !== code)
        : [...f.fiches_cee, code],
    }))
  }

  async function deleteProspect() {
    if (!confirmDelete) return
    await supabase.from('prospects').delete().eq('id', confirmDelete.id)
    setConfirmDelete(null)
    if (selected?.id === confirmDelete.id) setSelected(null)
    fetchProspects()
  }

  const stepValid = form.adresse_rue && (
    form.type_prospect === 'professionnel' ? !!form.raison_sociale : !!(form.nom && form.prenom)
  )

  // ===== DETAIL VIEW =====
  if (selected) {
    const e = extended(selected)
    const currentStep = statutToStep(e.statut || 'Nouveau')
    const ceeCount = (e.fiches_cee || []).length
    const catLabel = e.categorie_mpr ? (
      { TresModeste: 'Très modeste', Modeste: 'Modeste', Intermediaire: 'Intermédiaire', Aisee: 'Aisée' } as Record<string, string>
    )[e.categorie_mpr] || e.categorie_mpr : null

    // Cible de la prochaine étape du cycle de vie (Visite technique -> Simulation -> Devis -> Dossier).
    const nextActionTarget: 'visite' | 'simulation' | 'devis' | 'dossier' | null =
      currentStep <= 2 ? 'visite' : currentStep === 3 ? 'devis' : currentStep === 4 ? 'dossier' : null

    function goToNextAction() {
      if (!nextActionTarget) return
      onContinueLifecycle?.(nextActionTarget, selected!)
    }

    return (
      <div className="page-scroll">
        <div className="prospect-detail-wrap">
          <div className="prospect-breadcrumb" onClick={() => setSelected(null)}>
            <ChevronLeft size={16} /> Prospects
          </div>

          <div className="prospect-tags-row">
            <span className="prospect-ref-tag">REF-{selected.id.slice(0, 8).toUpperCase()}</span>
            <select
              className={`prospect-status-tag prospect-status-select ${statutClass(e.statut)}`}
              value={stageOf(e.statut).value}
              onChange={ev => updateStage(selected.id, ev.target.value)}
            >
              {PIPELINE_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {ceeCount > 0 && (
              <span className="prospect-cee-tag">{ceeCount} fiche{ceeCount > 1 ? 's' : ''} CEE</span>
            )}
            {(selected.tags || []).map(tag => (
              <span key={tag} className="prospect-tag-chip">
                {tag} <XIcon size={11} onClick={() => removeTag(tag)} />
              </span>
            ))}
          </div>

          {emailOuvert && <EmailProspectModal prospect={selected as any} onClose={() => setEmailOuvert(false)} onEnvoye={() => setTimelineRefresh(r => r + 1)} />}
          <h1 className="prospect-detail-name">{e.civilite} {selected.prenom} {selected.nom}</h1>
          {(selected as any).pot_commun && <div style={{ margin: '8px 0 12px' }}><span className="prospect-cee-tag" style={{ background: '#fff3cd', color: '#8a5a00' }}>🟠 POT COMMUN · sans action depuis 90 jours</span></div>}
          <p className="prospect-detail-addr">
            <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {e.adresse_rue || selected.adresse || '—'}
            {selected.code_postal || selected.ville ? `, ${selected.code_postal || ''} ${selected.ville || ''}` : ''}
          </p>

          <div className="prospect-detail-actions">
            <Button
              variant="primary"
              onClick={() => (onContinueLifecycle ? onContinueLifecycle('visite', selected) : onProspectClick?.(selected))}
            >
              <Calendar size={16} /> Nouvelle visite
            </Button>
            {selected.telephone && (
              <a href={`tel:${selected.telephone}`} className="btn btn-outline" style={{ textDecoration: 'none' }}>
                <Phone size={16} /> Appeler
              </a>
            )}
            {selected.email && (
              <a href={`mailto:${selected.email}`} className="btn btn-outline" style={{ textDecoration: 'none' }} onClick={ev => { ev.preventDefault(); setEmailOuvert(true) }}>
                <Mail size={16} /> Email
              </a>
            )}
            <Button variant="ghost" onClick={() => openEdit(selected)}>
              <Pencil size={16} /> Modifier
            </Button>
          </div>

          {currentStep < 5 && (
            <div className="action-rec-banner">
              <span className="action-rec-badge">ACTION RECOMMANDÉE</span>
              <span className="action-rec-text">
                {currentStep === 1 && 'Planifier une visite technique pour démarrer l\'audit énergétique.'}
                {currentStep === 2 && 'Saisir les résultats de la visite et lancer la simulation 3CL.'}
                {currentStep === 3 && 'Générer une proposition commerciale avec le détail des aides.'}
                {currentStep === 4 && 'Finaliser le dossier et planiser le démarrage des travaux.'}
              </span>
              <span className="action-rec-cta" onClick={goToNextAction} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
                Continuer <ArrowRight size={14} />
              </span>
            </div>
          )}

          <div className="prospect-detail-layout">
            {/* LEFT — Lifecycle */}
            <div>
              <div className="lifecycle-card">
                <div className="lifecycle-label">Cycle de vie</div>
                {LIFECYCLE_STEPS.map((s, i) => {
                  const done = s.num < currentStep
                  const active = s.num === currentStep
                  const locked = s.num > currentStep
                  return (
                    <div key={s.num}>
                      <div
                        className={`lifecycle-step ${active ? 'lc-active' : ''} ${locked ? 'lc-locked' : ''}`}
                      >
                        <div className={`lc-dot ${done ? 'done' : active ? 'active' : 'locked'}`}>
                          {done ? <Check size={14} /> : s.num}
                        </div>
                        <div className="lc-body">
                          <div className="lc-title">{s.title}</div>
                          <div className="lc-sub">{s.sub}</div>
                          {active && <div className="vous-etes-ici">VOUS ÊTES ICI</div>}
                        </div>
                      </div>
                      {i < LIFECYCLE_STEPS.length - 1 && <div style={{ height: 6 }} />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CENTER — Detail cards */}
            <div>
              {/* Bénéficiaire */}
              <div className="detail-section-card">
                <div className="detail-section-top">
                  <div>
                    <div className="detail-etape-row">
                      <span className="detail-etape-label">Étape 1</span>
                      <span className="detail-etape-done">Complété</span>
                    </div>
                    <div className="detail-section-heading">Bénéficiaire</div>
                    <div className="detail-section-subdesc">Informations personnelles et foyer fiscal</div>
                  </div>
                  <span className="detail-modify-btn" onClick={() => openEdit(selected)}>
                    <Pencil size={12} /> Modifier
                  </span>
                </div>
                <div className="detail-info-card">
                  <div className="detail-info-inner">
                    <div className="detail-info-row">
                      <span className="detail-info-key">Civilité</span>
                      <span className="detail-info-val">{e.civilite || '—'}</span>
                    </div>
                    <div className="detail-info-row">
                      <span className="detail-info-key">Nom complet</span>
                      <span className="detail-info-val">{selected.prenom} {selected.nom}</span>
                    </div>
                    {e.prenom_conjoint && (
                      <div className="detail-info-row">
                        <span className="detail-info-key">Conjoint</span>
                        <span className="detail-info-val">{e.prenom_conjoint} {e.nom_conjoint || ''}</span>
                      </div>
                    )}
                    <div className="detail-info-row">
                      <span className="detail-info-key">Téléphone</span>
                      <span className="detail-info-val">{selected.telephone || '—'}</span>
                    </div>
                    <div className="detail-info-row">
                      <span className="detail-info-key">Email</span>
                      <span className="detail-info-val">{selected.email || '—'}</span>
                    </div>
                    <div className="detail-info-row">
                      <span className="detail-info-key">Statut d'occupation</span>
                      <span className="detail-info-val">
                        {STATUTS_OCC.find(s => s.value === e.statut_occupation)?.label || e.statut_occupation || '—'}
                      </span>
                    </div>
                    <div className="detail-info-row">
                      <span className="detail-info-key">Personnes au foyer</span>
                      <span className="detail-info-val">{e.nombre_personnes_foyer || 1}</span>
                    </div>
                    <div className="detail-info-row">
                      <span className="detail-info-key">Revenu fiscal de référence</span>
                      <span className="detail-info-val">{e.rfr ? `${Number(e.rfr).toLocaleString('fr-FR')} €` : '—'}</span>
                    </div>
                    {catLabel && (
                      <div className="detail-info-row">
                        <span className="detail-info-key">Catégorie MaPrimeRénov'</span>
                        <span className="detail-info-val">{catLabel}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="detail-contact-btns">
                  {selected.telephone && (
                    <a href={`tel:${selected.telephone}`} className="detail-contact-btn" style={{ textDecoration: 'none' }}>
                      <Phone size={16} /> Appeler
                    </a>
                  )}
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className="detail-contact-btn" style={{ textDecoration: 'none' }} onClick={ev => { ev.preventDefault(); setEmailOuvert(true) }}>
                      <Mail size={16} /> Email
                    </a>
                  )}
                </div>
              </div>

              {/* Logement */}
              <div className="detail-section-card">
                <div className="detail-section-top">
                  <div>
                    <div className="detail-etape-row">
                      <span className="detail-etape-label">Étape 1</span>
                      <span className="detail-etape-done">Complété</span>
                    </div>
                    <div className="detail-section-heading">Logement</div>
                    <div className="detail-section-subdesc">Adresse du bien à rénover</div>
                  </div>
                  <span className="detail-modify-btn" onClick={() => openEdit(selected)}>
                    <Pencil size={12} /> Modifier
                  </span>
                </div>
                <div className="detail-info-card">
                  <div className="detail-info-inner">
                    <div className="detail-info-row">
                      <span className="detail-info-key">Adresse</span>
                      <span className="detail-info-val">{e.adresse_rue || selected.adresse || '—'}</span>
                    </div>
                    {e.adresse_complement && (
                      <div className="detail-info-row">
                        <span className="detail-info-key">Complément</span>
                        <span className="detail-info-val">{e.adresse_complement}</span>
                      </div>
                    )}
                    <div className="detail-info-row">
                      <span className="detail-info-key">Code postal</span>
                      <span className="detail-info-val">{selected.code_postal || '—'}</span>
                    </div>
                    <div className="detail-info-row">
                      <span className="detail-info-key">Ville</span>
                      <span className="detail-info-val">{selected.ville || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opérations CEE */}
              {ceeCount > 0 && (
                <div className="detail-section-card">
                  <div className="detail-section-top">
                    <div>
                      <div className="detail-etape-row">
                        <span className="detail-etape-label">Étape 1</span>
                        <span className="detail-etape-done">Complété</span>
                      </div>
                      <div className="detail-section-heading">Opérations envisagées</div>
                      <div className="detail-section-subdesc">Fiches CEE sélectionnées ({ceeCount})</div>
                    </div>
                  </div>
                  <div className="detail-info-card">
                    <div className="detail-info-inner">
                      {(e.fiches_cee || []).map((code: string) => {
                        const fiche = FICHES_CEE.find(f => f.code === code)
                        return (
                          <div key={code} className="detail-info-row">
                            <span className="detail-info-key" style={{ fontWeight: 600, color: 'var(--c-primary-600)' }}>{code}</span>
                            <span className="detail-info-val">{fiche?.title || code}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Documents du prospect / devis partenaires */}
              <div className="detail-section-card">
                <div className="detail-section-top">
                  <div>
                    <div className="detail-etape-row">
                      <span className="detail-etape-label">Documents</span>
                    </div>
                    <div className="detail-section-heading">Devis & documents partenaires</div>
                    <div className="detail-section-subdesc">Conservez les devis reçus des installateurs directement dans la fiche du prospect.</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <select
                      className="pipeline-inline-input"
                      value={partnerQuotePartnerId || (selected as any).installateur_id || ''}
                      onChange={ev => setPartnerQuotePartnerId(ev.target.value)}
                      style={{ minWidth: 190 }}
                    >
                      <option value="">Partenaire non renseigné</option>
                      {installateurs.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
                    </select>
                    <input
                      ref={el => setPartnerQuoteInput(el)}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                      hidden
                      onChange={ev => ajouterDevisPartenaire(ev.target.files)}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => partnerQuoteInput?.click()} disabled={uploadingPartnerQuote}>
                      <UploadCloud size={15} /> {uploadingPartnerQuote ? 'Envoi…' : 'Ajouter un devis partenaire'}
                    </button>
                  </div>
                </div>
                <div className="detail-info-card">
                  {prospectDocuments.length === 0 ? (
                    <div className="detail-info-inner text-sm text-muted">Aucun document partenaire enregistré.</div>
                  ) : (
                    <div className="detail-info-inner">
                      {prospectDocuments.map(doc => {
                        const partenaire = installateurs.find(i => i.id === doc.partenaire_id)?.nom
                        return (
                          <div className="detail-info-row" key={doc.id}>
                            <span className="detail-info-key" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FileText size={15} /> {doc.nom}
                            </span>
                            <span className="detail-info-val" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="text-xs text-muted">{partenaire || 'Partenaire non renseigné'} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                              {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" title="Ouvrir"><Download size={14} /></a>}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat interne Admin ↔ Commercial */}
              <ProspectChat prospect={selected} />

              {/* Timeline + Tâches */}
              <div className="detail-section-card" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
                <Timeline prospectId={selected.id} refreshKey={timelineRefresh} auteur={profile?.nom_complet || 'Vous'} />
              </div>
              <div className="detail-section-card" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
                <TasksPanel prospectId={selected.id} onChanged={fetchOpenTasks} defaultAssigne={profile?.nom_complet || ''} />
              </div>

              {/* Danger zone : suppression réservée à l'administration */}
              {isAdmin ? (
                <div className="danger-zone">
                  <div className="danger-zone-title">
                    <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Zone de danger
                  </div>
                  <div className="danger-zone-desc">
                    Supprimer ce prospect et toutes les données associées. Cette action est irréversible.
                  </div>
                  <button className="btn-danger-zone" onClick={() => setConfirmDelete(selected)}>
                    <Trash2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Supprimer le prospect
                  </button>
                </div>
              ) : (
                <div className="danger-zone">
                  <div className="danger-zone-title">
                    <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Suppression
                  </div>
                  <div className="danger-zone-desc">
                    Seul un administrateur peut supprimer définitivement un prospect. Vous pouvez continuer
                    à le modifier librement.
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Mini panels */}
            <div>
              <div className="right-mini-card">
                <div className="right-mini-label">Pilotage commercial</div>
                <div className="right-mini-section">
                  <div className="right-mini-section-label">Commercial en charge</div>
                  {isAdmin ? (
                    <select
                      className="pipeline-inline-input"
                      value={selected.commercial_id || ''}
                      onChange={ev => {
                        const id = ev.target.value || null
                        const nom = commerciaux.find(c => c.id === id)?.nom_complet || null
                        updateProspectField('commercial_id', id)
                        updateProspectField('commercial', nom)
                        if (id) updateProspectField('commercial_historique_id', null)
                      }}
                    >
                      <option value="">Non attribué (pool commun)</option>
                      {commerciaux.map(c => (
                        <option key={c.id} value={c.id}>{c.nom_complet || c.role}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="pipeline-inline-input"
                      value={selected.commercial || profile?.nom_complet || ''}
                      disabled
                      title="Seul un admin ou un manager peut réattribuer un lead à un autre commercial"
                    />
                  )}
                </div>
                {isAdmin && (selected as any).pot_commun_ancien_commercial && (
                  <div className="right-mini-section">
                    <div className="right-mini-section-label">Ancien commercial</div>
                    <div className="text-sm">{(selected as any).pot_commun_ancien_commercial}</div>
                    <div className="text-xs text-muted" style={{marginTop:6}}>Le prospect est actuellement dans le pot commun.</div>
                  </div>
                )}
                {isAdmin && (
                  <div className="right-mini-section">
                    <div className="right-mini-section-label">Ancien commercial</div>
                    <select className="pipeline-inline-input" value={(selected as any).commercial_historique_id || ''} onChange={async ev => {
                      const id = ev.target.value || null
                      await updateProspectField('commercial_historique_id', id)
                      if (id) {
                        await updateProspectField('commercial_id', null)
                        await updateProspectField('commercial', anciensCommerciaux.find(c => c.id === id)?.nom_complet || null)
                      }
                    }}>
                      <option value="">Aucun ancien commercial</option>
                      {anciensCommerciaux.map(c => <option key={c.id} value={c.id}>{c.nom_complet}</option>)}
                    </select>
                  </div>
                )}
                {isAdmin && (
                  <div className="right-mini-section">
                    <div className="right-mini-section-label">Partenaire installateur</div>
                    <select className="pipeline-inline-input" value={(selected as any).installateur_id || ''} onChange={ev => updateProspectField('installateur_id', ev.target.value || null)}>
                      <option value="">Aucun partenaire</option>
                      {installateurs.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
                    </select>
                    <div className="text-xs text-muted" style={{marginTop:6}}>L’Admin peut modifier l’attribution à tout moment.</div>
                  </div>
                )}
                {profile?.role === 'admin' && <ProspectShareControl prospectId={selected.id} />}
                <div className="right-mini-section">
                  <div className="right-mini-section-label">Température</div>
                  <div className="temp-toggle-row">
                    {TEMPERATURES.map(t => {
                      const Icon = t.value === 'chaud' ? Flame : t.value === 'froid' ? Snowflake : Minus
                      const active = (selected.temperature || 'tiede') === t.value
                      return (
                        <button
                          key={t.value}
                          className={`temp-toggle-btn ${active ? 'active' : ''}`}
                          style={active ? { background: t.color, borderColor: t.color, color: '#fff' } : {}}
                          onClick={() => updateProspectField('temperature', t.value)}
                        >
                          <Icon size={13} /> {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="right-mini-section">
                  <div className="right-mini-section-label">Étiquettes</div>
                  <div className="tag-input-row">
                    <input
                      className="pipeline-inline-input"
                      placeholder="Ajouter un tag…"
                      value={tagInput}
                      onChange={ev => setTagInput(ev.target.value)}
                      onKeyDown={ev => { if (ev.key === 'Enter') addTag() }}
                    />
                    <button className="tag-add-btn" onClick={addTag}><Tag size={13} /></button>
                  </div>
                </div>
              </div>

              <div className="right-mini-card">
                <div className="right-mini-label">Aides & éligibilité</div>
                {catLabel ? (
                  <>
                    <div className="right-mini-section">
                      <div className="right-mini-section-label">Catégorie MPR</div>
                      <div className="right-mini-sep" />
                      <div className="right-mini-value">{catLabel}</div>
                      <div className="right-mini-sub">
                        RFR: {e.rfr ? `${Number(e.rfr).toLocaleString('fr-FR')} €` : '—'}
                      </div>
                    </div>
                    <div className="right-mini-section">
                      <div className="right-mini-section-label">Éligibilité 1€</div>
                      <div className="right-mini-value" style={{ fontSize: 14, color: ['TresModeste', 'Modeste'].includes(e.categorie_mpr) ? 'var(--c-success)' : 'var(--c-text-muted)' }}>
                        {['TresModeste', 'Modeste'].includes(e.categorie_mpr) ? 'Oui' : 'Non'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="right-mini-sub">Renseignez le RFR pour calculer l'éligibilité.</div>
                )}
              </div>

              <div className="right-mini-card">
                <div className="right-mini-label">À consulter</div>
                <div className="right-consulter-item" onClick={() => onContinueLifecycle?.('visite', selected)}>
                  <FileText size={16} /> Visite technique
                  <span className="right-consulter-count">{linkedCounts ? linkedCounts.visites : '…'}</span>
                </div>
                <div className="right-consulter-item" onClick={() => onContinueLifecycle?.('simulation', selected)}>
                  <Zap size={16} /> Simulation 3CL
                  <span className="right-consulter-count">{linkedCounts ? linkedCounts.simulations : '…'}</span>
                </div>
                <div className="right-consulter-item" onClick={() => onContinueLifecycle?.('devis', selected)}>
                  <FileText size={16} /> Proposition commerciale
                  <span className="right-consulter-count">{linkedCounts ? linkedCounts.devis : '…'}</span>
                </div>
                <div className="right-consulter-item" onClick={() => onContinueLifecycle?.('dossier', selected)}>
                  <Home size={16} /> Dossier de travaux
                  <span className="right-consulter-count">{linkedCounts ? linkedCounts.dossiers : '…'}</span>
                </div>
              </div>

              <div className="right-mini-card">
                <div className="right-mini-label">Informations</div>
                <div className="right-mini-section">
                  <div className="right-mini-section-label">Source</div>
                  <div className="right-mini-value" style={{ fontSize: 14 }}>{selected.source || '—'}</div>
                </div>
                <div className="right-mini-section">
                  <div className="right-mini-section-label">Créé le</div>
                  <div className="right-mini-value" style={{ fontSize: 14 }}>{formatDate(selected.created_at)}</div>
                </div>
                {e.commentaires && (
                  <div className="right-mini-section">
                    <div className="right-mini-section-label">Commentaires</div>
                    <div className="right-mini-sub" style={{ lineHeight: 1.5 }}>{e.commentaires}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edit modal */}
        <Modal
          open={editModal}
          onClose={() => setEditModal(false)}
          title="Modifier le prospect"
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditModal(false)}>Annuler</Button>
              <Button variant="primary" onClick={saveEdit} disabled={saving || !editForm.nom || !editForm.prenom}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </>
          }
        >
          <EditFormBody form={editForm} set={setEdit} toggleFiche={toggleEditFiche} fichesByGroup={fichesByGroup} />
        </Modal>

        {/* Delete confirm */}
        <Modal
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          title="Confirmer la suppression"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Annuler</Button>
              <Button variant="danger" onClick={deleteProspect}>Supprimer</Button>
            </>
          }
        >
          <p>Voulez-vous vraiment supprimer le prospect <b>{confirmDelete?.prenom} {confirmDelete?.nom}</b> ? Cette action est irréversible.</p>
        </Modal>
      </div>
    )
  }

  // ===== LIST VIEW =====
  return (
    <div className="page-scroll">
      <div className="page">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Prospects</h1>
            <p className="page-subtitle">{prospects.length} prospect{prospects.length > 1 ? 's' : ''} · {formatDate(new Date().toISOString())}</p>
          </div>
          <div className="page-actions">
            <div className="view-toggle">
              <button className={`view-toggle-btn ${view === 'liste' ? 'active' : ''}`} onClick={() => setView('liste')}>
                <ListIcon size={15} /> Liste
              </button>
              <button className={`view-toggle-btn ${view === 'pipeline' ? 'active' : ''}`} onClick={() => setView('pipeline')}>
                <LayoutGrid size={15} /> Pipeline
              </button>
            </div>
            <Button variant="primary" onClick={openWizard}>
              <Plus size={18} /> Nouveau prospect
            </Button>
          </div>
        </div>

        {view === 'liste' && (
          <section className="dashboard-kpis page-kpi-strip">
            <div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><Users size={19}/></span><span className="dashboard-kpi-main"><strong>{prospects.filter(p => !['Installé','Perdu','Refusé'].includes(p.statut)).length}</strong><span>Prospects actifs</span></span><span className="dashboard-kpi-note">À suivre</span></div>
            <div className="dashboard-kpi"><span className="dashboard-kpi-icon blue"><Check size={19}/></span><span className="dashboard-kpi-main"><strong>{prospects.filter(p => p.statut === 'Installé').length}</strong><span>Clients</span></span><span className="dashboard-kpi-note">Installés</span></div>
            <div className="dashboard-kpi"><span className="dashboard-kpi-icon purple"><Users size={19}/></span><span className="dashboard-kpi-main"><strong>{prospects.length}</strong><span>Total prospects</span></span><span className="dashboard-kpi-note">Base CRM</span></div>
          </section>
        )}

        {view === 'liste' && (
          <div className="pro-list-filters" style={{ flexWrap: 'wrap' }}>
            <div className="pro-search-wrap">
              <Search />
              <input
                placeholder="Rechercher par nom, ville, email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="pro-filter-select"
              value={statutFilter}
              onChange={e => setStatutFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select
              className="pro-filter-select"
              value={temperatureFilter}
              onChange={e => setTemperatureFilter(e.target.value)}
            >
              <option value="">Toute température</option>
              <option value="chaud">🔥 Chaud</option>
              <option value="tiede">🌤️ Tiède</option>
              <option value="froid">❄️ Froid</option>
            </select>
            {sourcesDisponibles.length > 0 && (
              <select
                className="pro-filter-select"
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
              >
                <option value="">Toute source</option>
                {sourcesDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {tagsDisponibles.length > 0 && (
              <select
                className="pro-filter-select"
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
              >
                <option value="">Tous les tags</option>
                {tagsDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {isAdmin && commerciaux.length > 0 && (
              <select
                className="pro-filter-select"
                value={commercialFilter}
                onChange={e => setCommercialFilter(e.target.value)}
              >
                <option value="">Tous les commerciaux</option>
                {commerciaux.map(c => <option key={c.id} value={c.id}>{c.nom_complet || c.role}</option>)}
              </select>
            )}
            <button className={`btn btn-sm ${potCommunOnly ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPotCommunOnly(v => !v)}>🟠 Pot commun</button>
            {filtresActifsCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={reinitialiserFiltres}>
                Réinitialiser ({filtresActifsCount})
              </button>
            )}
          </div>
        )}

        {view === 'pipeline' && (
          <PipelineBoard
            prospects={prospects}
            tasksByProspect={tasksByProspect}
            onOpen={p => setSelected(p)}
            onStageChange={updateStage}
          />
        )}

        {view === 'liste' && (loading ? (
          <div className="card"><div className="card-pad text-muted">Chargement…</div></div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Users size={40} />
              <h3>{search || statutFilter ? 'Aucun prospect trouvé' : 'Aucun prospect'}</h3>
              <p>{search || statutFilter ? 'Modifiez vos filtres.' : 'Commencez par créer votre premier prospect.'}</p>
              <Button variant="primary" onClick={openWizard}>
                <Plus size={18} /> Nouveau prospect
              </Button>
            </div>
          </div>
        ) : (
          <div className="prospect-list-card">
            {filtered.map(p => {
              const e = extended(p)
              const ceeCount = (e.fiches_cee || []).length
              return (
                <div
                  key={p.id}
                  className="prospect-row"
                  onClick={() => onProspectClick ? onProspectClick(p) : setSelected(p)}
                >
                  <div
                    className="prospect-row-avatar"
                    style={{ background: avatarColor(`${p.prenom} ${p.nom}`) }}
                  >
                    {e.type_prospect === 'professionnel' ? <Users size={16} /> : initials(p.prenom, p.nom)}
                  </div>
                  <div className="prospect-row-info">
                    <div className="prospect-row-name">
                      {e.type_prospect === 'professionnel'
                        ? (e.raison_sociale || `${p.prenom} ${p.nom}`)
                        : `${e.civilite} ${p.prenom} ${p.nom}`}
                    </div>
                    <div className="prospect-row-sub">
                      <span>{p.ville || '—'}</span>
                      {p.telephone && <span>{p.telephone}</span>}
                      {p.source && <span>via {p.source}</span>}
                    </div>
                  </div>
                  <div className="prospect-row-tags">
                    <span className={`prospect-status-tag ${statutClass(e.statut)}`}>
                      {statutLabel(e.statut)}
                    </span>
                    {e.type_prospect === 'professionnel' && <span className="badge badge-info">Pro</span>}
                    {ceeCount > 0 && <span className="prospect-cee-tag">{ceeCount} CEE</span>}
                    {isAdmin && (
                      <span className="badge badge-neutral">{p.commercial || 'Non attribué'}</span>
                    )}
                  </div>
                  <div className="prospect-row-date">{formatDate(p.created_at)}</div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* New prospect wizard modal */}
      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Nouveau prospect"
        width={720}
        footer={
          <>
            {wizardStep === 1 ? (
              <Button variant="ghost" onClick={() => setWizardOpen(false)}>Annuler</Button>
            ) : (
              <Button variant="ghost" onClick={() => setWizardStep(1)}>
                <ChevronLeft size={16} /> Retour
              </Button>
            )}
            <div style={{ flex: 1 }} />
            {wizardStep === 1 ? (
              <Button variant="primary" onClick={() => setWizardStep(2)} disabled={!stepValid}>
                Continuer <ChevronRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" onClick={saveProspect} disabled={saving}>
                <Check size={16} /> {saving ? 'Création…' : 'Créer le prospect'}
              </Button>
            )}
          </>
        }
      >
        {/* Step bar */}
        <div className="wizard-step-bar">
          <div className="ws-step">
            <div className={`ws-circle ${wizardStep === 1 ? 'active' : wizardStep > 1 ? 'done' : 'todo'}`}>
              {wizardStep > 1 ? <Check size={16} /> : 1}
            </div>
            <span className={`ws-label ${wizardStep === 1 ? 'active' : wizardStep > 1 ? 'done' : 'todo'}`}>Bénéficiaire</span>
          </div>
          <div className={`ws-line ${wizardStep > 1 ? 'done' : ''}`} />
          <div className="ws-step">
            <div className={`ws-circle ${wizardStep === 2 ? 'active' : 'todo'}`}>2</div>
            <span className={`ws-label ${wizardStep === 2 ? 'active' : 'todo'}`}>Opérations</span>
          </div>
        </div>

        {wizardStep === 1 && (
          <>
            <div className="pw-heading" style={{ marginBottom: 16 }}>Informations du bénéficiaire</div>

            <div className="grid grid-2 gap-3" style={{ marginBottom: 4 }}>
              <FloatSelect
                label="Type de prospect"
                value={form.type_prospect}
                onChange={v => set('type_prospect', v as 'particulier' | 'professionnel')}
                options={TYPES_PROSPECT}
              />
              <div />
            </div>

            {form.type_prospect === 'professionnel' && (
              <>
                <div style={{ marginTop: 12, marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--c-primary-600)' }}>
                  Entreprise
                </div>
                <div className="grid grid-2 gap-3">
                  <FloatInput label="Raison sociale" value={form.raison_sociale} onChange={v => set('raison_sociale', v)} placeholder="ex : SCI Les Tilleuls" />
                  <FloatInput label="SIRET" value={form.siret} onChange={v => set('siret', v)} placeholder="14 chiffres" />
                </div>
                <div style={{ marginTop: 12, marginBottom: 4, fontSize: 12, color: 'var(--c-text-muted)' }}>
                  Coordonnées du contact au sein de l'entreprise :
                </div>
              </>
            )}

            <div className="grid grid-2 gap-3">
              <FloatSelect
                label="Civilité"
                value={form.civilite}
                onChange={v => set('civilite', v)}
                options={CIVILITES}
              />
              <div />
            </div>
            <div className="grid grid-2 gap-3 mt-4">
              <FloatInput label={form.type_prospect === 'professionnel' ? 'Prénom du contact' : 'Prénom'} value={form.prenom} onChange={v => set('prenom', v)} placeholder="Jean" />
              <FloatInput label={form.type_prospect === 'professionnel' ? 'Nom du contact' : 'Nom'} value={form.nom} onChange={v => set('nom', v)} placeholder="Dupont" />
            </div>

            {form.civilite === 'M. et Mme' && form.type_prospect === 'particulier' && (
              <div className="grid grid-2 gap-3 mt-4">
                <FloatInput label="Prénom du conjoint" value={form.prenom_conjoint} onChange={v => set('prenom_conjoint', v)} />
                <FloatInput label="Nom du conjoint" value={form.nom_conjoint} onChange={v => set('nom_conjoint', v)} />
              </div>
            )}

            <div className="grid grid-2 gap-3 mt-4">
              <FloatInput label="Téléphone" value={form.telephone} onChange={v => set('telephone', v)} placeholder="06 12 34 56 78" />
              <FloatInput label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="jean.dupont@email.fr" />
            </div>

            <div style={{ marginTop: 24, marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--c-primary-600)' }}>
              Adresse du logement
            </div>

            <div style={{ position: 'relative' }}>
              <AddressAutocomplete
                value={form.adresse_rue}
                onChange={v => set('adresse_rue', v)}
                onSelect={addr => {
                  set('adresse_rue', addr.rue)
                  set('code_postal', addr.codePostal)
                  set('ville', addr.ville)
                }}
                placeholder="Commencez à taper pour rechercher (api-adresse.data.gouv.fr)"
              />
            </div>
            <FloatInput label="Complément d'adresse" value={form.adresse_complement} onChange={v => set('adresse_complement', v)} placeholder="Appartement, bâtiment, étage…" />
            <div className="grid grid-2 gap-3 mt-4">
              <FloatInput label="Code postal" value={form.code_postal} onChange={v => set('code_postal', v)} placeholder="69000" />
              <FloatInput label="Ville" value={form.ville} onChange={v => set('ville', v)} placeholder="Lyon" />
            </div>

            <FloatSelect
              label="Statut d'occupation"
              value={form.statut_occupation}
              onChange={v => set('statut_occupation', v)}
              options={STATUTS_OCC}
            />

            {form.type_prospect === 'particulier' && (
              <>
                <div style={{ marginTop: 24, marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--c-primary-600)' }}>
                  Foyer fiscal — MaPrimeRénov'
                </div>

                <div className="grid grid-2 gap-3">
                  <FloatInput
                    label="Revenu fiscal de référence (€)"
                    type="number"
                    value={form.rfr}
                    onChange={v => set('rfr', v)}
                    placeholder="ex: 28000"
                  />
                  <FloatSelect
                    label="Nombre de personnes au foyer"
                    value={String(form.nombre_personnes_foyer)}
                    onChange={v => set('nombre_personnes_foyer', parseInt(v))}
                    options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: String(n) }))}
                  />
                </div>

                {categorie && (
                  <div className="foyer-card" style={{ marginTop: 16 }}>
                    <div className="foyer-card-label">Catégorie MaPrimeRénov'</div>
                    <div className="foyer-card-value">{categorie.label}</div>
                    <div className="foyer-card-hint" style={{ fontSize: 12, color: 'var(--c-text-muted)', marginTop: 4 }}>
                      RFR : {Math.round(rfrNum).toLocaleString('fr-FR')} € · {form.nombre_personnes_foyer} personne(s) · {ileDeFrance ? 'Île-de-France' : 'Hors Île-de-France'}
                    </div>
                  </div>
                )}
              </>
            )}
            <div style={{ marginTop: 20, marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--c-primary-600)' }}>
              Paramètres du barème apporteur
            </div>
            <div className="grid grid-2 gap-3">
              <FloatSelect label="Zone climatique" value={form.zone_climatique} onChange={v => set('zone_climatique', v)} options={[{ value: '', label: 'À renseigner' }, { value: 'H1', label: 'H1' }, { value: 'H2', label: 'H2' }, { value: 'H3', label: 'H3' }]} />
              <FloatSelect label="Régime solaire thermique" value={form.regime_aide_commission} onChange={v => set('regime_aide_commission', v)} options={[{ value: '', label: 'À renseigner / sans objet' }, { value: 'mpr_cee', label: 'MaPrimeRénov’ + CEE' }, { value: 'full_cee', label: 'Full CEE' }]} />
            </div>
          </>
        )}

        {wizardStep === 2 && (
          <>
            <div className="pw-heading" style={{ marginBottom: 8 }}>Fiches CEE — types de rénovation</div>
            <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              Sélectionnez les fiches d'opérations standardisées CEE correspondant aux travaux envisagés par le prospect.
              Ces fiches déterminent l'éligibilité aux aides et la suite du parcours commercial.
            </p>

            {Object.entries(fichesByGroup).map(([group, fiches]) => (
              <div key={group} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  {group}
                </div>
                <div className="fiches-grid">
                  {fiches.map(f => {
                    const checked = form.fiches_cee.includes(f.code)
                    return (
                      <div
                        key={f.code}
                        className={`fiche-card ${checked ? 'selected' : ''}`}
                        onClick={() => toggleFiche(f.code)}
                      >
                        <div className="fiche-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="fiche-card-code">{f.code}</span>
                          <span style={{ width: 18, height: 18, borderRadius: 4, border: checked ? 'none' : '2px solid var(--c-border-dark)', background: checked ? 'var(--c-primary-400)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {checked && <Check size={12} color="#fff" />}
                          </span>
                        </div>
                        <div className="fiche-card-title" style={{ fontSize: 14, fontWeight: 500 }}>{f.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{f.desc}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 24 }}>
              <FloatSelect
                label="Source du prospect"
                value={form.source}
                onChange={v => set('source', v)}
                options={SOURCES.map(s => ({ value: s, label: s }))}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <FloatTextarea
                label="Commentaires"
                value={form.commentaires}
                onChange={v => set('commentaires', v)}
                rows={3}
                placeholder="Notes sur le besoin du prospect…"
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// ===== Edit form body (shared between edit modal) =====
function EditFormBody({
  form, set, toggleFiche, fichesByGroup,
}: {
  form: typeof EMPTY_FORM
  set: <K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) => void
  toggleFiche: (code: string) => void
  fichesByGroup: Record<string, typeof FICHES_CEE>
}) {
  return (
    <>
      <div className="grid grid-2 gap-3">
        <FloatSelect label="Type de prospect" value={form.type_prospect} onChange={v => set('type_prospect', v as 'particulier' | 'professionnel')} options={TYPES_PROSPECT} />
        <FloatSelect label="Civilité" value={form.civilite} onChange={v => set('civilite', v)} options={CIVILITES} />
      </div>
      {form.type_prospect === 'professionnel' && (
        <div className="grid grid-2 gap-3 mt-4">
          <FloatInput label="Raison sociale" value={form.raison_sociale} onChange={v => set('raison_sociale', v)} />
          <FloatInput label="SIRET" value={form.siret} onChange={v => set('siret', v)} />
        </div>
      )}
      <div className="grid grid-2 gap-3 mt-4">
        <FloatInput label={form.type_prospect === 'professionnel' ? 'Prénom du contact' : 'Prénom'} value={form.prenom} onChange={v => set('prenom', v)} />
        <FloatInput label={form.type_prospect === 'professionnel' ? 'Nom du contact' : 'Nom'} value={form.nom} onChange={v => set('nom', v)} />
      </div>
      {form.civilite === 'M. et Mme' && form.type_prospect === 'particulier' && (
        <div className="grid grid-2 gap-3 mt-4">
          <FloatInput label="Prénom du conjoint" value={form.prenom_conjoint} onChange={v => set('prenom_conjoint', v)} />
          <FloatInput label="Nom du conjoint" value={form.nom_conjoint} onChange={v => set('nom_conjoint', v)} />
        </div>
      )}
      <div className="grid grid-2 gap-3 mt-4">
        <FloatInput label="Téléphone" value={form.telephone} onChange={v => set('telephone', v)} />
        <FloatInput label="Email" type="email" value={form.email} onChange={v => set('email', v)} />
      </div>
      <div style={{ marginTop: 16 }}>
        <AddressAutocomplete
          value={form.adresse_rue}
          onChange={v => set('adresse_rue', v)}
          onSelect={addr => { set('adresse_rue', addr.rue); set('code_postal', addr.codePostal); set('ville', addr.ville) }}
          placeholder="Rechercher une adresse…"
        />
      </div>
      <FloatInput label="Complément d'adresse" value={form.adresse_complement} onChange={v => set('adresse_complement', v)} />
      <div className="grid grid-2 gap-3 mt-4">
        <FloatInput label="Code postal" value={form.code_postal} onChange={v => set('code_postal', v)} />
        <FloatInput label="Ville" value={form.ville} onChange={v => set('ville', v)} />
      </div>
      <FloatSelect label="Statut d'occupation" value={form.statut_occupation} onChange={v => set('statut_occupation', v)} options={STATUTS_OCC} />
      <div className="grid grid-2 gap-3 mt-4">
        <FloatInput label="RFR (€)" type="number" value={form.rfr} onChange={v => set('rfr', v)} />
        <FloatSelect label="Personnes au foyer" value={String(form.nombre_personnes_foyer)} onChange={v => set('nombre_personnes_foyer', parseInt(v))} options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: String(n) }))} />
      </div>
      <div className="grid grid-2 gap-3 mt-4">
        <FloatSelect label="Zone climatique (barème commissions)" value={form.zone_climatique} onChange={v => set('zone_climatique', v)} options={[{ value: '', label: 'À renseigner' }, { value: 'H1', label: 'H1' }, { value: 'H2', label: 'H2' }, { value: 'H3', label: 'H3' }]} />
        <FloatSelect label="Régime d’aide solaire thermique" value={form.regime_aide_commission} onChange={v => set('regime_aide_commission', v)} options={[{ value: '', label: 'Sans objet / à renseigner' }, { value: 'mpr_cee', label: 'MaPrimeRénov’ + CEE' }, { value: 'full_cee', label: 'Full CEE' }]} />
      </div>
      <p className="text-sm text-muted" style={{ marginTop: 6 }}>Ces paramètres servent au calcul du barème apporteur pour le solaire thermique et l’isolation des combles. Vérifiez-les avant de signer le devis.</p>
      <FloatSelect label="Source" value={form.source} onChange={v => set('source', v)} options={SOURCES.map(s => ({ value: s, label: s }))} />
      <div style={{ marginTop: 16 }}>
        <FloatTextarea label="Commentaires" value={form.commentaires} onChange={v => set('commentaires', v)} rows={3} />
      </div>

      <div style={{ marginTop: 24, marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--c-primary-600)' }}>
        Fiches CEE
      </div>
      {Object.entries(fichesByGroup).map(([group, fiches]) => (
        <div key={group} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{group}</div>
          <div className="fiches-grid">
            {fiches.map(f => {
              const checked = form.fiches_cee.includes(f.code)
              return (
                <div key={f.code} className={`fiche-card ${checked ? 'selected' : ''}`} onClick={() => toggleFiche(f.code)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="fiche-card-code">{f.code}</span>
                    <span style={{ width: 18, height: 18, borderRadius: 4, border: checked ? 'none' : '2px solid var(--c-border-dark)', background: checked ? 'var(--c-primary-400)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {checked && <Check size={12} color="#fff" />}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{f.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
