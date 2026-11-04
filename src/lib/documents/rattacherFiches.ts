/**
 * Rattachement automatique de fiches fabricant (PDF) aux produits du catalogue, d'après le nom du fichier.
 * Prudent : un rattachement n'est « sûr » que si le nom du fichier est exactement une référence connue.
 */

export interface ProduitRattachable {
  id: string
  nom: string
  marque?: string | null
  reference?: string | null
  caracteristiques?: Record<string, unknown> | null
}

export type Confiance = 'sur' | 'probable' | 'aucun'

export interface Rattachement {
  fichier: string
  confiance: Confiance
  /** Produits proposés (plusieurs si une même référence fabricant couvre plusieurs variantes du catalogue). */
  produits: ProduitRattachable[]
}

/** Minuscules, sans accents ni séparateurs : « Alfea-Excellia_S 12kW.pdf » → « alfeaexcelliaS12kw ». */
export const normaliser = (t: string) =>
  String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\.pdf$/i, '').replace(/[^a-z0-9]+/g, '')

const VIDE = new Set(['', 'aconfirmer', 'nan', 'null', 'undefined', 'true', 'false'])

/** Références utilisables pour reconnaître un produit : référence catalogue et référence fabricant. */
export function clesProduit(p: ProduitRattachable): string[] {
  const brutes = [p.reference, p.caracteristiques?.reference_fabricant as string | undefined]
  return brutes.map(b => normaliser(String(b ?? ''))).filter(k => k.length >= 4 && !VIDE.has(k))
}

export function rattacherFichier(nomFichier: string, produits: ProduitRattachable[]): Rattachement {
  const cle = normaliser(nomFichier)
  const base = { fichier: nomFichier }
  if (cle.length < 4) return { ...base, confiance: 'aucun', produits: [] }

  const exacts = produits.filter(p => clesProduit(p).includes(cle))
  if (exacts.length) return { ...base, confiance: 'sur', produits: exacts }

  // Le nom du fichier contient une référence connue (« Fiche_520559_Atlantic.pdf ») : probable, à vérifier.
  const contenant = produits.filter(p => clesProduit(p).some(k => k.length >= 5 && cle.includes(k)))
  if (contenant.length) return { ...base, confiance: 'probable', produits: contenant.slice(0, 8) }

  // Rapprochement par le nom du produit : les mots du fichier se retrouvent dans le nom.
  const mots = String(nomFichier).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\.pdf$/i, '').split(/[^a-z0-9]+/).filter(m => m.length >= 3)
  if (mots.length >= 2) {
    const notes = produits.map(p => {
      const nom = normaliser(`${p.marque ?? ''} ${p.nom}`)
      const trouves = mots.filter(m => nom.includes(m)).length
      return { p, part: trouves / mots.length }
    }).filter(x => x.part >= 0.8).sort((a, b) => b.part - a.part)
    if (notes.length) return { ...base, confiance: 'probable', produits: notes.slice(0, 8).map(x => x.p) }
  }
  return { ...base, confiance: 'aucun', produits: [] }
}

export const rattacherFichiers = (noms: string[], produits: ProduitRattachable[]) => noms.map(n => rattacherFichier(n, produits))
