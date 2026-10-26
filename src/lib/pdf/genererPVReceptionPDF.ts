import jsPDF from 'jspdf'

export interface DonneesPV {
  entreprise: string
  reference: string
  client: string
  adresse: string
  travaux: string[]
  dateReception: string
  avecReserves: boolean
  reserves: string
  delaiLevee: string
  nomClient: string
  nomInstallateur: string
  installateur: string
  signatureClient: string | null
  signatureInstallateur: string | null
}

const safe = (s: string) => s.replace(/·/g, '-').replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-').replace(/ | /g, ' ')

/** Procès-verbal de réception des travaux (article 1792-6 du Code civil), signé par le client et l'entreprise. */
export function genererPVReceptionPDF(d: DonneesPV): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const L = doc.internal.pageSize.getWidth(), M = 18, W = L - 2 * M
  let y = 18
  doc.setFillColor(27, 67, 50); doc.rect(0, 0, L, 3, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(18, 38, 31)
  doc.text('PROCÈS-VERBAL DE RÉCEPTION DES TRAVAUX', M, y + 4); y += 11
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(93, 113, 106)
  doc.text(safe(`${d.entreprise} · Dossier ${d.reference}`), M, y); y += 9

  const bloc = (titre: string, lignes: string[]) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(18, 38, 31); doc.text(safe(titre), M, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 52, 47)
    for (const l of lignes) { const t = doc.splitTextToSize(safe(l), W); doc.text(t, M, y); y += t.length * 5 }
    y += 3
  }
  bloc('Maître d’ouvrage (client)', [d.client, d.adresse].filter(Boolean))
  bloc('Entreprise', [d.entreprise, d.installateur ? `Pose réalisée par : ${d.installateur}` : ''].filter(Boolean))
  bloc('Travaux réceptionnés', d.travaux.length ? d.travaux.map(t => `• ${t}`) : ['Travaux prévus au devis signé.'])

  doc.setDrawColor(221, 230, 225); doc.setFillColor(243, 247, 245); doc.roundedRect(M, y, W, d.avecReserves ? 34 : 18, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(18, 38, 31)
  doc.text(safe(`Le maître d’ouvrage déclare, le ${new Date(`${d.dateReception}T12:00:00`).toLocaleDateString('fr-FR')}, prononcer la réception des travaux :`), M + 4, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.text(d.avecReserves ? '[ ] sans réserve     [X] avec les réserves suivantes :' : '[X] sans réserve     [ ] avec réserves', M + 4, y + 13)
  if (d.avecReserves) {
    const t = doc.splitTextToSize(safe(d.reserves || '—'), W - 8).slice(0, 3)
    doc.text(t, M + 4, y + 19)
    doc.text(safe(`Délai convenu pour la levée des réserves : ${d.delaiLevee || 'à convenir'}`), M + 4, y + 30)
  }
  y += (d.avecReserves ? 34 : 18) + 6

  doc.setFontSize(8.5); doc.setTextColor(93, 113, 106)
  const mention = doc.splitTextToSize(safe('La réception marque le point de départ des garanties légales : garantie de parfait achèvement (1 an), garantie de bon fonctionnement des équipements (2 ans) et garantie décennale (articles 1792 et suivants du Code civil). Les réserves éventuelles sont levées par l’entreprise dans le délai convenu.'), W)
  doc.text(mention, M, y); y += mention.length * 4 + 8

  const largeur = (W - 8) / 2
  ;[{ t: 'Le maître d’ouvrage', n: d.nomClient, s: d.signatureClient, x: M }, { t: 'L’entreprise', n: d.nomInstallateur, s: d.signatureInstallateur, x: M + largeur + 8 }].forEach(c => {
    doc.setDrawColor(221, 230, 225); doc.roundedRect(c.x, y, largeur, 46, 3, 3)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(18, 38, 31); doc.text(safe(c.t), c.x + 4, y + 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(safe(c.n || ''), c.x + 4, y + 11)
    if (c.s) { try { doc.addImage(c.s, 'PNG', c.x + 6, y + 14, largeur - 12, 28) } catch { /* image illisible */ } }
  })
  return doc
}
