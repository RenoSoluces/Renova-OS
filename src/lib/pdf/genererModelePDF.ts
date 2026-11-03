import jsPDF from 'jspdf'

/** Retire les caractères que la police Helvetica de jsPDF ne sait pas dessiner. */
const sur = (v: unknown) => String(v ?? '')
  .replace(/[   ]/g, ' ')
  .replace(/[‐-―−]/g, '-')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/…/g, '...')
  .replace(/·/g, '.')
  .replace(/œ/g, 'oe').replace(/Œ/g, 'Oe')

/** Document texte à signer (mandat, attestation…) : titre, corps déjà rempli, pied de page. */
export function genererModelePDF(opts: { titre: string; corps: string; reference?: string; emetteur?: string; sansSignature?: boolean }): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const marge = 20
  const largeur = 210 - marge * 2
  let y = 24
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 92, 94)
  const titre = doc.splitTextToSize(sur(opts.titre), largeur) as string[]
  doc.text(titre, marge, y); y += titre.length * 7 + 2
  if (opts.reference) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(102, 116, 118); doc.text(sur(opts.reference), marge, y); y += 8 }
  doc.setDrawColor(214, 222, 222); doc.line(marge, y, 210 - marge, y); y += 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(24, 34, 29)
  for (const paragraphe of sur(opts.corps).split('\n')) {
    const lignes = (paragraphe.trim() === '' ? [''] : doc.splitTextToSize(paragraphe, largeur)) as string[]
    for (const l of lignes) {
      if (y > 275) { doc.addPage(); y = 24 }
      doc.text(l, marge, y); y += 5.6
    }
  }
  // Cadre de signature
  if (!opts.sansSignature) {
    if (y > 240) { doc.addPage(); y = 24 }
    y += 6
    doc.setDrawColor(168, 98, 52); doc.rect(marge, y, largeur / 2 - 4, 28); doc.rect(marge + largeur / 2 + 4, y, largeur / 2 - 4, 28)
    doc.setFontSize(8); doc.setTextColor(102, 116, 118)
    doc.text('Signature (précédée de « Lu et approuvé »)', marge + 2, y + 5)
    doc.text('Signature du mandataire / installateur', marge + largeur / 2 + 6, y + 5)
  }
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150)
    doc.text(sur(`${opts.emetteur || ''}  -  page ${i}/${pages}`), marge, 290)
  }
  return doc.output('blob')
}

/** Fiche produit simple, générée depuis le catalogue quand aucune fiche technique PDF n'a été importée. */
export function genererFicheProduitPDF(p: { nom: string; marque?: string | null; reference?: string | null; description?: string | null; caracteristiques?: Record<string, string | number> | null; fiche_cee?: string | null }): Blob {
  const lignes = [
    p.marque ? `Marque : ${p.marque}` : '', p.reference ? `Référence : ${p.reference}` : '', p.fiche_cee ? `Opération CEE : ${p.fiche_cee}` : '',
    '', p.description || '', '', ...(p.caracteristiques && Object.keys(p.caracteristiques).length ? ['Caractéristiques :', ...Object.entries(p.caracteristiques).map(([k, v]) => `- ${k} : ${v}`)] : []),
  ]
  return genererModelePDF({ titre: `Fiche produit - ${p.nom}`, corps: lignes.join('\n').replace(/\n{3,}/g, '\n\n'), emetteur: 'Fiche générée depuis le catalogue - à remplacer par la fiche du fabricant' })
}
