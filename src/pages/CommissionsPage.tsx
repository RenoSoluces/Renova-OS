import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  Plus,
  Settings2,
  Clock,
  CheckCircle2,
  Banknote,
  XCircle,
  Pencil,
  Trash2,
  Building2,
  Search,
  Filter,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import type {
  Commission,
  CommissionBareme,
  CommissionType,
} from '../types'
import { FloatInput, FloatSelect } from '../components/ui/FloatInput'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { euro } from '../lib/crm/constants'
import { jsPDF } from 'jspdf'
import '../styles/commissions.css'

const TYPES: Record<CommissionType, string> = {
  vt: 'Visite technique',
  devis_signe: 'Devis signé',
  manuel: 'Commission manuelle',
}

const EMPTY = {
  type: 'devis_signe' as CommissionType,
  libelle: '',
  commercial_id: '',
  produit_id: '',
  montant_commercial: '',
  montant_societe: '',
  pourcentage_commercial: '',
  mode: 'fixe',
  base_pourcentage: 'montant_ht',
  priorite: '0',
  date_debut: '',
  date_fin: '',
  actif: true,
  public_cible: 'particulier',
  categorie_produit: '',
  variante_produit: '',
}

type PaymentTarget = 'commercial' | 'societe'
type PaymentFilter = 'toutes' | 'a_payer' | 'payees'

type CommissionWithCommercial = Commission & {
  commercial?: {
    id: string
    nom_complet: string
    couleur?: string
  } | null
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function firstName(name?: string | null) {
  return (name || 'Commercial').split(' ')[0]
}

function amount(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function echeancePaidAmount(c: CommissionWithCommercial, target: PaymentTarget) {
  return (c.echeances || []).filter(e => e.beneficiaire === target && !!e.date_paiement).reduce((sum, e) => sum + amount(e.montant), 0)
}
function echeanceTotalAmount(c: CommissionWithCommercial, target: PaymentTarget) {
  const total = target === 'societe' ? amount(c.montant_societe) : amount(c.montant_commercial)
  const schedules = (c.echeances || []).filter(e => e.beneficiaire === target)
  return schedules.length ? schedules.reduce((sum, e) => sum + amount(e.montant), 0) : total
}
function echeanceRemainingAmount(c: CommissionWithCommercial, target: PaymentTarget) {
  return Math.max(0, echeanceTotalAmount(c, target) - echeancePaidAmount(c, target))
}

export function CommissionsPage() {
  const { profile } = useAuth()
  const admin =
    profile?.role === 'admin' || profile?.role === 'manager'
  const canReviewFactures = ['admin', 'manager', 'super_admin', 'partner', 'partner_admin', 'company_admin'].includes(profile?.role || '')
  const canViewBareme = admin || profile?.role === 'apporteur' || profile?.role === 'partner'

  const [tab, setTab] = useState<'suivi' | 'bareme'>('suivi')
  const [rows, setRows] = useState<CommissionWithCommercial[]>([])
  const [rules, setRules] = useState<CommissionBareme[]>([])
  const [commerciaux, setCommerciaux] = useState<any[]>([])
  const [produits, setProduits] = useState<any[]>([])
  const [baremePublic, setBaremePublic] = useState<'particulier' | 'professionnel' | 'visite_technique'>('particulier')

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [paymentModal, setPaymentModal] = useState(false)
  const [paymentTarget, setPaymentTarget] =
    useState<PaymentTarget>('commercial')
  const [paymentCommission, setPaymentCommission] =
    useState<CommissionWithCommercial | null>(null)
  const [paymentDate, setPaymentDate] = useState(todayInput())
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [echeanceModal, setEcheanceModal] = useState(false)
  const [echeanceCommission, setEcheanceCommission] = useState<CommissionWithCommercial | null>(null)
  const [echeanceTarget, setEcheanceTarget] = useState<PaymentTarget>('societe')
  const [echeances, setEcheances] = useState<any[]>([])
  const [echeanceSaving, setEcheanceSaving] = useState(false)
  const [echeanceForm, setEcheanceForm] = useState({ libelle: '', montant: '', date_prevue: '' })

  const [editCommission, setEditCommission] = useState<CommissionWithCommercial | null>(null)
  const [editAmounts, setEditAmounts] = useState({ montant_commercial: '', montant_societe: '' })
  const [editReason, setEditReason] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [commissionFactures, setCommissionFactures] = useState<any[]>([])
  const [facturesLoading, setFacturesLoading] = useState(false)
  const [facturesAdmin, setFacturesAdmin] = useState<any[]>([])
  const [facturesAdminLoading, setFacturesAdminLoading] = useState(false)
  const [facturationProfil, setFacturationProfil] = useState({
    raison_sociale: '', forme_juridique: '', siret: '', numero_tva: '',
    adresse: '', code_postal: '', ville: '', email_facturation: '', telephone: '',
  })
  const [facturationLoading, setFacturationLoading] = useState(false)
  const [facturationSaving, setFacturationSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [commercialFilter, setCommercialFilter] =
    useState('all')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [paymentFilter, setPaymentFilter] =
    useState<PaymentFilter>('toutes')

  // Rechargement discret : la liste reste affichée (et la position conservée) pendant la mise à jour.
  const load = useCallback(async () => {

    const commissionQuery = supabase
      .from('commissions_safe')
      .select('*')
      .order('date_generation', {
        ascending: false,
      })

    const baremeSource = profile?.role === 'apporteur' || profile?.role === 'partner'
      ? 'commission_bareme_apporteurs'
      : 'commission_bareme'
    const baremeQuery = supabase
      .from(baremeSource)
      .select('*')
      .order('priorite', {
        ascending: false,
      })
      .order('created_at', {
        ascending: false,
      })

    const produitsQuery = supabase
      .from('catalogue_produits')
      .select('id,nom,categorie,public_cible,catalogue_groupe,caracteristiques')
      .eq('actif', true)
      .order('nom')

    const commerciauxQuery = supabase
      .from('profiles')
      .select('id,nom_complet,role')
      .in('role', ['commercial','manager','admin'])
      .order('nom_complet')
    let echeancesQuery = supabase.from('commission_echeances').select('*').order('ordre').order('created_at')
    // Les non-administrateurs ne chargent jamais les échéances de la société.
    if (!admin) echeancesQuery = echeancesQuery.eq('beneficiaire', 'commercial') as typeof echeancesQuery

    const [commissionResult, baremeResult, produitsResult, commerciauxResult, echeancesResult] = await Promise.all([
      commissionQuery, baremeQuery, produitsQuery, commerciauxQuery, echeancesQuery,
    ])

    if (commissionResult.error) {
      console.error(
        '[RENOVA OS] Chargement commissions:',
        commissionResult.error,
      )
    }

    if (baremeResult.error) {
      console.error(
        '[RENOVA OS] Chargement barèmes:',
        baremeResult.error,
      )
    }

    const echeancesByCommission = new Map<string, any[]>()
    for (const e of (echeancesResult.data || []) as any[]) {
      const list = echeancesByCommission.get(e.commission_id) || []
      list.push(e); echeancesByCommission.set(e.commission_id, list)
    }
    const baseRows = ((commissionResult.data || []) as CommissionWithCommercial[]).map(row => ({
      ...row, echeances: echeancesByCommission.get(row.id) || [],
    }))

    /*
     * Important :
     * un commercial ne doit voir que ses commissions.
     *
     * La RLS commissions fait déjà ce filtrage côté DB,
     * mais on conserve aussi une sécurité côté interface.
     */
    const visibleRows = admin
      ? baseRows
      : baseRows.filter(
          (row) =>
            row.commercial_id === profile?.id,
        )

    setRows(visibleRows)

    setRules(
      (baremeResult.data || []) as CommissionBareme[],
    )

    setProduits(produitsResult.data || [])
    setCommerciaux(commerciauxResult.data || [])
    setLoading(false)
  }, [admin, profile?.id])

  useEffect(() => {
    load()
  }, [load])

  /*
   * FILTRES
   */
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((r) => {
      if (
        admin &&
        commercialFilter !== 'all' &&
        r.commercial_id !== commercialFilter
      ) {
        return false
      }

      const generated =
        r.date_generation?.slice(0, 10) || ''

      if (
        periodStart &&
        generated < periodStart
      ) {
        return false
      }

      if (
        periodEnd &&
        generated > periodEnd
      ) {
        return false
      }

      if (paymentFilter === 'a_payer' && echeanceRemainingAmount(r, 'commercial') <= 0) return false
      if (paymentFilter === 'payees' && echeancePaidAmount(r, 'commercial') <= 0) return false

      if (query) {
        const haystack = [
          r.libelle,
          r.commercial?.nom_complet,
          TYPES[r.type],
          r.reference_type,
          r.reference_id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [
    rows,
    admin,
    commercialFilter,
    periodStart,
    periodEnd,
    paymentFilter,
    search,
  ])

  /*
   * COMMISSIONS COMMERCIAL
   */
  const totalCommercial = useMemo(
    () =>
      filteredRows
        .filter(
          (r) => r.statut !== 'annulee',
        )
        .reduce(
          (sum, r) =>
            sum + amount(r.montant_commercial),
          0,
        ),
    [filteredRows],
  )

  const commercialEnAttente = useMemo(() => filteredRows.filter(r => r.statut !== 'annulee').reduce((sum, r) => sum + echeanceRemainingAmount(r, 'commercial'), 0), [filteredRows])


  const commercialPaye = useMemo(() => filteredRows.filter(r => r.statut !== 'annulee').reduce((sum, r) => sum + echeancePaidAmount(r, 'commercial'), 0), [filteredRows])


  /*
   * COMMISSION POTENTIELLE RENO SOLUCES
   */
  const renovaEnAttente = useMemo(() => filteredRows.filter(r => r.statut !== 'annulee').reduce((sum, r) => sum + echeanceRemainingAmount(r, 'societe'), 0), [filteredRows])


  const renovaPaye = useMemo(() => filteredRows.filter(r => r.statut !== 'annulee').reduce((sum, r) => sum + echeancePaidAmount(r, 'societe'), 0), [filteredRows])


  const renovaTotal = useMemo(
    () =>
      filteredRows
        .filter(
          (r) => r.statut !== 'annulee',
        )
        .reduce(
          (sum, r) =>
            sum + amount(r.montant_societe),
          0,
        ),
    [filteredRows],
  )

  const chargerFacturesCommission = useCallback(async () => {
    if (!profile?.id || admin || profile.role !== 'apporteur') {
      setCommissionFactures([])
      return
    }
    setFacturesLoading(true)
    const { data, error } = await supabase
      .from('commission_factures')
      .select('id,commission_id,montant_ht,taux_tva,numero_facture_emise,date_emission,pdf_storage_path,statut,email_envoye_at,email_erreur,created_at,date_validation,date_paiement,motif_refus')
      .eq('commercial_id', profile.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[RENOVA OS] Chargement factures de commissions:', error)
    } else {
      setCommissionFactures(data || [])
    }
    setFacturesLoading(false)
  }, [profile?.id, admin])

  useEffect(() => {
    void chargerFacturesCommission()
  }, [chargerFacturesCommission])

  const chargerProfilFacturation = useCallback(async () => {
    if (!profile?.id || profile.role !== 'apporteur') return
    setFacturationLoading(true)
    const { data, error } = await supabase
      .from('apporteur_facturation')
      .select('raison_sociale,forme_juridique,siret,numero_tva,adresse,code_postal,ville,email_facturation,telephone')
      .eq('user_id', profile.id)
      .maybeSingle()
    if (error) {
      console.error('[RENOVA OS] Profil de facturation apporteur:', error)
      alert(`Impossible de charger les informations de facturation : ${error.message}`)
    } else if (data) {
      setFacturationProfil({
        raison_sociale: data.raison_sociale || '', forme_juridique: data.forme_juridique || '',
        siret: data.siret || '', numero_tva: data.numero_tva || '', adresse: data.adresse || '',
        code_postal: data.code_postal || '', ville: data.ville || '',
        email_facturation: data.email_facturation || '', telephone: data.telephone || '',
      })
    }
    setFacturationLoading(false)
  }, [profile?.id, profile?.role])

  useEffect(() => {
    void chargerProfilFacturation()
  }, [chargerProfilFacturation])

  async function enregistrerProfilFacturation() {
    if (!profile?.id || profile.role !== 'apporteur' || facturationSaving) return
    const required = [
      ['raison_sociale', 'raison sociale'], ['siret', 'SIRET'], ['adresse', 'adresse'],
      ['code_postal', 'code postal'], ['ville', 'ville'], ['email_facturation', 'e-mail'],
    ] as const
    const missing = required.filter(([key]) => !facturationProfil[key].trim())
    if (missing.length) {
      alert(`Complète les champs obligatoires : ${missing.map(([, label]) => label).join(', ')}.`)
      return
    }
    if (!/^\d{14}$/.test(facturationProfil.siret.replace(/\s/g, ''))) {
      alert('Le SIRET doit contenir exactement 14 chiffres.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(facturationProfil.email_facturation.trim())) {
      alert('L’adresse e-mail de facturation est invalide.')
      return
    }
    setFacturationSaving(true)
    const payload = {
      ...facturationProfil,
      siret: facturationProfil.siret.replace(/\s/g, ''),
      email_facturation: facturationProfil.email_facturation.trim(),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('apporteur_facturation').upsert({
      user_id: profile.id,
      ...payload,
    }, { onConflict: 'user_id' })
    setFacturationSaving(false)
    if (error) {
      alert(`Enregistrement impossible : ${error.message}`)
      return
    }
    alert('Informations de facturation enregistrées.')
  }

  const chargerFacturesAdmin = useCallback(async () => {
    if (!canReviewFactures) {
      setFacturesAdmin([])
      return
    }
    setFacturesAdminLoading(true)
    const { data, error } = await supabase
      .from('commission_factures')
      .select('id,commission_id,commercial_id,organisation_id,numero_facture_emise,montant_ht,taux_tva,date_emission,pdf_storage_path,statut,email_envoye_at,email_erreur,created_at,date_validation,validee_par,date_paiement,motif_refus')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[RENOVA OS] Chargement factures de commissions à traiter:', error)
      alert(`Impossible de charger les factures de commissions : ${error.message}`)
      setFacturesAdmin([])
    } else {
      const list = data || []
      const ids = [...new Set(list.map((f: any) => f.commercial_id).filter(Boolean))]
      let names: Record<string, string> = {}
      if (ids.length) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id,nom_complet')
          .in('id', ids)
        if (profilesError) console.error('[RENOVA OS] Chargement noms des émetteurs:', profilesError)
        for (const p of profilesData || []) names[p.id] = p.nom_complet || p.id
      }
      const commissionIds = [...new Set(list.map((f: any) => f.commission_id).filter(Boolean))]
      let commissionLabels: Record<string, string> = {}
      if (commissionIds.length) {
        const { data: commissionData, error: commissionError } = await supabase
          .from('commissions_safe')
          .select('id,libelle')
          .in('id', commissionIds)
        if (commissionError) console.error('[RENOVA OS] Chargement libellés de commissions:', commissionError)
        for (const commission of commissionData || []) commissionLabels[commission.id] = commission.libelle || 'Commission'
      }
      setFacturesAdmin(list.map((f: any) => ({
        ...f,
        commercial_nom: names[f.commercial_id] || f.commercial_id,
        commission_libelle: commissionLabels[f.commission_id] || 'Commission',
      })))
    }
    setFacturesAdminLoading(false)
  }, [admin, canReviewFactures])

  useEffect(() => {
    void chargerFacturesAdmin()
  }, [chargerFacturesAdmin])

  async function ouvrirPdfFactureCommission(f: any) {
    if (!f.pdf_storage_path) return
    const { data, error } = await supabase.storage
      .from('commission-factures')
      .createSignedUrl(f.pdf_storage_path, 60)
    if (error || !data?.signedUrl) {
      alert(`Ouverture du PDF impossible : ${error?.message || 'lien indisponible'}`)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function traiterFactureCommission(f: any, nextStatus: 'validee' | 'refusee' | 'payee') {
    if (!admin || !profile?.id) return
    if (nextStatus === 'payee' && f.statut !== 'validee') {
      alert('Une facture doit être validée avant de pouvoir être marquée payée.')
      return
    }
    let motifRefus: string | null = null
    if (nextStatus === 'refusee') {
      motifRefus = prompt('Motif du refus (obligatoire) :')?.trim() || null
      if (!motifRefus) return
    } else if (!confirm(nextStatus === 'validee' ? 'Valider cette facture de commission ?' : 'Confirmer le paiement effectif de cette facture ?')) {
      return
    }
    const now = new Date().toISOString()
    const patch: Record<string, any> = {
      statut: nextStatus,
      updated_at: now,
      ...(nextStatus === 'validee' || nextStatus === 'refusee'
        ? { date_validation: now, validee_par: profile.id }
        : {}),
      ...(nextStatus === 'payee' ? { date_paiement: now } : {}),
      ...(nextStatus === 'refusee' ? { motif_refus: motifRefus } : { motif_refus: null }),
    }
    const { error } = await supabase
      .from('commission_factures')
      .update(patch)
      .eq('id', f.id)
    if (error) {
      alert(`Traitement impossible : ${error.message}`)
      return
    }
    await chargerFacturesAdmin()
  }

  async function genererPdfFactureCommission(facture: any) {
    if (profile?.role !== 'apporteur' || !profile.id || facture.commercial_id && facture.commercial_id !== profile.id) {
      alert('Accès refusé : seules vos propres factures de commission peuvent être générées.')
      return
    }
    try {
      const { data: issuer, error: issuerError } = await supabase
        .from('apporteur_facturation')
        .select('raison_sociale,forme_juridique,siret,numero_tva,adresse,code_postal,ville,email_facturation,telephone')
        .eq('user_id', profile.id)
        .maybeSingle()
      if (issuerError) throw issuerError
      if (!issuer || !issuer.raison_sociale?.trim() || !issuer.siret?.trim() || !issuer.adresse?.trim() ||
          !issuer.code_postal?.trim() || !issuer.ville?.trim() || !issuer.email_facturation?.trim()) {
        alert('Complète et enregistre d’abord tes informations de facturation (raison sociale, SIRET, adresse et e-mail).')
        return
      }
      const { data: buyer, error: buyerError } = await supabase
        .from('entreprises')
        .select('raison_sociale,siret,forme_juridique,numero_tva,adresse,code_postal,ville,email,telephone')
        .eq('organisation_id', facture.organisation_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (buyerError) throw buyerError
      if (!buyer || !buyer.raison_sociale?.trim() || !buyer.siret?.trim() || !buyer.adresse?.trim() ||
          !buyer.code_postal?.trim() || !buyer.ville?.trim()) {
        alert('Les informations légales de Reno Soluces sont incomplètes. Un administrateur doit compléter SIRET, adresse, code postal et ville dans Paramètres avant de générer une facture.')
        return
      }
      const { data: numbered, error: numberError } = await supabase.rpc('attribuer_numero_facture_commission', {
        p_facture_id: facture.id,
      }).single()
      if (numberError) throw numberError
      const invoice = numbered as any
      const commission = rows.find(c => c.id === facture.commission_id)
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const left = 18
      const right = 192
      const line = (y: number) => doc.line(left, y, right, y)
      const textSafe = (value: unknown) => String(value ?? '').trim() || '—'
      const number = String(invoice.numero_facture || facture.numero_facture_emise || '')
      const date = String(invoice.date_emission || facture.date_emission || todayInput())
      const ht = amount(invoice.montant_ht ?? facture.montant_ht)
      const vatRate = amount(invoice.taux_tva ?? facture.taux_tva)
      const vat = Math.round(ht * vatRate) / 100
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.text('FACTURE', left, 22)
      doc.setFontSize(11)
      doc.text(number, right, 22, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Date d’émission : ${date}`, right, 29, { align: 'right' })
      doc.setFont('helvetica', 'bold')
      doc.text('ÉMETTEUR', left, 43)
      doc.text('DESTINATAIRE', 108, 43)
      doc.setFont('helvetica', 'normal')
      const issuerLines = [
        issuer.raison_sociale,
        issuer.forme_juridique,
        `SIRET : ${issuer.siret}`,
        issuer.numero_tva ? `TVA : ${issuer.numero_tva}` : '',
        issuer.adresse,
        `${issuer.code_postal} ${issuer.ville}`,
        issuer.email_facturation,
        issuer.telephone ? `Tél. : ${issuer.telephone}` : '',
      ].filter(Boolean)
      const buyerLines = [
        buyer.raison_sociale,
        buyer.forme_juridique,
        `SIRET : ${buyer.siret}`,
        buyer.numero_tva ? `TVA : ${buyer.numero_tva}` : '',
        buyer.adresse,
        `${buyer.code_postal} ${buyer.ville}`,
        buyer.email,
        buyer.telephone ? `Tél. : ${buyer.telephone}` : '',
      ].filter(Boolean)
      doc.text(issuerLines.map(textSafe), left, 50)
      doc.text(buyerLines.map(textSafe), 108, 50)
      line(100)
      doc.setFont('helvetica', 'bold')
      doc.text('Désignation', left, 108)
      doc.text('Qté', 133, 108, { align: 'right' })
      doc.text('Prix HT', 157, 108, { align: 'right' })
      doc.text('Total HT', right, 108, { align: 'right' })
      line(112)
      doc.setFont('helvetica', 'normal')
      const designation = commission?.libelle || 'Commission d’apport d’affaires'
      const wrapped = doc.splitTextToSize(designation, 100)
      doc.text(wrapped, left, 121)
      doc.text('1', 133, 121, { align: 'right' })
      doc.text(euro(ht), 157, 121, { align: 'right' })
      doc.text(euro(ht), right, 121, { align: 'right' })
      const totalY = Math.max(142, 121 + wrapped.length * 5 + 8)
      line(totalY)
      doc.text(`Total HT : ${euro(ht)}`, right, totalY + 9, { align: 'right' })
      doc.text(`TVA (${vatRate}%): ${euro(vat)}`, right, totalY + 16, { align: 'right' })
      doc.setFont('helvetica', 'bold')
      doc.text(`Total TTC : ${euro(ht + vat)}`, right, totalY + 24, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text('Facture de commission d’apport d’affaires. Les conditions et délais de paiement applicables restent ceux convenus entre les parties.', left, 270, { maxWidth: 170 })
      doc.text(`Émetteur : ${issuer.raison_sociale} · Facture ${number}`, left, 285)
      const pdfBlob = doc.output('blob')
      const path = `${profile.id}/${facture.id}/${number}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('commission-factures')
        .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true })
      if (uploadError) throw uploadError
      const { error: updateError } = await supabase.rpc('enregistrer_pdf_facture_commission', {
        p_facture_id: facture.id,
        p_storage_path: path,
      })
      if (updateError) throw updateError
      doc.save(`${number}.pdf`)
      await chargerFacturesCommission()
      alert('PDF généré et enregistré dans le stockage privé. Vérifie son contenu avant de soumettre la facture.')
    } catch (error: any) {
      console.error('[RENOVA OS] Génération facture de commission:', error)
      alert(`Génération du PDF impossible : ${error?.message || 'erreur inconnue'}`)
    }
  }

  async function preparerFactureCommission(c: CommissionWithCommercial) {
    if (profile?.role !== 'apporteur') { alert('Seuls les apporteurs d’affaires peuvent préparer une facture de commission.'); return; }
    if (!profile?.id || !profile.organisation_id) {
      alert("Impossible de préparer cette facture : organisation ou profil manquant.");
      return;
    }
    if (c.statut === 'annulee' || amount(c.montant_commercial) <= 0) {
      alert("Cette commission annulée ou d'un montant nul ne peut pas être facturée.");
      return;
    }
    const { error } = await supabase.from('commission_factures').insert({
      commission_id: c.id,
      commercial_id: profile.id,
      organisation_id: profile.organisation_id,
      montant_ht: amount(c.montant_commercial),
      statut: 'a_preparer',
    });
    if (error) {
      alert(error.code === '23505'
        ? "Une facture de commission est déjà préparée pour cette commission."
        : `Préparation impossible : ${error.message}`);
      return;
    }
    await chargerFacturesCommission()
    alert("La préparation de facture est créée. Les informations légales, la numérotation, le PDF et l'envoi restent à finaliser.");
  }

  function resetFilters() {
    setSearch('')
    setCommercialFilter('all')
    setPeriodStart('')
    setPeriodEnd('')
    setPaymentFilter('toutes')
  }

  /*
   * MATRICE DE RÉMUNÉRATION
   */
  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY, public_cible: baremePublic === 'visite_technique' ? 'tous' : baremePublic, type: baremePublic === 'visite_technique' ? 'vt' : 'devis_signe' })
    setModal(true)
  }

  function openEdit(r: any) {
    setEditing(r.id)

    setForm({
      type: r.type,
      libelle: r.libelle,
      commercial_id:
        r.commercial_id || '',
      produit_id:
        r.produit_id || '',
      montant_commercial:
        String(
          r.montant_commercial ?? '',
        ),
      montant_societe:
        String(
          r.montant_societe ?? '',
        ),
      pourcentage_commercial:
        r.pourcentage_commercial == null
          ? ''
          : String(
              r.pourcentage_commercial,
            ),
      mode: r.mode || 'fixe',
      base_pourcentage:
        r.base_pourcentage ||
        'montant_ht',
      priorite: String(
        r.priorite || 0,
      ),
      date_debut:
        r.date_debut || '',
      date_fin:
        r.date_fin || '',
      actif: r.actif,
      public_cible: r.public_cible || 'tous',
      categorie_produit: r.categorie_produit || produits.find((p: any) => p.id === r.produit_id)?.categorie || '',
      variante_produit: r.variante_produit || '',
    })

    setModal(true)
  }

  async function save() {
    if (!form.libelle) return

    setSaving(true)

    const payload = {
      type: form.type,
      libelle: form.libelle,
      commercial_id:
        form.commercial_id || null,
      produit_id:
        form.produit_id || null,
      montant_commercial:
        Number(
          form.montant_commercial,
        ) || 0,
      montant_societe:
        Number(
          form.montant_societe,
        ) || 0,
      pourcentage_commercial:
        form.pourcentage_commercial ===
        ''
          ? null
          : Number(
              form.pourcentage_commercial,
            ),
      mode: form.mode,
      base_pourcentage:
        form.base_pourcentage,
      priorite:
        Number(form.priorite) || 0,
      date_debut:
        form.date_debut || null,
      date_fin:
        form.date_fin || null,
      actif: form.actif,
      public_cible: form.public_cible || (baremePublic === 'visite_technique' ? 'tous' : baremePublic),
      categorie_produit: form.categorie_produit || null,
      variante_produit: form.variante_produit || null,
    }

    const q = editing
      ? supabase
          .from('commission_bareme')
          .update(payload)
          .eq('id', editing)
      : supabase
          .from('commission_bareme')
          .insert(payload)

    const { error } = await q

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setModal(false)
    load()
  }

  async function remove(id: string) {
    if (
      !confirm(
        'Supprimer cette règle ?',
      )
    ) {
      return
    }

    const { error } = await supabase
      .from('commission_bareme')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
    }

    load()
  }

  /*
   * VALIDATION / ANNULATION
   */
  async function status(
    c: CommissionWithCommercial,
    s: 'validee' | 'annulee',
  ) {
    const { error } = await supabase
      .from('commissions')
      .update({
        statut: s,
        date_validation:
          s === 'validee'
            ? new Date().toISOString()
            : null,
      })
      .eq('id', c.id)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  /*
   * PAIEMENT
   */
  function openPayment(
    c: CommissionWithCommercial,
    target: PaymentTarget,
  ) {
    setPaymentCommission(c)
    setPaymentTarget(target)

    const current =
      target === 'commercial'
        ? c.date_paiement_commercial
        : c.date_paiement_societe

    setPaymentDate(
      current
        ? current.slice(0, 10)
        : todayInput(),
    )

    setPaymentModal(true)
  }

  async function openEcheances(c: CommissionWithCommercial, target: PaymentTarget) {
    setEcheanceCommission(c)
    setEcheanceTarget(target)
    setEcheanceForm({ libelle: target === 'societe' ? 'Paiement Reno Soluces' : 'Paiement commercial', montant: '', date_prevue: '' })
    const { data, error } = await supabase.from('commission_echeances').select('*').eq('commission_id', c.id).eq('beneficiaire', target).order('ordre').order('created_at')
    if (error) { alert(`Impossible de charger les échéances : ${error.message}`); return }
    setEcheances(data || [])
    setEcheanceModal(true)
  }
  async function addEcheance() {
    if (!echeanceCommission) return
    const montant = Number(echeanceForm.montant)
    if (!Number.isFinite(montant) || montant <= 0) { alert('Indique un montant supérieur à 0 €.'); return }
    setEcheanceSaving(true)
    const { data, error } = await supabase.from('commission_echeances').insert({
      commission_id: echeanceCommission.id, beneficiaire: echeanceTarget,
      libelle: echeanceForm.libelle.trim() || (echeanceTarget === 'societe' ? 'Paiement Reno Soluces' : 'Paiement commercial'),
      montant, date_prevue: echeanceForm.date_prevue || null, ordre: echeances.length,
    }).select('*').single()
    setEcheanceSaving(false)
    if (error) { alert(`Erreur ajout échéance : ${error.message}`); return }
    if (data) setEcheances(prev => [...prev, data])
    setEcheanceForm({ libelle: echeanceTarget === 'societe' ? 'Paiement Reno Soluces' : 'Paiement commercial', montant: '', date_prevue: '' })
    load()
  }
  async function toggleEcheancePaid(e: any) {
    const nextDate = e.date_paiement ? null : new Date().toISOString()
    const { data, error } = await supabase.from('commission_echeances').update({ date_paiement: nextDate }).eq('id', e.id).select('*').single()
    if (error) { alert(`Erreur paiement : ${error.message}`); return }
    if (data) setEcheances(prev => prev.map(x => x.id === e.id ? data : x))
    load()
  }
  async function deleteEcheance(e: any) {
    if (!confirm(`Supprimer l'échéance « ${e.libelle} » ?`)) return
    const { error } = await supabase.from('commission_echeances').delete().eq('id', e.id)
    if (error) { alert(`Erreur suppression : ${error.message}`); return }
    setEcheances(prev => prev.filter(x => x.id !== e.id)); load()
  }

  function openCommissionEdit(c: CommissionWithCommercial) {
    setEditCommission(c)
    setEditAmounts({
      montant_commercial: String(c.montant_commercial ?? 0),
      montant_societe: String(c.montant_societe ?? 0),
    })
    setEditReason('')
  }

  async function saveCommissionEdit() {
    if (!editCommission || !admin || editSaving) return

    const commercial = Number(editAmounts.montant_commercial)
    const societe = Number(editAmounts.montant_societe)

    if (!Number.isFinite(commercial) || !Number.isFinite(societe) || commercial < 0 || societe < 0) {
      alert('Les deux montants doivent être positifs ou nuls.')
      return
    }
    if (!editReason.trim()) {
      alert('Indique le motif de la correction.')
      return
    }

    setEditSaving(true)
    try {
      const { error } = await supabase.rpc('ajuster_commission', {
        p_commission_id: editCommission.id,
        p_montant_commercial: commercial,
        p_montant_societe: societe,
        p_motif: editReason.trim(),
      })
      if (error) {
        alert(`Modification impossible : ${error.message}`)
        return
      }
      setEditCommission(null)
      await load()
    } finally {
      setEditSaving(false)
    }
  }

  async function savePayment() {
    if (
      !paymentCommission ||
      !paymentDate
    ) {
      return
    }

    setPaymentSaving(true)

    const paymentIso = new Date(
      `${paymentDate}T12:00:00`,
    ).toISOString()

    const field =
      paymentTarget === 'commercial'
        ? 'date_paiement_commercial'
        : 'date_paiement_societe'

    const nextCommercialDate =
      paymentTarget ===
      'commercial'
        ? paymentIso
        : paymentCommission.date_paiement_commercial

    const nextSocieteDate =
      paymentTarget === 'societe'
        ? paymentIso
        : paymentCommission.date_paiement_societe

    const bothPaid =
      !!nextCommercialDate &&
      !!nextSocieteDate

    const { error } =
      await supabase
        .from('commissions')
        .update({
          [field]: paymentIso,

          /*
           * Une commission est entièrement payée
           * uniquement lorsque les deux paiements
           * existent.
           */
          ...(bothPaid
            ? {
                statut: 'payee',
              }
            : {
                statut:
                  'validee',
              }),
        })
        .eq(
          'id',
          paymentCommission.id,
        )

    setPaymentSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setPaymentModal(false)
    setPaymentCommission(null)

    load()
  }

  async function clearPayment(
    c: CommissionWithCommercial,
    target: PaymentTarget,
  ) {
    const label =
      target === 'commercial'
        ? 'commercial'
        : 'Reno Soluces'

    if (
      !confirm(
        `Retirer la date de paiement du ${label} ?`,
      )
    ) {
      return
    }

    const field =
      target === 'commercial'
        ? 'date_paiement_commercial'
        : 'date_paiement_societe'

    const otherPaid =
      target === 'commercial'
        ? !!c.date_paiement_societe
        : !!c.date_paiement_commercial

    const { error } =
      await supabase
        .from('commissions')
        .update({
          [field]: null,
          ...(c.statut === 'payee'
            ? {
                statut: otherPaid
                  ? 'validee'
                  : 'en_attente',
              }
            : {}),
        })
        .eq('id', c.id)

    if (error) {
      alert(error.message)
    }

    load()
  }

  const displayedRules = rules.filter((r: any) => {
    if (baremePublic === 'visite_technique') {
      return r.type === 'vt' || produits.some((p: any) => p.id === r.produit_id && p.catalogue_groupe === 'visite_technique')
    }
    return (r.public_cible || 'tous') === baremePublic || (r.public_cible || 'tous') === 'tous'
  })
  const categoriesProduits = [...new Set(produits
    .filter((p: any) => form.type === 'vt'
      ? p.catalogue_groupe === 'visite_technique'
      : (form.public_cible === 'tous' || p.public_cible === form.public_cible) && p.catalogue_groupe !== 'visite_technique')
    .map((p: any) => p.categorie).filter(Boolean))].sort()
  function produitVariant(p: any): string | null {
    const a = p.caracteristiques || {}
    if (p.categorie === 'pac_air_air') {
      const n = Number(a.puissance_froid_kw ?? a.puissance)
      return Number.isFinite(n) && n > 0 ? String(n) : null
    }
    if (p.categorie === 'photovoltaique') {
      const n = Number(a.puissance_kwc ?? a.puissance_pv_kWc)
      return Number.isFinite(n) && n > 0 ? String(n) : null
    }
    if (p.categorie === 'batterie_stockage') {
      if (/additionnelle/i.test(p.nom || '')) return 'additionnelle_5.12'
      const cap = Number(a.capacite_stockage_kWh ?? a.capacite_kWh)
      if (!Number.isFinite(cap) || cap <= 0) return null
      const phase = String(a.phase || p.nom || '').toLowerCase().includes('triphas') ? 'triphase' : String(a.phase || p.nom || '').toLowerCase().includes('monophas') ? 'monophase' : 'inconnu'
      return `${cap}_${phase}`
    }
    return null
  }
  const produitsCategorie = produits.filter((p: any) => p.categorie === form.categorie_produit && (form.type === 'vt'
    ? p.catalogue_groupe === 'visite_technique'
    : form.public_cible === 'tous' || p.public_cible === form.public_cible))
  const contextualVariantCategory = ['solaire_thermique', 'combles_perdus'].includes(form.categorie_produit)
  const ruleVariants = rules
    .filter((r: any) => r.categorie_produit === form.categorie_produit
      && (r.public_cible === form.public_cible || r.public_cible === 'tous')
      && r.variante_produit)
    .map((r: any) => String(r.variante_produit))
  const variantesProduits = [...new Set([
    ...produitsCategorie.map((p: any) => produitVariant(p)).filter(Boolean),
    ...ruleVariants,
  ])].sort((a: any, b: any) => String(a).localeCompare(String(b), 'fr', { numeric: true }))
  const produitsFiltres = produitsCategorie.filter((p: any) => !form.variante_produit || contextualVariantCategory || produitVariant(p) === form.variante_produit)

  const echeanceTotal = echeances.reduce((sum, e) => sum + amount(e.montant), 0)
  const echeancePaid = echeances.filter(e => !!e.date_paiement).reduce((sum, e) => sum + amount(e.montant), 0)
  const echeanceExpected = echeanceCommission ? (echeanceTarget === 'societe' ? amount(echeanceCommission.montant_societe) : amount(echeanceCommission.montant_commercial)) : 0

  return (
    <div className="page commissions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {admin
              ? 'Suivi financier'
              : 'Mes commissions'}
          </h1>

          <p className="page-subtitle">
            {admin
              ? 'Pilotage des commissions commerciales et du suivi des paiements.'
              : `Bonjour ${firstName(
                  profile?.nom_complet,
                )}, voici le suivi de vos commissions.`}
          </p>
        </div>

        {admin &&
          tab === 'bareme' && (
            <Button
              variant="primary"
              onClick={openNew}
            >
              <Plus size={18} />
              Nouvelle règle
            </Button>
          )}
      </div>

      {canViewBareme && (
        <div
          className="view-toggle"
          style={{
            marginBottom: 16,
          }}
        >
          <button
            className={`view-toggle-btn ${
              tab === 'suivi'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setTab('suivi')
            }
          >
            <Wallet size={15} />
            Suivi financier
          </button>

          <button
            className={`view-toggle-btn ${
              tab === 'bareme'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setTab('bareme')
            }
          >
            <Settings2 size={15} />
            Matrice de rémunération
          </button>
        </div>
      )}

      {tab === 'bareme' && !admin && (
        <div className="commission-readonly-notice" role="status">
          <div className="commission-readonly-icon"><ShieldCheck size={18} /></div>
          <div>
            <strong>Matrice en lecture seule</strong>
            <p>Vous pouvez consulter les règles de rémunération applicables à votre compte. La création et la modification des barèmes sont réservées à l’administration.</p>
          </div>
        </div>
      )}

      {(tab === 'suivi' || !canViewBareme) && (
        <>
          {canReviewFactures && (
            <section className="card card-pad" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Factures de commissions à traiter</h2>
                  <p className="text-sm text-muted" style={{ margin: '5px 0 0' }}>Validation, refus motivé et suivi des paiements. La génération PDF et l’envoi restent séparés.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void chargerFacturesAdmin()} disabled={facturesAdminLoading}>
                  <RotateCcw size={14} /> Actualiser
                </Button>
              </div>
              {facturesAdminLoading ? <p className="text-sm text-muted">Chargement des factures…</p> : facturesAdmin.length === 0 ? (
                <p className="text-sm text-muted">Aucune facture de commission enregistrée dans votre organisation.</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {facturesAdmin.map((f: any) => (
                    <div key={f.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--c-border)' }}>
                      <div>
                        <strong>{f.commercial_nom}</strong>
                        <div className="text-sm text-muted">{f.commission_libelle || rows.find(c => c.id === f.commission_id)?.libelle || 'Commission'} · {euro(amount(f.montant_ht))} HT · Créée le {formatDate(f.created_at)}</div>
                        <div className="text-sm text-muted">Statut : {({ a_preparer: 'À préparer', deposee: 'Soumise', validee: 'Validée', refusee: 'Refusée', payee: 'Payée' } as Record<string,string>)[f.statut] || f.statut}</div>
                        {f.motif_refus && <div className="text-sm" style={{ color: 'var(--c-danger, #b42318)' }}>Motif du refus : {f.motif_refus}</div>}
                        {f.email_erreur && <div className="text-sm" style={{ color: 'var(--c-danger, #b42318)' }}>Erreur e-mail : {f.email_erreur}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {f.pdf_storage_path && <Button size="sm" variant="secondary" onClick={() => void ouvrirPdfFactureCommission(f)}>Voir PDF</Button>}
                        {f.statut === 'deposee' && <>
                          <Button size="sm" variant="primary" onClick={() => void traiterFactureCommission(f, 'validee')}>Valider</Button>
                          <Button size="sm" variant="secondary" onClick={() => void traiterFactureCommission(f, 'refusee')}>Refuser</Button>
                        </>}
                        {f.statut === 'validee' && <Button size="sm" variant="primary" onClick={() => void traiterFactureCommission(f, 'payee')}>Marquer payée</Button>}
                        {f.statut === 'payee' && <span className="text-sm text-muted">Payée le {formatDate(f.date_paiement)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {profile?.role === 'apporteur' && (
            <section className="card card-pad" style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ margin: 0 }}>Mes informations de facturation</h2>
                <p className="text-sm text-muted" style={{ margin: '5px 0 0' }}>
                  Ces informations sont privées et accessibles uniquement à votre compte. Elles seront utilisées pour préparer vos factures ; vérifiez-les avant toute émission.
                </p>
              </div>
              {facturationLoading ? <p className="text-sm text-muted">Chargement des informations…</p> : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {([
                      ['raison_sociale', 'Raison sociale *'],
                      ['forme_juridique', 'Forme juridique'],
                      ['siret', 'SIRET (14 chiffres) *'],
                      ['numero_tva', 'N° TVA intracommunautaire'],
                      ['adresse', 'Adresse de facturation *'],
                      ['code_postal', 'Code postal *'],
                      ['ville', 'Ville *'],
                      ['email_facturation', 'E-mail de facturation *'],
                      ['telephone', 'Téléphone'],
                    ] as const).map(([key, label]) => (
                      <label key={key} style={{ display: 'grid', gap: 5, fontSize: 13, color: 'var(--c-text-secondary, var(--c-muted))' }}>
                        {label}
                        <input
                          value={facturationProfil[key]}
                          onChange={e => setFacturationProfil(prev => ({ ...prev, [key]: e.target.value }))}
                          autoComplete="off"
                          type={key === 'email_facturation' ? 'email' : 'text'}
                          style={{ width: '100%', minWidth: 0, padding: '10px 11px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-card, white)', color: 'var(--c-text)' }}
                        />
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <Button variant="primary" onClick={() => void enregistrerProfilFacturation()} disabled={facturationSaving || facturationLoading}>
                      {facturationSaving ? 'Enregistrement…' : 'Enregistrer mes informations'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted" style={{ marginTop: 10 }}>
                    La génération du PDF et l’envoi resteront bloqués tant que les informations légales du destinataire et les paramètres de facturation ne seront pas confirmés.
                  </p>
                </>
              )}
            </section>
          )}

          {profile?.role === 'apporteur' && (
            <section className="card card-pad" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Mes factures de commissions</h2>
                  <p className="text-sm text-muted" style={{ margin: '5px 0 0' }}>Préparations enregistrées pour vos commissions.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void chargerFacturesCommission()} disabled={facturesLoading}>
                  <RotateCcw size={14} /> Actualiser
                </Button>
              </div>
              {facturesLoading ? (
                <p className="text-sm text-muted">Chargement des factures…</p>
              ) : commissionFactures.length === 0 ? (
                <p className="text-sm text-muted">Aucune facture préparée pour le moment. Utilisez « Préparer ma facture » sur une commission éligible.</p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {commissionFactures.map((f) => (
                    <div key={f.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--c-border)' }}>
                      <div>
                        <strong>{rows.find((c) => c.id === f.commission_id)?.libelle || 'Commission'}</strong>
                        <div className="text-sm text-muted">
                          {f.numero_facture_emise || 'Numéro à renseigner'} · Créée le {formatDate(f.created_at)}
                        </div>
                        {f.email_erreur && <div className="text-sm" style={{ color: 'var(--c-danger, #b42318)' }}>E-mail : {f.email_erreur}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong>{euro(amount(f.montant_ht))} HT</strong>
                        <span className={`badge ${f.statut === 'payee' ? 'badge-success' : f.statut === 'refusee' ? 'badge-danger' : 'badge-warning'}`}>
                          {({ a_preparer: 'À préparer', deposee: 'Soumise', validee: 'Validée', refusee: 'Refusée', payee: 'Payée' } as Record<string, string>)[f.statut] || f.statut}
                        </span>
                        {(f.statut === 'a_preparer' || f.statut === 'refusee') && <Button size="sm" variant="secondary" onClick={() => void genererPdfFactureCommission(f)}>Générer / refaire le PDF</Button>}
                        {f.statut === 'deposee' && f.email_erreur && <Button size="sm" variant="secondary" onClick={async () => {
                          const { data, error } = await supabase.functions.invoke('send-commission-invoice', { body: { factureId: f.id } })
                          await chargerFacturesCommission()
                          if (error || data?.error) alert(`Nouvelle tentative d’envoi impossible : ${error?.message || data?.error}`)
                          else alert('E-mail de la facture envoyé à Reno Soluces.')
                        }}>Réessayer l’envoi</Button>}
                        {(f.statut === 'a_preparer' || f.statut === 'refusee') && (!f.numero_facture_emise || !f.date_emission || !f.pdf_storage_path) && <span className="text-sm text-muted">PDF requis avant soumission</span>}
                        {(f.statut === 'a_preparer' || f.statut === 'refusee') && f.numero_facture_emise && f.date_emission && f.pdf_storage_path && <Button size="sm" variant="primary" onClick={async () => {
                          const { error } = await supabase.rpc('soumettre_facture_commission', { p_facture_id: f.id })
                          if (error) { alert(`Soumission impossible : ${error.message}`); return }
                          const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-commission-invoice', { body: { factureId: f.id } })
                          await chargerFacturesCommission()
                          if (sendError || sendResult?.error) {
                            alert(`Facture soumise à validation, mais l’e-mail n’a pas pu être envoyé : ${sendError?.message || sendResult?.error}. Vérifie l’adresse de Reno Soluces dans Paramètres ; tu pourras réessayer après correction.`)
                            return
                          }
                          alert('Facture soumise et envoyée par e-mail à Reno Soluces.')
                        }}>{f.statut === 'refusee' ? 'Corriger et resoumettre' : 'Soumettre'}</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          <div
            className="kpi-grid page-kpi-strip"
            style={{
              marginBottom: 20,
            }}
          >
            <div className="kpi-tile">
              <div className="kpi-tile-icon amber">
                <Clock size={20} />
              </div>

              <div className="kpi-tile-value">
                {euro(
                  commercialEnAttente,
                )}
              </div>

              <div className="kpi-tile-label">
                {admin
                  ? 'Commissions commerciales en cours'
                  : 'Mes commissions en cours'}
              </div>
            </div>

            <div className="kpi-tile">
              <div className="kpi-tile-icon green">
                <Banknote size={20} />
              </div>

              <div className="kpi-tile-value">
                {euro(
                  commercialPaye,
                )}
              </div>

              <div className="kpi-tile-label">
                {admin
                  ? 'Commissions commerciales payées'
                  : 'Mes commissions payées'}
              </div>
            </div>

            <div className="kpi-tile">
              <div className="kpi-tile-icon blue">
                <CheckCircle2 size={20} />
              </div>

              <div className="kpi-tile-value">
                {euro(
                  totalCommercial,
                )}
              </div>

              <div className="kpi-tile-label">
                Total commissions commerciales
              </div>
            </div>

            {admin && (
              <div className="kpi-tile">
                <div className="kpi-tile-icon purple">
                  <Building2 size={20} />
                </div>

                <div className="kpi-tile-value">
                  {euro(
                    renovaEnAttente,
                  )}
                </div>

                <div className="kpi-tile-label">
                  Commission potentielle Reno Soluces
                  en cours
                </div>
              </div>
            )}
          </div>

          {admin && (
            <div
              className="kpi-grid page-kpi-strip"
              style={{
                marginBottom: 20,
              }}
            >
              <div className="kpi-tile">
                <div className="kpi-tile-icon purple">
                  <Building2 size={20} />
                </div>

                <div className="kpi-tile-value">
                  {euro(
                    renovaTotal,
                  )}
                </div>

                <div className="kpi-tile-label">
                  Total potentiel Reno Soluces
                </div>
              </div>

              <div className="kpi-tile">
                <div className="kpi-tile-icon green">
                  <Banknote size={20} />
                </div>

                <div className="kpi-tile-value">
                  {euro(
                    renovaPaye,
                  )}
                </div>

                <div className="kpi-tile-label">
                  Reno Soluces payé
                </div>
              </div>
            </div>
          )}

          <div
            className="card"
            style={{
              marginBottom: 16,
            }}
          >
            <div className="card-pad">
              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Filter size={16} />
                <strong>
                  Filtres
                </strong>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    admin
                      ? '1.4fr 1fr 1fr 1fr 1fr'
                      : '1.5fr 1fr 1fr 1fr',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    position:
                      'relative',
                  }}
                >
                  <Search
                    size={15}
                    style={{
                      position:
                        'absolute',
                      left: 10,
                      top: 12,
                      zIndex: 1,
                    }}
                  />

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value,
                      )
                    }
                    placeholder="Client, référence, libellé…"
                    style={{
                      width:
                        '100%',
                      padding:
                        '10px 10px 10px 32px',
                      border:
                        '1px solid var(--c-border)',
                      borderRadius: 8,
                      background:
                        'white',
                    }}
                  />
                </div>

                {admin && (
                  <select
                    value={
                      commercialFilter
                    }
                    onChange={(e) =>
                      setCommercialFilter(
                        e.target.value,
                      )
                    }
                    style={{
                      width:
                        '100%',
                      padding: 10,
                      border:
                        '1px solid var(--c-border)',
                      borderRadius: 8,
                      background:
                        'white',
                    }}
                  >
                    <option value="all">
                      Tous les commerciaux
                    </option>

                    {commerciaux.map(
                      (c) => (
                        <option
                          key={c.id}
                          value={c.id}
                        >
                          {c.nom_complet ||
                            c.email}
                        </option>
                      ),
                    )}
                  </select>
                )}

                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) =>
                    setPeriodStart(
                      e.target.value,
                    )
                  }
                  style={{
                    width:
                      '100%',
                    padding: 10,
                    border:
                      '1px solid var(--c-border)',
                    borderRadius: 8,
                  }}
                />

                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) =>
                    setPeriodEnd(
                      e.target.value,
                    )
                  }
                  style={{
                    width:
                      '100%',
                    padding: 10,
                    border:
                      '1px solid var(--c-border)',
                    borderRadius: 8,
                  }}
                />

                <select
                  value={
                    paymentFilter
                  }
                  onChange={(e) =>
                    setPaymentFilter(
                      e.target
                        .value as PaymentFilter,
                    )
                  }
                  style={{
                    width:
                      '100%',
                    padding: 10,
                    border:
                      '1px solid var(--c-border)',
                    borderRadius: 8,
                    background:
                      'white',
                  }}
                >
                  <option value="toutes">
                    Tous les paiements
                  </option>

                  <option value="a_payer">
                    À payer
                  </option>

                  <option value="payees">
                    Payées
                  </option>
                </select>
              </div>

              <div
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'flex-end',
                  marginTop: 10,
                }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={
                    resetFilters
                  }
                >
                  <RotateCcw
                    size={14}
                  />
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              overflowX:
                'auto',
            }}
          >
            <div
              style={{
                minWidth:
                  admin
                    ? 1150
                    : 980,
              }}
            >
              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    admin
                      ? '1.35fr 1fr .95fr 1.05fr 1.05fr 1.2fr 220px'
                      : '1.35fr 1fr 1.05fr 1.15fr 1.15fr 180px',
                  gap: 12,
                  padding:
                    '14px 18px',
                  background:
                    'var(--c-surface-2)',
                  borderBottom:
                    '1px solid var(--c-border)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <span>
                  Origine
                </span>

                <span>
                  Commercial
                </span>

                {admin && (
                  <span>
                    Commission Reno
                  </span>
                )}

                <span>
                  Commission commerciale
                </span>

                <span>
                  Paiement commercial
                </span>

                <span>
                  {admin
                    ? 'Paiement Reno Soluces'
                    : 'Générée le'}
                </span>

                <span>
                  Actions
                </span>
              </div>

              {loading ? (
                <div className="card-pad text-muted">
                  Chargement…
                </div>
              ) : filteredRows.length ===
                0 ? (
                <div className="empty-state">
                  <Wallet
                    size={40}
                  />

                  <h3>
                    Aucune commission
                  </h3>

                  <p>
                    Les commissions
                    apparaîtront
                    automatiquement
                    lorsqu'un devis
                    sera signé.
                  </p>
                </div>
              ) : (
                filteredRows.map(
                  (c) => (
                    <div
                      key={c.id}
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          admin
                            ? '1.35fr 1fr .95fr 1.05fr 1.05fr 1.2fr 220px'
                            : '1.35fr 1fr 1.05fr 1.15fr 1.15fr 180px',
                        gap: 12,
                        alignItems:
                          'center',
                        padding:
                          '15px 18px',
                        borderBottom:
                          '1px solid var(--c-border)',
                        fontSize: 13,
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            display:
                              'block',
                            overflow:
                              'hidden',
                            textOverflow:
                              'ellipsis',
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {c.libelle ||
                            'Commission'}
                        </strong>

                        <span className="text-sm text-muted">
                          {c.reference_id
                            ? `Réf. ${c.reference_id.slice(
                                0,
                                8,
                              )}`
                            : 'Sans référence'}{' '}
                          ·{' '}
                          {TYPES[
                            c.type
                          ]}
                        </span>
                      </div>

                      <div>
                        {c.commercial
                          ?.nom_complet ||
                          '—'}
                      </div>

                      {admin && (
                        <div>
                          <strong>{euro(amount(c.montant_societe))}</strong>
                          {(c.echeances || []).some(e => e.beneficiaire === 'societe') && <div className="text-sm text-muted">{euro(echeancePaidAmount(c, 'societe'))} payé · {euro(echeanceRemainingAmount(c, 'societe'))} restant</div>}

                          <div className="text-sm text-muted">
                            {c.date_paiement_societe
                              ? `Payée le ${formatDate(
                                  c.date_paiement_societe,
                                )}`
                              : 'En cours'}
                          </div>
                        </div>
                      )}

                      <div>
                        <strong>{euro(amount(c.montant_commercial))}</strong>
                        {(c.echeances || []).some(e => e.beneficiaire === 'commercial') && <div className="text-sm text-muted">{euro(echeancePaidAmount(c, 'commercial'))} payé · {euro(echeanceRemainingAmount(c, 'commercial'))} restant</div>}
                      </div>

                      <div>
                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap: 6,
                          }}
                        >
                          {c.date_paiement_commercial ? (
                            <span className="badge badge-success">
                              Payée
                            </span>
                          ) : (
                            <span className="badge badge-warning">
                              En cours
                            </span>
                          )}
                        </div>

                        <div
                          className="text-sm text-muted"
                          style={{
                            marginTop: 4,
                          }}
                        >
                          {c.date_paiement_commercial
                            ? formatDate(
                                c.date_paiement_commercial,
                              )
                            : '—'}
                        </div>
                      </div>

                      <div>
                        {admin ? (
                          <>
                            <div
                              style={{
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                gap: 6,
                              }}
                            >
                              {c.date_paiement_societe ? (
                                <span className="badge badge-success">
                                  Payée
                                </span>
                              ) : (
                                <span className="badge badge-warning">
                                  En cours
                                </span>
                              )}
                            </div>

                            <div
                              className="text-sm text-muted"
                              style={{
                                marginTop: 4,
                              }}
                            >
                              {c.date_paiement_societe
                                ? formatDate(
                                    c.date_paiement_societe,
                                  )
                                : '—'}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-muted">
                            {formatDate(
                              c.date_generation,
                            )}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display:
                            'flex',
                          flexWrap:
                            'wrap',
                          gap: 5,
                          justifyContent:
                            'flex-end',
                        }}
                      >
                        {admin &&
                          c.statut !==
                            'annulee' && (
                            <>
                              {c.statut ===
                                'en_attente' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    status(
                                      c,
                                      'validee',
                                    )
                                  }
                                >
                                  Valider
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCommissionEdit(c)}
                              >
                                <Pencil size={14} /> Modifier les montants
                              </Button>

                              <Button variant="ghost" size="sm" onClick={() => openEcheances(c, 'commercial')}>Échéancier commercial</Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  openPayment(
                                    c,
                                    'commercial',
                                  )
                                }
                              >
                                {c.date_paiement_commercial
                                  ? 'Modifier'
                                  : 'Payer'}{' '}
                                commercial
                              </Button>

                              <Button variant="ghost" size="sm" onClick={() => openEcheances(c, 'societe')}>Échéancier Reno Soluces</Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  openPayment(
                                    c,
                                    'societe',
                                  )
                                }
                              >
                                {c.date_paiement_societe
                                  ? 'Modifier'
                                  : 'Payer'}{' '}
                                Reno Soluces
                              </Button>

                              {c.date_paiement_commercial && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    clearPayment(
                                      c,
                                      'commercial',
                                    )
                                  }
                                >
                                  ×
                                </Button>
                              )}

                              {c.date_paiement_societe && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    clearPayment(
                                      c,
                                      'societe',
                                    )
                                  }
                                >
                                  ×
                                </Button>
                              )}

                              {!c.date_paiement_commercial &&
                                !c.date_paiement_societe &&
                                c.statut !==
                                  'payee' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      status(
                                        c,
                                        'annulee',
                                      )
                                    }
                                  >
                                    <XCircle
                                      size={
                                        14
                                      }
                                    />
                                  </Button>
                                )}
                            </>
                          )}

                        {!admin && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={c.statut === 'annulee' || amount(c.montant_commercial) <= 0}
                              onClick={() => void preparerFactureCommission(c)}
                            >
                              <Banknote size={14} /> Préparer ma facture
                            </Button>
                            <span className="badge badge-info">
                              Lecture seule
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ),
                )
              )}

              {!loading &&
                filteredRows.length >
                  0 && (
                  <div
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        admin
                          ? '1.35fr 1fr .95fr .95fr 1.05fr 1.05fr 1.2fr 220px'
                          : '1.35fr 1fr .95fr 1.05fr 1.15fr 1.15fr 180px',
                      gap: 12,
                      padding:
                        '16px 18px',
                      background:
                        'var(--c-surface-2)',
                      fontWeight: 700,
                    }}
                  >
                    <span>
                      TOTAUX
                    </span>

                    <span>
                      {
                        filteredRows.filter(
                          (r) =>
                            r.statut !==
                            'annulee',
                        ).length
                      }{' '}
                      commission(s)
                    </span>

                    {admin && (
                      <span>
                        {euro(
                          renovaTotal,
                        )}
                      </span>
                    )}

                    <span>
                      {euro(
                        totalCommercial,
                      )}
                    </span>

                    <span>
                      {euro(
                        commercialEnAttente,
                      )}{' '}
                      en cours ·{' '}
                      {euro(
                        commercialPaye,
                      )}{' '}
                      payées
                    </span>

                    <span>
                      {admin
                        ? `${euro(
                            renovaEnAttente,
                          )} en cours · ${euro(
                            renovaPaye,
                          )} payées`
                        : '—'}
                    </span>

                    <span />
                  </div>
                )}
            </div>
          </div>
        </>
      )}

      {canViewBareme &&
        tab === 'bareme' && (
          <>
            <div className="view-toggle" style={{ marginBottom: 16 }}>
              <button className={`view-toggle-btn ${baremePublic === 'particulier' ? 'active' : ''}`} onClick={() => setBaremePublic('particulier')}>Particuliers</button>
              <button className={`view-toggle-btn ${baremePublic === 'professionnel' ? 'active' : ''}`} onClick={() => setBaremePublic('professionnel')}>Professionnels</button>
              <button className={`view-toggle-btn ${baremePublic === 'visite_technique' ? 'active' : ''}`} onClick={() => setBaremePublic('visite_technique')}>Visites techniques</button>
            </div>
            <div className="card commission-matrix">
            <div className="card-pad">
              <div className="commission-matrix-intro"><div><h2>Règles de rémunération</h2><p>Barèmes par catégorie, type de produit et variante.</p></div><span>{displayedRules.length} règle(s)</span></div>
              <div className="commission-table-head commission-rule-row">
                <b>Règle</b>
                <b>Commercial</b>
                <b>Produit</b>
                <b>
                  Rémunération
                </b>
                <b>Priorité</b>
              </div>

              {displayedRules.length ===
              0 ? (
                <div className="empty-state">
                  <Settings2
                    size={40}
                  />

                  <h3>
                    Aucune règle
                  </h3>

                  <p>
                    {admin
                      ? 'Créez votre première règle de rémunération.'
                      : 'Aucune règle de rémunération ne correspond à cette catégorie pour votre compte.'}
                  </p>
                </div>
              ) : (
                displayedRules.map(
                  (r: any) => (
                    <div key={r.id} className="commission-rule-row">
                      <div>
                        <strong>
                          {r.libelle}
                        </strong>

                        <div className="text-sm text-muted">
                          {
                            TYPES[
                              r.type as CommissionType
                            ]
                          }{' '}
                          ·{' '}
                          {r.actif
                            ? 'Actif'
                            : 'Inactif'}
                        </div>
                      </div>

                      <span>
                        {r.commercial_id === profile?.id && !admin
                          ? 'Votre compte'
                          : commerciaux.find((c) => c.id === r.commercial_id)?.nom_complet ||
                            'Tous les commerciaux'}
                      </span>

                      <span>
                        {produits.find((p: any) => p.id === r.produit_id)?.nom ||
                          (r.categorie_produit
                            ? `${String(r.categorie_produit).replace(/_/g, ' ')}${r.variante_produit ? ` · ${r.variante_produit}` : ' · tous les produits du type'}`
                            : 'Tous les produits')}
                      </span>

                      <span>
                        {euro(
                          r.montant_commercial,
                        )}

                        {r.pourcentage_commercial
                          ? ` + ${r.pourcentage_commercial}%`
                          : ''}

                        {admin && <div className="text-sm text-muted">Reno Soluces : {euro(r.montant_societe)}</div>}
                      </span>

                      <span className="flex items-center gap-1">
                        <b>
                          {
                            r.priorite
                          }
                        </b>

                        {admin && <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 size={14} /></Button>
                        </>}
                      </span>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
           </>
        )}

      <Modal
        open={modal}
        onClose={() =>
          setModal(false)
        }
        title={
          editing
            ? 'Modifier la règle'
            : 'Nouvelle règle de rémunération'
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                setModal(false)
              }
            >
              Annuler
            </Button>

            <Button
              variant="primary"
              onClick={save}
              disabled={saving}
            >
              {saving
                ? 'Enregistrement…'
                : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <FloatSelect
          label="Événement"
          value={form.type}
          onChange={(v) =>
            setForm(
              (f: any) => ({
                ...f,
                type: v,
                categorie_produit: '',
                produit_id: '',
              }),
            )
          }
          options={Object.entries(
            TYPES,
          ).map(
            ([value, label]) => ({
              value,
              label,
            }),
          )}
        />

        <div className="mt-4">
          <FloatInput
            label="Libellé"
            value={
              form.libelle
            }
            onChange={(v) =>
              setForm(
                (f: any) => ({
                  ...f,
                  libelle: v,
                }),
              )
            }
            placeholder="Ex : PAC Air/Eau — Jean"
          />
        </div>

        <div className="grid grid-2 gap-3 mt-4">
          <FloatSelect
            label="Catégorie de catalogue"
            value={form.public_cible}
            onChange={(v) => setForm((f: any) => ({ ...f, public_cible: v, categorie_produit: '', produit_id: '' }))}
            options={[
              { value: 'particulier', label: 'Particulier' },
              { value: 'professionnel', label: 'Professionnel' },
              { value: 'tous', label: 'Tous publics' },
            ]}
          />
          <div className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center' }}>
            Les règles sont séparées par public comme le catalogue produits.
          </div>
        </div>

        <div className="grid grid-2 gap-3 mt-4">
          <FloatSelect
            label="Type de produit"
            value={form.categorie_produit}
            onChange={(v) => setForm((f: any) => ({ ...f, categorie_produit: v, variante_produit: '', produit_id: '' }))}
            options={[{ value: '', label: 'Sélectionnez d’abord un type de produit' }, ...categoriesProduits.map((categorie: string) => ({ value: categorie, label: categorie.replace(/_/g, ' ').charAt(0).toUpperCase() + categorie.replace(/_/g, ' ').slice(1) }))]}
          />

          <FloatSelect
            label={form.categorie_produit === 'solaire_thermique' ? "Zone · panneaux · régime d’aide" : form.categorie_produit === 'combles_perdus' ? "Zone · profil du foyer" : "Variante rémunérée (facultatif)"}
            value={form.variante_produit}
            onChange={(v) => setForm((f: any) => ({ ...f, variante_produit: v, produit_id: '' }))}
            options={[{ value: '', label: 'Toutes les variantes du type' }, ...variantesProduits.map((variante: any) => ({ value: String(variante), label: String(variante).replace(/_/g, ' · ').replace(/mpr · cee/i, 'MaPrimeRénov’ + CEE').replace(/full · cee/i, 'Full CEE').replace(/autres/i, 'autres profils').replace(/bleu/i, 'Bleu').replace(/monophase/i, 'monophasé').replace(/triphase/i, 'triphasé') }))]}
          />

          <FloatSelect
            label="Produit (facultatif si règle par type)"
            value={
              form.produit_id
            }
            onChange={(v) =>
              setForm(
                (f: any) => ({
                  ...f,
                  produit_id: v,
                }),
              )
            }
            options={[
              {
                value: '',
                label:
                  'Tous les produits',
              },
              ...produitsFiltres.map(
                (p: any) => ({
                  value: p.id,
                  label: p.nom,
                }),
              ),
            ]}
          />


          <FloatSelect
            label="Commercial"
            value={
              form.commercial_id
            }
            onChange={(v) =>
              setForm(
                (f: any) => ({
                  ...f,
                  commercial_id:
                    v,
                }),
              )
            }
            options={[
              {
                value: '',
                label:
                  'Tous les commerciaux',
              },
              ...commerciaux.map(
                (c) => ({
                  value: c.id,
                  label:
                    c.nom_complet ||
                    c.email,
                }),
              ),
            ]}
          />        </div>

        <div className="grid grid-2 gap-3 mt-4">
          <FloatInput
            label="Montant commercial (€)"
            type="number"
            value={
              form.montant_commercial
            }
            onChange={(v) =>
              setForm(
                (f: any) => ({
                  ...f,
                  montant_commercial:
                    v,
                }),
              )
            }
          />

          <FloatInput
            label="Commission potentielle Reno Soluces (€)"
            type="number"
            value={
              form.montant_societe
            }
            onChange={(v) =>
              setForm(
                (f: any) => ({
                  ...f,
                  montant_societe:
                    v,
                }),
              )
            }
          />
        </div>

        <div className="grid grid-2 gap-3 mt-4">
          <FloatInput
            label="% commercial (optionnel)"
            type="number"
            value={
              form.pourcentage_commercial
            }
            onChange={(v) =>
              setForm(
                (f: any) => ({
                  ...f,
                  pourcentage_commercial:
                    v,
                }),
              )
            }
          />

          <FloatSelect
            label="Mode"
            value={
              form.mode
            }
            onChange={(v) =>
              setForm(
                (f: any) => ({
                  ...f,
                  mode: v,
                }),
              )
            }
            options={[
              {
                value: 'fixe',
                label:
                  'Montant fixe',
              },
              {
                value:
                  'pourcentage',
                label:
                  'Pourcentage',
              },
              {
                value:
                  'fixe_plus_pourcentage',
                label:
                  'Fixe + pourcentage',
              },
              {
                value: 'par_m2',
                label: 'Montant par m²',
              },
            ]}
          />
        </div>

        <div className="grid grid-2 gap-3 mt-4">
          <FloatInput
            label="Priorité"
            type="number"
            value={
              form.priorite
            }
            onChange={(v) =>
              setForm(
                (f: any) => ({
                  ...f,
                  priorite: v,
                }),
              )
            }
          />

          <FloatSelect
            label="Base du pourcentage"
            value={
              form.base_pourcentage
            }
            onChange={(v) =>
              setForm(
                (f: any) => ({
                  ...f,
                  base_pourcentage:
                    v,
                }),
              )
            }
            options={[
              {
                value:
                  'montant_ht',
                label:
                  'Montant HT',
              },
              {
                value:
                  'montant_ttc',
                label:
                  'Montant TTC',
              },
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={!!editCommission}
        onClose={() => {
          if (!editSaving) setEditCommission(null)
        }}
        title="Modifier les montants de commission"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditCommission(null)} disabled={editSaving}>
              Annuler
            </Button>
            <Button variant="primary" onClick={saveCommissionEdit} disabled={editSaving}>
              {editSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{editCommission?.libelle || 'Commission'}</p>
        <div style={{ marginTop: 16 }}>
          <FloatInput
            label="Commission commerciale (€)"
            type="number"
            min="0"
            step="0.01"
            value={editAmounts.montant_commercial}
            onChange={v => setEditAmounts(current => ({ ...current, montant_commercial: v }))}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <FloatInput
            label="Commission Reno Soluces (€)"
            type="number"
            min="0"
            step="0.01"
            value={editAmounts.montant_societe}
            onChange={v => setEditAmounts(current => ({ ...current, montant_societe: v }))}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <FloatInput
            label="Motif obligatoire"
            value={editReason}
            onChange={setEditReason}
            placeholder="Ex. : correction pour 2 monosplits"
          />
        </div>
        <p className="text-sm text-muted" style={{ marginTop: 12 }}>
          Les paiements déjà enregistrés sont conservés. La correction est refusée si le montant déjà payé dépasse le nouveau total.
        </p>
      </Modal>

      <Modal
        open={
          paymentModal
        }
        onClose={() =>
          setPaymentModal(
            false,
          )
        }
        title={`Paiement — ${
          paymentTarget ===
          'commercial'
            ? 'Commercial'
            : 'Reno Soluces'
        }`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                setPaymentModal(
                  false,
                )
              }
            >
              Annuler
            </Button>

            <Button
              variant="primary"
              onClick={
                savePayment
              }
              disabled={
                paymentSaving ||
                !paymentDate
              }
            >
              {paymentSaving
                ? 'Enregistrement…'
                : 'Enregistrer le paiement'}
            </Button>
          </>
        }
      >
        <div
          style={{
            marginBottom: 18,
          }}
        >
          <strong>
            {paymentCommission
              ?.libelle ||
              'Commission'}
          </strong>

          <div
            className="text-sm text-muted"
            style={{
              marginTop: 5,
            }}
          >
            {paymentTarget ===
            'commercial'
              ? `Commission commerciale : ${euro(
                  amount(
                    paymentCommission?.montant_commercial,
                  ),
                )}`
              : `Commission potentielle Reno Soluces : ${euro(
                  amount(
                    paymentCommission?.montant_societe,
                  ),
                )}`}
          </div>
        </div>

        <FloatInput
          label="Date de paiement"
          type="date"
          value={
            paymentDate
          }
          onChange={
            setPaymentDate
          }
        />
      </Modal>
      <Modal open={echeanceModal} onClose={() => setEcheanceModal(false)} title={`Échéancier — ${echeanceTarget === 'societe' ? 'Reno Soluces' : 'commercial'}`}>
        <div className="card-pad">
          <div className="text-sm text-muted" style={{marginBottom:14}}>Total prévu : <strong>{euro(echeanceExpected)}</strong> · Échéances : <strong>{euro(echeanceTotal)}</strong> · Payé : <strong>{euro(echeancePaid)}</strong> · Reste : <strong>{euro(Math.max(0,echeanceExpected-echeancePaid))}</strong></div>
          <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr auto',gap:8,alignItems:'end'}}>
            <FloatInput label="Libellé" value={echeanceForm.libelle} onChange={v=>setEcheanceForm(f=>({...f,libelle:v}))}/>
            <FloatInput label="Montant" value={echeanceForm.montant} onChange={v=>setEcheanceForm(f=>({...f,montant:v}))}/>
            <FloatInput label="Date prévue" type="date" value={echeanceForm.date_prevue} onChange={v=>setEcheanceForm(f=>({...f,date_prevue:v}))}/>
            <Button variant="primary" onClick={addEcheance} disabled={echeanceSaving}><Plus size={15}/> Ajouter</Button>
          </div>
          <div style={{marginTop:16}}>{echeances.length===0 ? <div className="text-sm text-muted">Aucune échéance définie.</div> : echeances.map(e=><div key={e.id} style={{display:'grid',gridTemplateColumns:'1.5fr 110px 130px 120px auto',gap:10,alignItems:'center',padding:'10px 0',borderTop:'1px solid #edf1ef'}}><div><strong>{e.libelle}</strong>{e.date_prevue&&<div className="text-sm text-muted">Prévue le {formatDate(e.date_prevue)}</div>}</div><strong>{euro(amount(e.montant))}</strong><span className={`badge ${e.date_paiement?'badge-success':'badge-warning'}`}>{e.date_paiement?`Payé le ${formatDate(e.date_paiement)}`:'À payer'}</span><Button size="sm" variant={e.date_paiement?'ghost':'secondary'} onClick={()=>toggleEcheancePaid(e)}>{e.date_paiement?'Annuler paiement':'Marquer payé'}</Button><Button size="sm" variant="ghost" onClick={()=>deleteEcheance(e)}>Supprimer</Button></div>)}</div>
        </div>
      </Modal>
    </div>
  )
}