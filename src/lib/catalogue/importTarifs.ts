/** Import de tarifs fournisseurs : lecture d'un tableau (Excel/CSV) ou d'un texte collé (PDF), rapprochement avec le catalogue. */

export interface ProduitTarif { id: string; nom: string; marque?: string | null; reference?: string | null; categorie: string; actif?: boolean }
export interface LigneTarif { reference: string; designation: string; prix: number }
export interface Rapprochement {
  ligne: LigneTarif
  produit: ProduitTarif | null
  /** Comment la correspondance a été trouvée. */
  methode: 'reference' | 'designation' | null
  ancien: number
  ecartPct: number | null
}

const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
export const normaliserReference = (s: string | null | undefined) => sansAccent(String(s ?? '')).toUpperCase().replace(/[^A-Z0-9]/g, '')
const normaliserTexte = (s: string | null | undefined) => sansAccent(String(s ?? '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** « 1 234,50 € » → 1234.5 ; « 1.234,50 » → 1234.5 ; « 1,234.50 » → 1234.5. */
export function lireNombre(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  let s = String(v ?? '').replace(/[€\s  ]|HT|EUR/gi, '')
  if (!s) return 0
  const virgule = s.lastIndexOf(','), point = s.lastIndexOf('.')
  if (virgule > -1 && point > -1) s = virgule > point ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (virgule > -1) s = /,\d{3}$/.test(s) && (s.match(/,/g) || []).length > 1 ? s.replace(/,/g, '') : s.replace(',', '.')
  const n = Number(s.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

const MOTS_REF = ['reference', 'ref', 'code article', 'code', 'article', 'sku', 'ean']
const MOTS_PRIX = ['prix achat', 'prix net', 'net ht', 'prix ht', 'tarif net', 'prix remise', 'pu ht', 'prix', 'tarif', 'montant']
const MOTS_DESIGNATION = ['designation', 'libelle', 'description', 'produit', 'nom']

/** Repère les colonnes référence / désignation / prix à partir des en-têtes (indices, -1 si absente). */
export function detecterColonnes(entetes: unknown[]): { reference: number; designation: number; prix: number } {
  const h = entetes.map(e => normaliserTexte(String(e ?? '')))
  const chercher = (mots: string[], exclure: number[] = []) => {
    for (const m of mots) {
      const i = h.findIndex((x, k) => !exclure.includes(k) && (x === m || x.startsWith(`${m} `) || x.includes(m)))
      if (i > -1) return i
    }
    return -1
  }
  // Le prix public (PPC, prix public) n'est pas un prix d'achat : on le prend en dernier recours.
  const prixCandidats = h.map((x, i) => ({ x, i })).filter(c => !/public|ppc|ppi|conseille|ttc/.test(c.x))
  let prix = -1
  for (const m of MOTS_PRIX) { const c = prixCandidats.find(c => c.x.includes(m)); if (c) { prix = c.i; break } }
  if (prix < 0) prix = chercher(['prix public', 'ppc'])
  const reference = chercher(MOTS_REF, [prix])
  const designation = chercher(MOTS_DESIGNATION, [prix, reference])
  return { reference, designation, prix }
}

/** Transforme les lignes d'une feuille (première ligne d'en-têtes trouvée automatiquement) en lignes de tarif. */
export function lignesDepuisFeuille(rows: unknown[][]): { lignes: LigneTarif[]; colonnes: ReturnType<typeof detecterColonnes> | null } {
  for (let k = 0; k < Math.min(rows.length, 15); k++) {
    const c = detecterColonnes(rows[k] || [])
    if (c.prix > -1 && (c.reference > -1 || c.designation > -1)) {
      const lignes = rows.slice(k + 1).map(r => ({
        reference: c.reference > -1 ? String(r?.[c.reference] ?? '').trim() : '',
        designation: c.designation > -1 ? String(r?.[c.designation] ?? '').trim() : '',
        prix: lireNombre(r?.[c.prix]),
      })).filter(l => l.prix > 0 && (l.reference || l.designation))
      return { lignes, colonnes: c }
    }
  }
  return { lignes: [], colonnes: null }
}

/** Texte copié depuis un PDF de tarifs : chaque ligne contenant une référence du catalogue et un prix. */
export function lignesDepuisTexte(texte: string, produits: ProduitTarif[]): LigneTarif[] {
  const refs = produits.map(p => ({ brute: (p.reference || '').trim(), n: normaliserReference(p.reference) })).filter(r => r.n.length >= 3)
  const sortie: LigneTarif[] = []
  for (const brut of texte.split(/\r?\n/)) {
    const ligne = brut.trim()
    if (!ligne) continue
    const compacte = normaliserReference(ligne)
    const ref = refs.filter(r => compacte.includes(r.n)).sort((a, b) => b.n.length - a.n.length)[0]
    if (!ref) continue
    // Dernier montant de la ligne (le prix net est généralement en fin de ligne).
    const montants = ligne.match(/\d{1,3}(?:[   .]\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?(?=\s*(?:€|EUR|HT)?\s*$)/gi) || []
    const prix = lireNombre(montants[montants.length - 1])
    if (prix > 0) sortie.push({ reference: ref.brute, designation: ligne.slice(0, 120), prix })
  }
  return sortie
}

/** Associe chaque ligne de tarif à un produit : référence exacte, sinon désignation identique à « marque nom ». */
export function rapprocher(lignes: LigneTarif[], produits: ProduitTarif[], prixAchat: Map<string, number>): Rapprochement[] {
  const parRef = new Map<string, ProduitTarif>()
  const parNom = new Map<string, ProduitTarif>()
  for (const p of produits) {
    const r = normaliserReference(p.reference)
    if (r && !parRef.has(r)) parRef.set(r, p)
    for (const cle of [normaliserTexte(p.nom), normaliserTexte(`${p.marque || ''} ${p.nom}`)]) if (cle && !parNom.has(cle)) parNom.set(cle, p)
  }
  const vus = new Set<string>()
  return lignes.map(ligne => {
    let produit = ligne.reference ? parRef.get(normaliserReference(ligne.reference)) || null : null
    let methode: Rapprochement['methode'] = produit ? 'reference' : null
    if (!produit && ligne.designation) { produit = parNom.get(normaliserTexte(ligne.designation)) || null; if (produit) methode = 'designation' }
    if (produit && vus.has(produit.id)) { produit = null; methode = null }
    if (produit) vus.add(produit.id)
    const ancien = produit ? prixAchat.get(produit.id) || 0 : 0
    return { ligne, produit, methode, ancien, ecartPct: produit && ancien > 0 ? ((ligne.prix - ancien) / ancien) * 100 : null }
  })
}
