import jsPDF from 'jspdf'
import { CHAMPS_FICHE, extraireFiche } from '../devis/conformite'

/**
 * Fiches Reno Soluces générées depuis le catalogue : fiche produit et fiche d'opération CEE.
 * Aucun prix, prix d'achat, marge ni montant de prime n'y figure : ce sont des documents
 * que l'on peut remettre à un client. Les performances propres au constructeur ne sont reprises
 * que si elles sont renseignées dans le catalogue, jamais déduites.
 */

const TEAL: [number, number, number] = [15, 92, 94]
const CUIVRE: [number, number, number] = [168, 98, 52]
const GRIS: [number, number, number] = [102, 116, 118]
const ENCRE: [number, number, number] = [24, 34, 29]

export interface Emetteur { nom: string; logo?: string | null; adresse?: string }
export const RENO_SOLUCES: Emetteur = { nom: 'Reno Soluces', adresse: 'Trausse (Aude) - contact@renosoluces.fr' }

let logoCache: Promise<string | null> | null = null
/** Logo Reno Soluces (public/) en data URL, chargé une seule fois. */
export function chargerLogoRenoSoluces(): Promise<string | null> {
  logoCache ||= fetch('/Logo RenoSoluces.png')
    .then(r => (r.ok ? r.blob() : Promise.reject(new Error('logo'))))
    .then(b => new Promise<string>((resolve, reject) => {
      const lecteur = new FileReader()
      lecteur.onload = () => resolve(String(lecteur.result))
      lecteur.onerror = () => reject(lecteur.error)
      lecteur.readAsDataURL(b)
    }))
    .catch(() => null)
  return logoCache
}

const sur = (v: unknown) => String(v ?? '')
  .replace(/[   ]/g, ' ')
  .replace(/[‐-―−]/g, '-')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/…/g, '...')
  .replace(/[·•]/g, '.')
  .replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/→/g, '->')
  .replace(/η/g, 'eta')
  .replace(/œ/g, 'oe').replace(/Œ/g, 'Oe')
  .replace(/²/g, '2').replace(/³/g, '3')

const LIBELLE_CATEGORIE: Record<string, string> = {
  pac_air_eau: 'Pompe à chaleur air/eau', pac_air_air: 'Pompe à chaleur air/air', pac_geothermie: 'Pompe à chaleur géothermique',
  ballon_thermodynamique: 'Chauffe-eau thermodynamique', solaire_thermique: 'Solaire thermique', ssc: 'Système solaire combiné',
  vmc: 'Ventilation mécanique contrôlée', menuiseries: 'Menuiseries', combles_perdus: 'Isolation des combles', ite: 'Isolation thermique par l\'extérieur',
  plancher: 'Isolation du plancher bas', hp_flottante: 'HP flottante', destratificateur: 'Destratificateur',
}
export const libelleCategorie = (c: string | null | undefined) => LIBELLE_CATEGORIE[String(c)] || String(c || '').replace(/_/g, ' ')

export const TITRES_OPERATIONS: Record<string, { titre: string; domaine: string; secteur: string }> = {
  'BAR-EN-101': { titre: 'Isolation de combles ou de toitures', domaine: 'Enveloppe du bâtiment', secteur: 'Résidentiel' },
  'BAR-EN-102': { titre: 'Isolation des murs', domaine: 'Enveloppe du bâtiment', secteur: 'Résidentiel' },
  'BAR-EN-103': { titre: 'Isolation d\'un plancher', domaine: 'Enveloppe du bâtiment', secteur: 'Résidentiel' },
  'BAR-EN-104': { titre: 'Fenêtre ou porte-fenêtre complète avec vitrage isolant', domaine: 'Enveloppe du bâtiment', secteur: 'Résidentiel' },
  'BAR-TH-125': { titre: 'Ventilation mécanique double flux avec echangeur', domaine: 'Ventilation', secteur: 'Résidentiel' },
  'BAR-TH-127': { titre: 'Ventilation mécanique simple flux hygroréglable', domaine: 'Ventilation', secteur: 'Résidentiel' },
  'BAR-TH-129': { titre: 'Pompe à chaleur de type air/air', domaine: 'Chauffage', secteur: 'Résidentiel' },
  'BAR-TH-143': { titre: 'Système solaire combiné', domaine: 'Chauffage et eau chaude', secteur: 'Résidentiel' },
  'BAR-TH-148': { titre: 'Chauffe-eau thermodynamique à accumulation', domaine: 'Eau chaude sanitaire', secteur: 'Résidentiel' },
  'BAR-TH-168': { titre: 'Chauffe-eau solaire individuel', domaine: 'Eau chaude sanitaire', secteur: 'Résidentiel' },
  'BAR-TH-171': { titre: 'Pompe à chaleur de type air/eau', domaine: 'Chauffage', secteur: 'Résidentiel' },
  'BAR-TH-172': { titre: 'Pompe à chaleur géothermique ou hydrothermique', domaine: 'Chauffage', secteur: 'Résidentiel' },
  'BAT-EN-101': { titre: 'Isolation de combles ou de toitures', domaine: 'Enveloppe du bâtiment', secteur: 'Tertiaire' },
  'BAT-EN-107': { titre: 'Isolation d\'une toiture-terrasse', domaine: 'Enveloppe du bâtiment', secteur: 'Tertiaire' },
  'BAT-TH-134': { titre: 'Moteur ou système de haute pression flottante', domaine: 'Froid', secteur: 'Tertiaire' },
  'BAT-TH-142': { titre: 'Destratificateur ou brasseur d\'air', domaine: 'Chauffage', secteur: 'Tertiaire' },
}

/** Caractéristiques internes, tarifaires ou à confirmer : jamais reprises dans un document client. */
const CLE_INTERNE = /(^|_|\s)(prix|prime|marge|coefficient|fournisseur|achat|plancher|conseille|montant|pose|consommable|evacuation)|a_confirmer|fiche_cee|reference_fabricant|prix_fourniture/i
const VALEUR_VIDE = /^(a confirmer|à confirmer|\[object object\]|true|false|nan|undefined|null|)$/i

export function caracteristiquesPubliques(c: Record<string, string | number> | null | undefined): [string, string][] {
  return Object.entries(c || {})
    .filter(([k, v]) => !CLE_INTERNE.test(k.normalize('NFD').replace(/[̀-ͯ]/g, '')) && !VALEUR_VIDE.test(String(v).trim()))
    .map(([k, v]) => [k.replace(/_/g, ' ').replace(/^./, s => s.toUpperCase()), String(v)])
}

/** Description sans les lignes de service du catalogue (« Montants indicatifs à confirmer : true »…). */
export function descriptionPublique(d: string | null | undefined): string {
  return String(d || '').split('\n')
    .map(l => l.trim())
    .filter(l => l && !/montants? indicatifs?|type hygro|voir les caracteristiques techniques de la fiche/i.test(l.normalize('NFD').replace(/[̀-ͯ]/g, '')))
    .join('\n')
}

class Page {
  doc = new jsPDF({ unit: 'mm', format: 'a4' })
  y = 0
  readonly marge = 18
  readonly largeur = 174
  constructor(private emetteur: Emetteur, private titreCourt: string) { this.entete() }

  private entete() {
    const { doc, marge } = this
    doc.setFillColor(...TEAL); doc.rect(0, 0, 210, 30, 'F')
    doc.setFillColor(...CUIVRE); doc.rect(0, 30, 210, 1.2, 'F')
    if (this.emetteur.logo) {
      doc.setFillColor(255, 255, 255); doc.roundedRect(marge - 2, 4, 22, 22, 3, 3, 'F')
      try { doc.addImage(this.emetteur.logo, 'PNG', marge, 6, 18, 18) } catch { /* logo illisible : l'en-tête reste valable */ }
    }
    const x = this.emetteur.logo ? marge + 26 : marge
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
    doc.text(sur(this.emetteur.nom), x, 15)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(sur(this.titreCourt), x, 21)
    this.y = 42
  }

  verifier(hauteur: number) {
    if (this.y + hauteur > 276) { this.doc.addPage(); this.entete() }
  }

  titre(texte: string, taille = 17) {
    this.verifier(18)
    this.doc.setFont('helvetica', 'bold'); this.doc.setFontSize(taille); this.doc.setTextColor(...TEAL)
    const lignes = this.doc.splitTextToSize(sur(texte), this.largeur) as string[]
    this.doc.text(lignes, this.marge, this.y); this.y += lignes.length * (taille * 0.42) + 3
  }

  section(texte: string) {
    this.verifier(14)
    this.y += 3
    this.doc.setFont('helvetica', 'bold'); this.doc.setFontSize(11); this.doc.setTextColor(...CUIVRE)
    this.doc.text(sur(texte).toUpperCase(), this.marge, this.y)
    this.doc.setDrawColor(214, 222, 222); this.doc.line(this.marge, this.y + 1.8, this.marge + this.largeur, this.y + 1.8)
    this.y += 7
  }

  texte(texte: string, couleur: [number, number, number] = ENCRE, taille = 10) {
    this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(taille); this.doc.setTextColor(...couleur)
    for (const para of sur(texte).split('\n')) {
      const lignes = (para.trim() === '' ? [''] : this.doc.splitTextToSize(para, this.largeur)) as string[]
      for (const l of lignes) { this.verifier(6); this.doc.text(l, this.marge, this.y); this.y += 5.2 }
    }
  }

  /** Tableau à deux colonnes : libellé / valeur, lignes zébrées. */
  tableau(lignes: [string, string][]) {
    const colonne = 62
    lignes.forEach(([k, v], i) => {
      const valeur = this.doc.splitTextToSize(sur(v), this.largeur - colonne - 4) as string[]
      const hauteur = Math.max(7, valeur.length * 5 + 2.4)
      this.verifier(hauteur)
      if (i % 2 === 0) { this.doc.setFillColor(243, 247, 245); this.doc.rect(this.marge, this.y - 4.6, this.largeur, hauteur, 'F') }
      this.doc.setFont('helvetica', 'bold'); this.doc.setFontSize(9.5); this.doc.setTextColor(...GRIS)
      this.doc.text(this.doc.splitTextToSize(sur(k), colonne - 4) as string[], this.marge + 2, this.y)
      this.doc.setFont('helvetica', 'normal'); this.doc.setTextColor(...ENCRE)
      this.doc.text(valeur, this.marge + colonne, this.y)
      this.y += hauteur
    })
    this.y += 2
  }

  fin(mention: string): Blob {
    const pages = this.doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      this.doc.setPage(i)
      this.doc.setDrawColor(214, 222, 222); this.doc.line(this.marge, 283, this.marge + this.largeur, 283)
      this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(7.5); this.doc.setTextColor(150, 150, 150)
      this.doc.text(sur(`${this.emetteur.nom}${this.emetteur.adresse ? ' - ' + this.emetteur.adresse : ''}`), this.marge, 288)
      this.doc.text(`page ${i}/${pages}`, this.marge + this.largeur, 288, { align: 'right' })
      if (i === pages) { this.doc.setFontSize(7); this.doc.text(sur(mention), this.marge, 292.5) }
    }
    return this.doc.output('blob')
  }
}

export interface ProduitFiche {
  nom: string
  marque?: string | null
  reference?: string | null
  categorie?: string | null
  description?: string | null
  caracteristiques?: Record<string, string | number> | null
  fiche_cee?: string | null
  eligible_cee?: boolean | null
  eligible_mpr?: boolean | null
  public_cible?: string | null
}

export function genererFicheProduit(p: ProduitFiche, emetteur: Emetteur = RENO_SOLUCES): Blob {
  const page = new Page(emetteur, 'Fiche technique produit')
  page.titre(p.nom)
  const code = extraireFiche(p.fiche_cee) || extraireFiche(String(p.caracteristiques?.fiche_cee || ''))
  const identite: [string, string][] = [
    ...(p.marque ? [['Marque', p.marque] as [string, string]] : []),
    ...(p.reference ? [['Référence catalogue', p.reference] as [string, string]] : []),
    ['Famille', libelleCategorie(p.categorie)],
    ['Public', p.public_cible === 'professionnel' ? 'Professionnels' : 'Particuliers'],
    ...(code ? [['Opération CEE', `${code}${TITRES_OPERATIONS[code] ? ' - ' + TITRES_OPERATIONS[code].titre : ''}`] as [string, string]] : []),
    ['Éligibilité CEE', p.eligible_cee ? 'Produit rattaché à une opération standardisée (sous réserve des conditions de la fiche)' : 'Non rattaché à une opération CEE'],
    ...(p.eligible_mpr ? [['MaPrimeRenov\'', 'Geste potentiellement éligible (sous réserve des conditions en vigueur)'] as [string, string]] : []),
  ]
  page.section('Identification')
  page.tableau(identite)
  const description = descriptionPublique(p.description)
  if (description) { page.section('Description'); page.texte(description) }
  const caracs = caracteristiquesPubliques(p.caracteristiques)
  if (caracs.length) { page.section('Caractéristiques'); page.tableau(caracs) }
  const champs = code ? CHAMPS_FICHE[code] : undefined
  if (champs?.length) {
    page.section('Données à réunir pour le dossier')
    page.texte(`L'opération ${code} impose de renseigner et de justifier, sur le devis puis sur la facture :`, GRIS, 9.5)
    page.texte(champs.map(c => `- ${c.l}${c.u ? ` (${c.u})` : ''}`).join('\n'))
  }
  page.y += 4
  page.texte('Les valeurs de performance font foi uniquement lorsqu\'elles sont issues de la fiche du fabricant, de la certification du produit ou de l\'avis technique. Cette fiche ne remplace ni la notice du fabricant ni la fiche d\'opération standardisée en vigueur.', GRIS, 8.5)
  return page.fin(`Document généré le ${new Date().toLocaleDateString('fr-FR')} - sans valeur contractuelle`)
}

export function genererFicheOperation(code: string, produits: { nom: string; marque?: string | null }[], emetteur: Emetteur = RENO_SOLUCES): Blob {
  const info = TITRES_OPERATIONS[code]
  const page = new Page(emetteur, 'Fiche d\'opération CEE')
  page.titre(code, 22)
  page.titre(info?.titre || 'Opération standardisée d\'économies d\'énergie', 13)
  page.section('Présentation')
  page.tableau([
    ['Opération', code],
    ['Intitulé', info?.titre || 'À compléter'],
    ...(info ? [['Domaine', info.domaine] as [string, string], ['Secteur', info.secteur] as [string, string]] : []),
    ['Produits au catalogue', String(produits.length)],
  ])
  const champs = CHAMPS_FICHE[code]
  if (champs?.length) {
    page.section('Données à renseigner sur le devis et la facture')
    page.texte(champs.map(c => `- ${c.l}${c.u ? ` (${c.u})` : ''}`).join('\n'))
  }
  page.section('Documents du dossier')
  page.texte('- Devis signé avant le début des travaux, mentionnant l\'opération, les caractéristiques et le rôle actif et incitatif du délégataire ou de la prime\n- Cadre de contribution CEE signé avant l\'engagement de l\'operation\n- Facture indiquant les mêmes caractéristiques que le devis\n- Attestation sur l\'honneur (pour les travaux concernés)\n- Fiche technique du produit et justificatifs de certification')
  const marques = [...new Set(produits.map(p => p.marque).filter(Boolean))].sort() as string[]
  if (marques.length) { page.section('Marques disponibles'); page.texte(marques.join(', ')) }
  page.y += 4
  page.texte('Les conditions de performance, de mise en œuvre et de durée de validité sont celles de la fiche d\'opération standardisée publiée au Journal officiel et en vigueur à la date d\'engagement de l\'opération. Vérifier la version applicable avant toute signature.', GRIS, 8.5)
  return page.fin(`Document généré le ${new Date().toLocaleDateString('fr-FR')} - sans valeur contractuelle`)
}
