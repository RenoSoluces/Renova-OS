import jsPDF from 'jspdf'

type RGB = readonly [number, number, number]
const C = {
  ink: [24, 34, 29] as RGB, vert: [15, 92, 94] as RGB, cuivre: [168, 98, 52] as RGB,
  fond: [243, 247, 246] as RGB, gris: [102, 116, 118] as RGB, trait: [214, 222, 222] as RGB, blanc: [255, 255, 255] as RGB,
}

/** Remplace les caractères que la police Helvetica de jsPDF ne sait pas dessiner (espaces fines, tirets longs…). */
const sur = (v: unknown) => String(v ?? '')
  .replace(/[     ]/g, ' ')
  .replace(/[‐-―−]/g, '-')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/…/g, '...')
  .replace(/·/g, '.')

/** 2 000,00 € — formaté à la main : toLocaleString produit des espaces insécables fines que le PDF affiche en « / ». */
export const montantPdf = (n: number): string => {
  const v = Number(n) || 0
  const [entier, dec] = Math.abs(v).toFixed(2).split('.')
  return `${v < 0 ? '-' : ''}${entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${dec} €`
}
const dateFr = (v?: Date | string | null): string => {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00` : v)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export interface PartiePdf {
  nom: string
  complement?: string | null // forme juridique, contact…
  adresse?: string | null
  code_postal?: string | null
  ville?: string | null
  siret?: string | null
  numero_tva?: string | null
  email?: string | null
  telephone?: string | null
}
export interface EmetteurPdf extends PartiePdf {
  capital_social?: string | number | null
  logo_url?: string | null
  banque?: string | null
  iban?: string | null
  bic?: string | null
  conditions_paiement_defaut?: string | null
  escompte_defaut?: string | null
  taux_penalite_retard?: string | null
}
export interface FacturePartenaireDonnees {
  numero: string
  dateEmission: Date
  datePrestation?: string | null
  dateEcheance?: string | null
  referenceDossier?: string | null
  emetteur: EmetteurPdf
  destinataire: PartiePdf
  designation: string
  montantHt: number
  tauxTva: number
  conditionsPaiement?: string | null
  natureOperation?: string | null
}

async function logoEnDataUrl(url?: string | null): Promise<string> {
  if (!url) return ''
  if (url.startsWith('data:image')) return url
  try {
    const blob = await fetch(url).then(r => r.blob())
    return await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(blob) })
  } catch { return '' }
}

export async function genererFacturePartenairePDF(d: FacturePartenaireDonnees): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), M = 18, R = PW - M
  const t = (c: RGB) => doc.setTextColor(c[0], c[1], c[2])
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2])
  const draw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2])
  const e = d.emetteur
  const ht = Number(d.montantHt) || 0
  const taux = Number(d.tauxTva) || 0
  const tva = Math.round(ht * taux) / 100
  const ttc = Math.round((ht + tva) * 100) / 100

  // ---- En-tête : identité de l'émetteur (gauche) et titre de la facture (droite)
  const logo = await logoEnDataUrl(e.logo_url)
  let xNom = M
  if (logo) { try { doc.addImage(logo, logo.includes('image/png') ? 'PNG' : 'JPEG', M, 14, 24, 24, undefined, 'FAST'); xNom = M + 29 } catch { /* logo illisible : on continue sans */ } }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); t(C.vert); doc.text(sur(e.nom), xNom, 21)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); t(C.gris)
  const capital = e.capital_social ? `au capital de ${sur(e.capital_social).replace(/\s*(EUR|€)\s*$/i, '')} €` : ''
  const ligneForme = [e.complement, capital].filter(Boolean).join(' ')
  const ligneAdresse = [e.adresse, [e.code_postal, e.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  let ye = 26.5
  for (const l of [ligneForme, ligneAdresse, [e.telephone, e.email].filter(Boolean).join('  -  '), e.siret ? `SIRET ${e.siret}` : '', e.numero_tva ? `TVA intracommunautaire ${e.numero_tva}` : '']) {
    if (l) { doc.text(sur(l), xNom, ye); ye += 4.4 }
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); t(C.ink); doc.text('FACTURE', R, 22, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); t(C.cuivre); doc.text(`N° ${sur(d.numero)}`, R, 29, { align: 'right' })

  const yTrait = Math.max(ye, 44) + 3
  draw(C.trait); doc.setLineWidth(0.3); doc.line(M, yTrait, R, yTrait)

  // ---- Destinataire (gauche) et dates (droite)
  let y = yTrait + 9
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); t(C.vert); doc.text('FACTURE À', M, y)
  doc.text('INFORMATIONS', 125, y)
  y += 5.5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); t(C.ink); doc.text(sur(d.destinataire.nom), M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); t(C.ink)
  let yd = y + 5.2
  const dest = d.destinataire
  for (const l of [dest.complement, dest.adresse, [dest.code_postal, dest.ville].filter(Boolean).join(' '), dest.siret ? `SIRET ${dest.siret}` : '', dest.numero_tva ? `TVA intracommunautaire ${dest.numero_tva}` : '', dest.email]) {
    if (l) { doc.text(sur(l), M, yd); yd += 4.6 }
  }
  const infos: [string, string][] = [
    ['Date d\'émission', dateFr(d.dateEmission)],
    ['Date de prestation', dateFr(d.datePrestation) || dateFr(d.dateEmission)],
    ['Échéance', dateFr(d.dateEcheance) || 'Selon conditions'],
  ]
  if (d.referenceDossier) infos.push(['Dossier', d.referenceDossier])
  let yi = y
  for (const [k, v] of infos) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); t(C.gris); doc.text(sur(k), 125, yi)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); t(C.ink); doc.text(sur(v), R, yi, { align: 'right' })
    yi += 5.6
  }

  // ---- Tableau des prestations
  y = Math.max(yd, yi) + 10
  fill(C.vert); doc.rect(M, y, R - M, 8, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); t(C.blanc)
  const xQte = 118, xPu = 144, xTva = 160, xTot = R - 2
  doc.text('DÉSIGNATION', M + 3, y + 5.3)
  doc.text('QTÉ', xQte, y + 5.3, { align: 'right' }); doc.text('PU HT', xPu, y + 5.3, { align: 'right' })
  doc.text('TVA', xTva, y + 5.3, { align: 'right' }); doc.text('TOTAL HT', xTot, y + 5.3, { align: 'right' })
  y += 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); t(C.ink)
  const lignesDesignation = doc.splitTextToSize(sur(d.designation || 'Prestation'), xQte - M - 20) as string[]
  const hauteur = Math.max(10, lignesDesignation.length * 4.8 + 5)
  doc.text(lignesDesignation, M + 3, y + 6.5)
  doc.text('1', xQte, y + 6.5, { align: 'right' }); doc.text(sur(montantPdf(ht)), xPu, y + 6.5, { align: 'right' })
  doc.text(`${taux.toLocaleString('fr-FR').replace(/\s/g, '')} %`, xTva, y + 6.5, { align: 'right' }); doc.text(sur(montantPdf(ht)), xTot, y + 6.5, { align: 'right' })
  y += hauteur
  draw(C.trait); doc.line(M, y, R, y)

  // ---- Totaux
  y += 8
  const ligneTotal = (label: string, valeur: string, fort = false) => {
    doc.setFont('helvetica', fort ? 'bold' : 'normal'); doc.setFontSize(fort ? 11 : 9.5); t(C.ink)
    doc.text(label, 130, y); doc.text(sur(valeur), R, y, { align: 'right' }); y += fort ? 0 : 6
  }
  ligneTotal('Total HT', montantPdf(ht))
  ligneTotal(`TVA ${taux.toLocaleString('fr-FR').replace(/\s/g, '')} %`, montantPdf(tva))
  fill(C.fond); doc.rect(126, y - 4.5, R - 126 + 2, 9, 'F')
  t(C.vert); ligneTotal('TOTAL TTC', montantPdf(ttc), true)
  y += 12

  // ---- Conditions de règlement
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); t(C.vert); doc.text('CONDITIONS DE RÈGLEMENT', M, y); y += 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); t(C.ink)
  const conditions = [
    `Échéance : ${dateFr(d.dateEcheance) || 'selon conditions contractuelles'}`,
    `Conditions de paiement : ${d.conditionsPaiement || e.conditions_paiement_defaut || 'paiement à 30 jours à compter de la date de facture'}`,
    `Escompte pour paiement anticipé : ${e.escompte_defaut || 'néant'}`,
    `Pénalités de retard : ${e.taux_penalite_retard || '3 fois le taux d\'intérêt légal'}`,
    'Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 €',
    `Nature de l\'opération : ${d.natureOperation || 'prestation de services'}`,
  ]
  for (const c of conditions) {
    const l = doc.splitTextToSize(sur(c), R - M) as string[]
    doc.text(l, M, y); y += l.length * 4.2 + 0.8
  }

  // ---- Coordonnées bancaires
  if (e.iban || e.bic || e.banque) {
    y += 5
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); t(C.vert); doc.text('COORDONNÉES BANCAIRES', M, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); t(C.ink)
    for (const l of [e.banque ? `Banque : ${e.banque}` : '', e.iban ? `IBAN : ${e.iban}` : '', e.bic ? `BIC : ${e.bic}` : '']) { if (l) { doc.text(sur(l), M, y); y += 4.6 } }
  }

  // ---- Pied de page légal
  const pied = [e.nom, e.complement, capital, e.siret ? `SIRET ${e.siret}` : '', e.numero_tva ? `TVA ${e.numero_tva}` : ''].filter(Boolean).join('  -  ')
  draw(C.trait); doc.line(M, PH - 16, R, PH - 16)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); t(C.gris)
  doc.text(sur(pied), PW / 2, PH - 11, { align: 'center', maxWidth: R - M })
  return doc
}
