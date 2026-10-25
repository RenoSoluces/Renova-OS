import jsPDF from 'jspdf'
import type { Entreprise, Prospect } from '../../types'
import { MOIS, ORIENTATIONS, TARIF_RACHAT_SURPLUS, type EntreeSolaire, type ResultatSolaire } from '../photovoltaique/simulateurSolaire'

// Voir genererDevisPDF.ts : on formate les nombres à la main (l'espace fine insécable de
// Intl.NumberFormat('fr-FR') n'existe pas dans la police standard de jsPDF).
const nombre = (n: number, decimales = 0): string => {
  const [entier, dec] = Math.abs(n).toFixed(decimales).split('.')
  const signe = n < 0 ? '-' : ''
  const e = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return signe + (dec ? `${e},${dec}` : e)
}
const euros = (n: number) => `${nombre(n)} EUR`

const VERT: [number, number, number] = [27, 67, 50]
const VERT_CLAIR: [number, number, number] = [45, 106, 79]
const OR: [number, number, number] = [232, 176, 74]
const GRIS: [number, number, number] = [110, 110, 110]
const FOND: [number, number, number] = [240, 244, 242]

export function genererSimulationSolairePDF(r: ResultatSolaire, e: EntreeSolaire, prospect: Prospect | null, entreprise: Entreprise | null, logoDataUrl?: string | null): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const L = doc.internal.pageSize.getWidth()
  const M = 15
  const orient = ORIENTATIONS.find(o => o.value === e.orientation)?.label ?? ''

  // ---- En-tête
  doc.setFillColor(...VERT); doc.rect(0, 0, L, 38, 'F')
  // Le logo (texte sombre sur fond transparent) est posé sur une pastille blanche.
  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255); doc.roundedRect(L - M - 30, 4.5, 30, 29, 4, 4, 'F')
    try { doc.addImage(logoDataUrl, 'PNG', L - M - 28, 6, 26, 26, undefined, 'FAST') } catch { /* logo illisible : on l'omet */ }
  } else {
    doc.setFillColor(...OR); doc.circle(L - 26, 19, 7, 'F')
  }
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
  doc.text('Votre simulation solaire', M, 19)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5)
  doc.text(entreprise?.raison_sociale || '', M, 28)
  doc.setFontSize(9)
  doc.text(`Établie le ${new Date().toLocaleDateString('fr-FR')}`, M, 33.5)

  let y = 48
  doc.setTextColor(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text(prospect ? `${prospect.prenom} ${prospect.nom}` : 'Simulation', M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS)
  const adresse = prospect ? [prospect.adresse, `${prospect.code_postal || e.codePostal} ${prospect.ville || ''}`].filter(Boolean).join(' - ') : e.codePostal
  if (adresse) { y += 5.5; doc.text(adresse, M, y) }

  // ---- Chiffres clés
  y += 10
  const kpis: [string, string, string][] = [
    ['Production par an', `${nombre(r.productionAnnuelle)} kWh`, `${r.nombrePanneaux} panneaux - ${nombre(r.puissanceKwc, 1)} kWc`],
    ['Économies par an', euros(r.gainAnnuel), `dont ${euros(r.economieAutoconsommation)} d'électricité non achetée`],
    ['Rentable en', r.delaiRetourAnnees != null ? `${nombre(r.delaiRetourAnnees, 1)} ans` : '-', `investissement ${euros(r.investissement)}`],
    ['Gain net sur 20 ans', euros(r.gain20Ans - r.investissement), `prix du kWh +${nombre(e.inflationKwhPct, 1)} %/an`],
  ]
  const w = (L - 2 * M - 9) / 4
  kpis.forEach(([titre, val, sous], i) => {
    const x = M + i * (w + 3)
    doc.setFillColor(...(i === 1 ? VERT : FOND)); doc.roundedRect(x, y, w, 30, 3, 3, 'F')
    doc.setTextColor(...(i === 1 ? ([216, 243, 220] as [number, number, number]) : GRIS)); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text(titre, x + 3, y + 7)
    doc.setTextColor(...(i === 1 ? ([255, 255, 255] as [number, number, number]) : VERT)); doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5)
    doc.text(val, x + 3, y + 16)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...(i === 1 ? ([216, 243, 220] as [number, number, number]) : GRIS))
    doc.text(doc.splitTextToSize(sous, w - 6), x + 3, y + 22)
  })
  y += 40

  // ---- Formule
  doc.setTextColor(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text('Comment est calculée la production ?', M, y)
  y += 6
  doc.setFillColor(...FOND); doc.roundedRect(M, y, L - 2 * M, 24, 3, 3, 'F')
  const blocs: [string, string][] = [
    ['Puissance', `${nombre(r.puissanceKwc, 1)} kWc`], ['Coef. orientation', nombre(r.coefficientOrientation, 2)],
    ['Heures d\'ensoleillement', `${nombre(r.heuresEnsoleillement)} h/an`], ['Production', `${nombre(r.productionAnnuelle)} kWh`],
  ]
  const bw = (L - 2 * M) / 4
  blocs.forEach(([t, v], i) => {
    const cx = M + bw * i + bw / 2
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS); doc.text(t, cx, y + 8, { align: 'center' })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...(i === 3 ? VERT_CLAIR : ([30, 30, 30] as [number, number, number])))
    doc.text(v, cx, y + 16, { align: 'center' })
    if (i < 3) { doc.setTextColor(...GRIS); doc.text(i === 2 ? '=' : 'x', M + bw * (i + 1), y + 15, { align: 'center' }) }
  })
  y += 28
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS)
  doc.text(`Formule ADEME : puissance x coefficient d'orientation x heures d'ensoleillement. Toit orienté ${orient.toLowerCase()}, inclinaison ${e.inclinaisonDeg ?? 30} degrés${r.coefficientMasques < 1 ? `, masques solaires (x ${nombre(r.coefficientMasques, 2)})` : ''}.`, M, y, { maxWidth: L - 2 * M })

  // ---- Graphique mensuel
  y += 12
  doc.setTextColor(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text('Production mois par mois (kWh)', M, y)
  const gx = M + 10, gy = y + 6, gw = L - 2 * M - 12, gh = 62
  const max = Math.max(...r.productionMensuelle, ...(r.consommationMensuelle ?? [0]), 1)
  const pas = max > 1000 ? 200 : max > 400 ? 100 : 50
  const echelle = Math.ceil(max / pas) * pas
  doc.setDrawColor(225, 225, 220); doc.setLineWidth(0.2); doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS)
  for (let i = 0; i <= 4; i++) {
    const yy = gy + gh - (gh * i) / 4
    doc.line(gx, yy, gx + gw, yy)
    doc.text(nombre((echelle * i) / 4), gx - 2, yy + 1, { align: 'right' })
  }
  const bl = gw / 12
  r.productionMensuelle.forEach((v, i) => {
    const hTot = (v / echelle) * gh, hAuto = hTot * r.tauxAutoconsommation
    const x = gx + bl * i + bl * 0.18, bw2 = bl * 0.64
    doc.setFillColor(...OR); doc.rect(x, gy + gh - hTot, bw2, hTot - hAuto, 'F')
    doc.setFillColor(...VERT_CLAIR); doc.rect(x, gy + gh - hAuto, bw2, hAuto, 'F')
    doc.setTextColor(...GRIS); doc.text(MOIS[i], x + bw2 / 2, gy + gh + 4.5, { align: 'center' })
  })
  if (r.consommationMensuelle) {
    doc.setDrawColor(30, 30, 30); doc.setLineWidth(0.5); doc.setLineDashPattern([1.2, 1], 0)
    r.consommationMensuelle.forEach((v, i) => {
      if (i === 0) return
      const x1 = gx + bl * (i - 1) + bl / 2, x2 = gx + bl * i + bl / 2
      doc.line(x1, gy + gh - (r.consommationMensuelle![i - 1] / echelle) * gh, x2, gy + gh - (v / echelle) * gh)
    })
    doc.setLineDashPattern([], 0)
  }
  const ly = gy + gh + 11
  doc.setFillColor(...VERT_CLAIR); doc.rect(gx, ly - 2.5, 3, 3, 'F'); doc.setTextColor(...GRIS); doc.text('Autoconsommé', gx + 5, ly)
  doc.setFillColor(...OR); doc.rect(gx + 32, ly - 2.5, 3, 3, 'F'); doc.text('Revendu', gx + 37, ly)
  if (r.consommationMensuelle) { doc.setDrawColor(30); doc.line(gx + 58, ly - 1, gx + 64, ly - 1); doc.text('Consommation du foyer', gx + 66, ly) }

  // ---- Page 2
  doc.addPage()
  y = 20
  if (logoDataUrl) { try { doc.addImage(logoDataUrl, 'PNG', L - M - 16, 8, 16, 16, undefined, 'FAST') } catch { /* ignoré */ } }
  doc.setTextColor(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text('Gain cumulé sur 20 ans, installation déduite', M, y)
  const cx0 = M + 16, cy0 = y + 8, cw = L - 2 * M - 18, ch = 70
  const pts = [{ a: 0, v: -r.investissement }, ...r.trajectoire.map(p => ({ a: p.annee, v: p.cumul }))]
  const vmin = Math.min(...pts.map(p => p.v)), vmax = Math.max(...pts.map(p => p.v), 0)
  const marge = (vmax - vmin) * 0.08 || 1
  const lo = vmin - marge, hi = vmax + marge
  const px = (a: number) => cx0 + (a / 20) * cw
  const py = (v: number) => cy0 + (1 - (v - lo) / (hi - lo)) * ch
  doc.setDrawColor(225, 225, 220); doc.setLineWidth(0.2)
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS)
  ;[lo + marge, 0, hi - marge].forEach(v => {
    const vv = Math.round(v / 1000) * 1000
    doc.line(cx0, py(vv), cx0 + cw, py(vv)); doc.text(`${nombre(vv)} EUR`, cx0 - 2, py(vv) + 1, { align: 'right' })
  })
  doc.setDrawColor(...GRIS); doc.setLineWidth(0.4); doc.line(cx0, py(0), cx0 + cw, py(0))
  doc.setDrawColor(...VERT_CLAIR); doc.setLineWidth(1)
  for (let i = 1; i < pts.length; i++) doc.line(px(pts[i - 1].a), py(pts[i - 1].v), px(pts[i].a), py(pts[i].v))
  ;[0, 5, 10, 15, 20].forEach(a => { doc.setTextColor(...GRIS); doc.text(a === 0 ? 'Achat' : `An ${a}`, px(a), cy0 + ch + 5, { align: 'center' }) })
  if (r.delaiRetourAnnees != null && r.delaiRetourAnnees <= 20) {
    doc.setFillColor(...VERT_CLAIR); doc.circle(px(r.delaiRetourAnnees), py(0), 1.8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...VERT_CLAIR)
    doc.text(`Rentable en ${nombre(r.delaiRetourAnnees, 1)} ans`, Math.min(px(r.delaiRetourAnnees), L - M - 28), py(0) - 5, { align: 'left' })
  }
  y = cy0 + ch + 16

  doc.setTextColor(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Hypothèses retenues', M, y)
  y += 5
  const lignes: [string, string][] = [
    ['Prix du kWh payé aujourd\'hui', `${nombre(e.prixKwh ?? 0, 3)} EUR TTC`],
    ['Évolution du prix du kWh', `+ ${nombre(e.inflationKwhPct, 1)} % par an`],
    ['Rachat du surplus injecté', `${nombre(TARIF_RACHAT_SURPLUS, 2)} EUR / kWh`],
    ['Prime à l\'autoconsommation', 'Aucune'],
    ['Consommation annuelle du foyer', r.consommationAnnuelle ? `${nombre(r.consommationAnnuelle)} kWh` : 'Non renseignée'],
    ['Part de la production autoconsommée', `${nombre(r.tauxAutoconsommation * 100)} %${e.batterie ? ' (avec batterie)' : ''}`],
    ['Vieillissement des panneaux', `- ${nombre(e.degradationPanneauxPct, 1)} % par an`],
    ['Prix de l\'installation', `${euros(r.investissement)}${r.investissementEstime ? ' (estimation)' : ''}`],
  ]
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  lignes.forEach(([k, v], i) => {
    const yy = y + i * 7.5
    if (i % 2 === 0) { doc.setFillColor(...FOND); doc.rect(M, yy - 4.5, L - 2 * M, 7.5, 'F') }
    doc.setTextColor(...GRIS); doc.text(k, M + 3, yy); doc.setTextColor(30); doc.setFont('helvetica', 'bold'); doc.text(v, L - M - 3, yy, { align: 'right' }); doc.setFont('helvetica', 'normal')
  })
  y += lignes.length * 7.5 + 8
  doc.setFontSize(8); doc.setTextColor(...GRIS)
  doc.text(doc.splitTextToSize('Estimation commerciale établie à partir de valeurs moyennes (ensoleillement, orientation, profil de consommation). Elle ne constitue pas un engagement de production : la production réelle dépend de la météo, de l\'ombrage et de l\'installation. Les économies dépendent de l\'évolution du prix de l\'électricité. Le montant définitif figure sur le devis.', L - 2 * M), M, y)

  if (entreprise) {
    doc.setFontSize(8); doc.setTextColor(...GRIS)
    const pied = [entreprise.raison_sociale, entreprise.telephone, entreprise.email].filter(Boolean).join('  -  ')
    doc.text(pied, L / 2, 287, { align: 'center' })
  }
  return doc
}
