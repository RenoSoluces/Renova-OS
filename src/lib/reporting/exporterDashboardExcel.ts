import * as XLSX from 'xlsx'
import type { Prospect, Visite, Devis } from '../../types'
import { stageOf } from '../crm/constants'

interface DonneesExportDashboard {
  prospects: Prospect[]
  visites: Visite[]
  devis: Devis[]
  periodeLabel: string
}

/**
 * Export Excel du dashboard : un classeur avec un onglet de synthèse et un onglet
 * détaillé par entité (prospects, visites, devis), exploitable directement pour du
 * reporting externe (comptabilité, direction, analyse hebdomadaire).
 */
export function exporterDashboardExcel(donnees: DonneesExportDashboard) {
  const { prospects, visites, devis, periodeLabel } = donnees
  const classeur = XLSX.utils.book_new()

  // ---- Onglet Synthèse ----
  const visiteTerminees = visites.filter(v => v.statut === 'terminee').length
  const devisEnvoyes = devis.filter(d => d.statut !== 'brouillon').length
  const devisSignes = devis.filter(d => d.statut === 'signe').length
  const caSigne = devis.filter(d => d.statut === 'signe').reduce((s, d) => s + (Number((d as any).montant_ttc) || 0), 0)
  const pipelineValue = prospects
    .filter(p => stageOf(p.statut).value !== 'Signé')
    .reduce((s, p) => s + (Number(p.montant_potentiel) || 0), 0)

  const synthese = [
    ['Renova-OS — Export du reporting commercial'],
    [`Généré le ${new Date().toLocaleDateString('fr-FR')} — ${periodeLabel}`],
    [],
    ['Indicateur', 'Valeur'],
    ['Prospects actifs', prospects.length],
    ['Visites techniques', visites.length],
    ['Visites terminées', visiteTerminees],
    ['Devis envoyés', devisEnvoyes],
    ['Devis signés', devisSignes],
    ["Taux de transformation visite -> devis", visiteTerminees > 0 ? `${Math.round((devisEnvoyes / visiteTerminees) * 100)}%` : '-'],
    ["Taux de transformation devis -> signature", devisEnvoyes > 0 ? `${Math.round((devisSignes / devisEnvoyes) * 100)}%` : '-'],
    ["Chiffre d'affaires signe", caSigne],
    ['CA en pipeline (hors signes)', pipelineValue],
  ]
  const feuilleSynthese = XLSX.utils.aoa_to_sheet(synthese)
  feuilleSynthese['!cols'] = [{ wch: 40 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(classeur, feuilleSynthese, 'Synthese')

  // ---- Onglet Prospects ----
  const lignesProspects = prospects.map(p => ({
    Nom: `${p.prenom || ''} ${p.nom || ''}`.trim(),
    Statut: stageOf(p.statut).label,
    Commercial: (p as any).commercial || '',
    Ville: p.ville || '',
    'Montant potentiel (EUR)': p.montant_potentiel || 0,
    Telephone: p.telephone || '',
    Email: p.email || '',
    'Date de creation': p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '',
  }))
  const feuilleProspects = XLSX.utils.json_to_sheet(lignesProspects)
  feuilleProspects['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(classeur, feuilleProspects, 'Prospects')

  // ---- Onglet Visites ----
  const lignesVisites = visites.map(v => ({
    Client: (v as any).prospect ? `${(v as any).prospect.prenom || ''} ${(v as any).prospect.nom || ''}`.trim() : '',
    'Type de visite': v.type_visite === 'produit' ? `Ciblee - ${v.produit_cible || ''}` : 'Complete',
    Statut: v.statut,
    Date: v.date_visite ? new Date(v.date_visite).toLocaleDateString('fr-FR') : '',
  }))
  const feuilleVisites = XLSX.utils.json_to_sheet(lignesVisites)
  feuilleVisites['!cols'] = [{ wch: 22 }, { wch: 24 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(classeur, feuilleVisites, 'Visites')

  // ---- Onglet Devis ----
  const lignesDevis = devis.map(d => ({
    Numero: (d as any).numero || '',
    Statut: d.statut,
    'Montant TTC (EUR)': (d as any).montant_ttc || 0,
    'Date de creation': (d as any).created_at ? new Date((d as any).created_at).toLocaleDateString('fr-FR') : '',
  }))
  const feuilleDevis = XLSX.utils.json_to_sheet(lignesDevis)
  feuilleDevis['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(classeur, feuilleDevis, 'Devis')

  XLSX.writeFile(classeur, `renova-os-reporting-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
