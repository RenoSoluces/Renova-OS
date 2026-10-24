import { useEffect, useRef, useState } from 'react'
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
import { jsPDF } from 'jspdf'
import { logAuditEvent } from '../lib/auditLog'
import { setProspectStatus } from '../lib/crm/workflow'
import { numeroDevis } from '../lib/devis/numeroDevis'

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
  const isAdmin =
    profile?.role === 'admin' || profile?.role === 'manager'

  const [rows, setRows] = useState<DossierAvecRelations[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)

  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newProspectId, setNewProspectId] = useState('')
  const [devisDuProspect, setDevisDuProspect] = useState<Devis[]>([])
  const [newDevisId, setNewDevisId] = useState('')
  const [creating, setCreating] = useState(false)

  const [detail, setDetail] = useState<DossierAvecRelations | null>(null)
  const [pieces, setPieces] = useState<DocumentPiece[]>([])
  const [detailStatut, setDetailStatut] = useState('')
  const [detailDateInstallation, setDetailDateInstallation] = useState('')
  const [savingStatut, setSavingStatut] = useState(false)
  const [detailMessage, setDetailMessage] = useState('')
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([])
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

  const [commissionsParDevis, setCommissionsParDevis] = useState<
    Record<string, { montant_commercial: number; montant_societe: number }>
  >({})

  function fetchListe() {
    setLoading(true)

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

    // La commission d'un dossier est celle générée automatiquement (barème)
    // au moment de la signature du devis qui lui est associé.
    supabase
      .from('commissions_safe')
      .select('reference_id, montant_commercial, montant_societe')
      .eq('reference_type', 'devis')
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur chargement commissions des dossiers:', error)
          return
        }

        const map: Record<string, { montant_commercial: number; montant_societe: number }> = {}

        for (const c of data || []) {
          if (!c.reference_id) continue
          map[c.reference_id] = {
            montant_commercial: Number(c.montant_commercial) || 0,
            montant_societe: Number(c.montant_societe) || 0,
          }
        }

        setCommissionsParDevis(map)
      })
  }

  useEffect(() => {
    fetchListe()
    supabase.from('organisations').select('id, nom, type').eq('actif', true).order('nom')
      .then(({ data }) => setOrganisations((data || []) as OrganisationOption[]))

    supabase
      .from('prospects')
      .select('*')
      .order('nom')
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

    const [{ data }, { data: factures }] = await Promise.all([
      supabase.from('documents').select('*').eq('dossier_id', d.id).order('created_at'),
      supabase.from('dossier_facturation').select('*').eq('dossier_id', d.id).order('ordre').order('created_at'),
    ])

    setPieces(await resolveDocumentRows((data || []) as DocumentPiece[]))
    setFacturation((factures || []) as DossierFacturation[])
    const commission = d.devis_id ? commissionsParDevis[d.devis_id] : undefined
    const totalFactureNonAnnulee = (factures || []).filter((f: any) => f.statut !== 'annulee').reduce((sum: number, f: any) => sum + Number(f.montant_ht || 0), 0)
    const restant = Math.max(0, Number(commission?.montant_societe || 0) - totalFactureNonAnnulee)
    setFactureForm({
      libelle: totalFactureNonAnnulee > 0 ? 'Solde partenaire' : 'Prestation partenaire',
      montant_ht: restant > 0 ? String(restant) : '',
      taux_tva: '20',
      declencheur: totalFactureNonAnnulee > 0 ? 'mpr' : 'installation',
    })
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
        throw new Error('La fiche légale du destinataire est indisponible pour votre compte. Demandez au Grand Admin de vérifier les informations de facturation.')
      }
      const destinataireFacture = destinataireEntreprise ? {
        nom: destinataireEntreprise.raison_sociale,
        contact: destinataireEntreprise.forme_juridique,
        adresse: destinataireEntreprise.adresse,
        code_postal: destinataireEntreprise.code_postal,
        ville: destinataireEntreprise.ville,
        siret: destinataireEntreprise.siret,
        numero_tva: destinataireEntreprise.numero_tva,
        email: destinataireEntreprise.email,
      } : partenaire

      const ht = Number(ligne.montant_ht) || 0
      const taux = Number(ligne.taux_tva) || 0
      const tva = ht * taux / 100
      const ttc = ht + tva
      const doc = new jsPDF()
      const euroPdf = (n:number) => `${n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €`

      try {
        if (entreprise?.logo_url) {
          const blob = await fetch(entreprise.logo_url).then(r=>r.blob())
          const dataUrl = await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(blob)})
          doc.addImage(dataUrl, 'PNG', 18, 14, 28, 18)
        }
      } catch {}

      doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.text(entreprise?.raison_sociale || 'RENOVA OS', 52, 25)
      doc.setFont('helvetica','normal'); doc.setFontSize(9)
      let ey=32
      for (const line of [
        entreprise?.forme_juridique,
        entreprise?.adresse,
        [entreprise?.code_postal,entreprise?.ville].filter(Boolean).join(' '),
        entreprise?.telephone,
        entreprise?.email,
        entreprise?.siret ? `SIRET : ${entreprise.siret}` : '',
        entreprise?.numero_tva ? `TVA intracommunautaire : ${entreprise.numero_tva}` : '',
      ].filter(Boolean)) { doc.text(String(line),52,ey); ey+=5 }

      doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.text('FACTURE', 145, 24)
      doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text(`N° ${numeroFacture}`,145,32)
      doc.text(`Date d’émission : ${now.toLocaleDateString('fr-FR')}`,145,38)
      doc.text(`Date de prestation : ${(detail.date_installation || now.toISOString().slice(0,10))}`,145,44)

      doc.setDrawColor(210); doc.line(18,68,192,68)
      doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text('CLIENT / PARTENAIRE',18,78)
      doc.setFont('helvetica','normal'); doc.setFontSize(9)
      let py=86
      for (const line of [
        destinataireFacture?.nom || 'Destinataire non renseigné',
        destinataireFacture?.contact,
        destinataireFacture?.adresse,
        [destinataireFacture?.code_postal,destinataireFacture?.ville].filter(Boolean).join(' '),
        destinataireFacture?.siret ? `SIREN : ${String(destinataireFacture.siret).replace(/\s/g,'').slice(0,9)}` : '',
        destinataireFacture?.numero_tva ? `TVA intracommunautaire : ${destinataireFacture.numero_tva}` : '',
        destinataireFacture?.email,
      ].filter(Boolean)) { doc.text(String(line),18,py); py+=5 }

      doc.setFont('helvetica','bold'); doc.text('DÉTAIL DE LA PRESTATION',18,128)
      doc.setFont('helvetica','normal')
      doc.text('Désignation',18,137); doc.text('Qté',112,137); doc.text('PU HT',135,137); doc.text('TVA',165,137); doc.text('Total HT',182,137)
      doc.line(18,140,192,140)
      doc.text(ligne.libelle || 'Prestation partenaire',18,149)
      doc.text('1',114,149); doc.text(euroPdf(ht),133,149); doc.text(`${taux}%`,164,149); doc.text(euroPdf(ht),178,149)

      doc.line(18,158,192,158)
      doc.setFont('helvetica','bold'); doc.text('Total HT',130,168); doc.text(euroPdf(ht),178,168)
      doc.text('TVA',130,176); doc.text(euroPdf(tva),178,176)
      doc.setFontSize(12); doc.text('TOTAL TTC',130,186); doc.text(euroPdf(ttc),178,186)

      doc.setFont('helvetica','normal'); doc.setFontSize(8)
      let fy=200
      const due = ligne.date_echeance ? new Date(ligne.date_echeance).toLocaleDateString('fr-FR') : 'selon conditions contractuelles'
      for (const line of [
        `Échéance de paiement : ${due}`,
        `Conditions : ${ligne.conditions_paiement || entreprise?.conditions_paiement_defaut || 'Selon conditions contractuelles.'}`,
        `Escompte pour paiement anticipé : ${entreprise?.escompte_defaut || 'Néant'}`,
        `Pénalités de retard : ${entreprise?.taux_penalite_retard || '3 fois le taux d’intérêt légal'}`,
        'Indemnité forfaitaire pour frais de recouvrement : 40 €.',
        `Nature de l’opération : ${ligne.categorie_operation || 'prestation de services'}.`,
      ]) { const lines=doc.splitTextToSize(line,174); doc.text(lines,18,fy); fy+=Math.max(5,lines.length*4.5) }

      if (entreprise?.iban || entreprise?.bic) {
        doc.setFont('helvetica','bold'); doc.text('COORDONNÉES BANCAIRES',18,252)
        doc.setFont('helvetica','normal')
        doc.text(`Banque : ${entreprise?.banque || '—'}`,18,260)
        doc.text(`IBAN : ${entreprise?.iban || '—'}`,18,266)
        doc.text(`BIC : ${entreprise?.bic || '—'}`,18,272)
      }
      doc.setFontSize(7); doc.text('Document généré par RENOVA OS — à conserver comme pièce comptable.',18,286)
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
          emetteur_nom_affichage: entreprise?.raison_sociale || 'Reno Soluces',
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

  const montantTotal = rows.reduce(
    (sum, d) =>
      sum +
      (
        Number(
          d.montant_total ??
          (d as any).ca_potentiel
        ) || 0
      ),
    0
  )

  const euro = (
    n: number | null | undefined
  ) =>
    n != null
      ? new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
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
      value: euro(montantTotal),
      label: 'Montant total',
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
        {kpis.slice(0,4).map((k,idx) => <div className="dashboard-kpi" key={k.label}><span className={`dashboard-kpi-icon ${idx===0?'blue':idx===1?'amber':idx===2?'green':'purple'}`}>{k.icon}</span><span className="dashboard-kpi-main"><strong>{k.value}</strong><span>{k.label}</span></span><span className="dashboard-kpi-note">Pilotage</span></div>)}
      </section>

      <div className="card">
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
                  <th>CA (devis TTC)</th>
                  {isAdmin && <th>Commission société</th>}
                  <th>Commission commerciale</th>
                </tr>
              </thead>

              <tbody>
                {rows.map(d => {
                  const commission = d.devis_id
                    ? commissionsParDevis[d.devis_id]
                    : undefined

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
                      </td>

                      <td>
                        {euro(d.montant_total)}
                      </td>

                      {isAdmin && (
                        <td>
                          <strong>
                            {commission
                              ? euro(commission.montant_societe)
                              : '—'}
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

            {/* CLIENT */}

            <div>
              <div className="text-sm text-muted">
                Client
              </div>

              <div className="font-semibold">
                {detail.prospect
                  ? `${detail.prospect.prenom} ${detail.prospect.nom}`
                  : '—'}
              </div>
            </div>

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
                  Montant total
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
                    CA (devis TTC)
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
                      {detail.devis_id && commissionsParDevis[detail.devis_id]
                        ? euro(commissionsParDevis[detail.devis_id].montant_societe)
                        : '—'}
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
                    {detail.devis_id && commissionsParDevis[detail.devis_id]
                      ? euro(commissionsParDevis[detail.devis_id].montant_commercial)
                      : '—'}
                  </div>
                </div>
              </div>

              {(!detail.devis_id || !commissionsParDevis[detail.devis_id]) && (
                <div
                  className="text-sm text-muted"
                  style={{ marginTop: 12 }}
                >
                  {detail.devis_id
                    ? "Pas encore de règle de rémunération applicable dans le barème pour ce devis — la commission s'affichera ici une fois la règle créée."
                    : "Ce dossier n'est rattaché à aucun devis signé."}
                </div>
              )}
            </div>

            <div className="card card-pad" style={{ marginBottom: 14 }}>
              <div className="font-semibold" style={{ marginBottom: 4 }}>Facturation du dossier</div>
              <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
                Choisissez séparément l’entreprise qui émet la facture et l’entreprise destinataire. Les coordonnées légales doivent être renseignées dans les paramètres de chaque entreprise.
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
                <div className="text-sm text-muted">Chaque échéance peut donner lieu à une facture distincte : installation, paiement MaPrimeRénov’ ou autre jalon. Commission société du dossier : <strong>{detail.devis_id && commissionsParDevis[detail.devis_id] ? euro(commissionsParDevis[detail.devis_id].montant_societe) : '—'}</strong>.</div>
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