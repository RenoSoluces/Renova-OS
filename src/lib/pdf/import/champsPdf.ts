/**
 * Reconstitue les couples « question → réponse » d'un rapport de visite
 * à partir de la position des textes dans le PDF.
 *
 * Les rapports de VT (format « VT TH174 / 175 SMART ») sont mis en page en deux
 * colonnes : la question à gauche (police plus grande), la réponse alignée à
 * droite (police plus petite). Les réponses libres (adresse, pièce…) sont écrites
 * sous la question, à gauche. Lire le texte « à plat » mélange tout : on se sert
 * donc des coordonnées de chaque morceau de texte.
 */

export interface ItemPdf {
  /** Texte du morceau. */
  s: string
  /** Abscisse (bord gauche), en points PDF. */
  x: number
  /** Ordonnée de la ligne de base, en points PDF (0 en bas de page). */
  y: number
  /** Largeur du texte. */
  w: number
  /** Taille de police. */
  size: number
}

export interface ChampPdf {
  page: number
  /** Question / libellé (plusieurs lignes réunies). */
  label: string
  /** Réponse (vide si la question n'a pas de réponse, ex. titre de section). */
  value: string
}

const PHOTO = /^Photo\s+\d+$/i

function nettoyer(v: string): string {
  return v.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

interface Bloc {
  page: number
  lignes: { s: string; y: number }[]
  haut: number
  bas: number
  valeurs: { s: string; y: number; x: number }[]
}

/**
 * Taille de police des questions : la plus fréquente parmi les textes alignés
 * à gauche (les réponses alignées à droite sont plus petites).
 */
function tailleQuestions(pages: ItemPdf[][]): number {
  const compte = new Map<number, number>()
  for (const page of pages) {
    for (const it of page) {
      if (it.size <= 0 || it.x > 150 || nettoyer(it.s).length < 4 || PHOTO.test(nettoyer(it.s))) continue
      const k = Math.round(it.size * 2) / 2
      compte.set(k, (compte.get(k) || 0) + 1)
    }
  }
  let meilleure = 10
  let max = 0
  compte.forEach((n, k) => { if (n > max) { max = n; meilleure = k } })
  return meilleure
}

export function structurerChamps(pages: ItemPdf[][]): ChampPdf[] {
  const tailleLabel = tailleQuestions(pages)
  const blocs: Bloc[] = []

  pages.forEach((itemsPage, indexPage) => {
    const page = indexPage + 1
    const items = itemsPage
      .map(it => ({ ...it, s: nettoyer(it.s) }))
      // Taille 0 : ancres de sommaire invisibles. Les légendes « Photo n » sont gardées :
      // elles deviennent la réponse de la question « Photo du mur… », ce qui rattache la photo.
      .filter(it => it.s && it.size > 0)
      .sort((a, b) => b.y - a.y || a.x - b.x)

    const estLabel = (it: ItemPdf) => it.size >= tailleLabel - 0.25 && !PHOTO.test(it.s)
    const blocsPage: Bloc[] = []
    let courant: Bloc | null = null

    // 1. Questions : lignes de grande police à gauche, regroupées quand elles se suivent.
    for (const it of items) {
      if (!estLabel(it)) {
        // Une réponse libre écrite sous la question coupe le bloc en cours.
        if (it.x < 200) courant = null
        continue
      }
      const ecart = courant ? courant.bas - it.y : Infinity
      if (courant && ecart <= it.size * 1.6) {
        courant.lignes.push({ s: it.s, y: it.y })
        courant.bas = it.y
      } else {
        courant = { page, lignes: [{ s: it.s, y: it.y }], haut: it.y, bas: it.y, valeurs: [] }
        blocsPage.push(courant)
      }
    }

    // 2. Réponses : rattachées à la question de la même hauteur (colonne de droite)
    //    ou à la question juste au-dessus (réponse libre à gauche).
    for (const it of items) {
      if (estLabel(it)) continue
      const valeur = { s: it.s, y: it.y, x: it.x }
      let cible: Bloc | undefined
      if (it.x >= 200) {
        const marge = it.size
        const candidats = blocsPage.filter(b => it.y <= b.haut + marge && it.y >= b.bas - marge)
        cible = candidats.sort((a, b) =>
          Math.abs((a.haut + a.bas) / 2 - it.y) - Math.abs((b.haut + b.bas) / 2 - it.y))[0]
      }
      if (!cible) {
        // Question la plus proche au-dessus sur la page, sinon dernière question de la page précédente.
        cible = [...blocsPage].filter(b => b.bas >= it.y - 2).sort((a, b) => a.bas - b.bas)[0]
          ?? blocs[blocs.length - 1]
      }
      cible?.valeurs.push(valeur)
    }

    blocs.push(...blocsPage)
  })

  return blocs.map(b => ({
    page: b.page,
    label: nettoyer(b.lignes.map(l => l.s).join(' ')),
    value: nettoyer(
      b.valeurs
        .sort((a, c) => c.y - a.y || a.x - c.x)
        .map(v => v.s)
        .join(' '),
    ),
  }))
}

/** Texte lisible « question : réponse », une ligne par champ (aperçu et contrôle). */
export function champsEnTexte(champs: ChampPdf[]): string {
  return champs.map(c => (c.value ? `${c.label} : ${c.value}` : c.label)).join('\n')
}
