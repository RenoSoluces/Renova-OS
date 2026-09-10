import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Prospect, Visite, Devis, Entreprise } from '../../types'
import { stageOf, PIPELINE_STAGES } from '../crm/constants'

interface DonneesExportDashboard {
  prospects: Prospect[]
  visites: Visite[]
  devis: Devis[]
  entreprise: Entreprise | null
  periodeLabel: string
}

const nombre = (n: number | null | undefined): string => {
  const valeur = n || 0
  return Math.round(valeur).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function exporterDashboardPDF(donnees: DonneesExportDashboard) {
  const { prospects, visites, devis, entreprise, periodeLabel } = donnees
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marge = 15
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(20)
  doc.text('Reporting commercial', marge, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(100)
  y += 6
  doc.text(`${entreprise?.raison_sociale || ''} - Genere le ${new Date().toLocaleDateString('fr-FR')} - ${periodeLabel}`, marge, y)
  y += 12

  const visiteTerminees = visites.filter(v => v.statut === 'terminee').length
  const devisEnvoyes = devis.filter(d => d.statut !== 'brouillon').length
  const devisSignes = devis.filter(d => d.statut === 'signe').length
  const caSigne = devis.filter(d => d.statut === 'signe').reduce((s, d) => s + (Number((d as any).montant_ttc) || 0), 0)
  const pipelineValue = prospects
    .filter(p => stageOf(p.statut).value !== 'Signé')
    .reduce((s, p) => s + (Number(p.montant_potentiel) || 0), 0)

  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Prospects actifs', String(prospects.length)],
      ['Visites techniques realisees', `${visiteTerminees} / ${visites.length}`],
      ['Devis envoyes', String(devisEnvoyes)],
      ['Devis signes', String(devisSignes)],
      ['Taux visite -> devis', visiteTerminees > 0 ? `${Math.round((devisEnvoyes / visiteTerminees) * 100)}%` : '-'],
      ['Taux devis -> signature', devisEnvoyes > 0 ? `${Math.round((devisSignes / devisEnvoyes) * 100)}%` : '-'],
      ["Chiffre d'affaires signe", `${nombre(caSigne)} EUR`],
      ['CA en pipeline (hors signes)', `${nombre(pipelineValue)} EUR`],
    ],
    margin: { left: marge, right: marge },
    styles: { fontSize: 9.5, cellPadding: 3 },
    headStyles: { fillColor: [40, 80, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
  })
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(20)
  doc.text('Repartition du pipeline', marge, y)
  y += 4

  const repartition = PIPELINE_STAGES.map(stage => ({
    label: stage.label,
    count: prospects.filter(p => stageOf(p.statut).value === stage.value).length,
  }))
  autoTable(doc, {
    startY: y,
    head: [['Etape', 'Nombre de prospects']],
    body: repartition.map(r => [r.label, String(r.count)]),
    margin: { left: marge, right: marge },
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [40, 80, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
  })
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 10

  if (devis.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(20)
    doc.text('Devis (les plus recents)', marge, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Numero', 'Statut', 'Montant TTC', 'Date']],
      body: devis.slice(0, 20).map(d => [
        (d as any).numero || '-',
        d.statut,
        `${nombre((d as any).montant_ttc)} EUR`,
        (d as any).created_at ? new Date((d as any).created_at).toLocaleDateString('fr-FR') : '-',
      ]),
      margin: { left: marge, right: marge },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [40, 80, 60], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 2: { halign: 'right' } },
    })
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(150)
    doc.text(`Reporting commercial - Page ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
  }

  doc.save(`renova-os-reporting-${new Date().toISOString().slice(0, 10)}.pdf`)
}
