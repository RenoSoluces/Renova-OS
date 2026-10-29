import type { PDFPageProxy } from 'pdfjs-dist'
import * as pdfjsLib from 'pdfjs-dist'

/**
 * Extraction des photos d'un rapport de visite PDF.
 *
 * Dans les rapports « VT TH174 / 175 SMART », chaque photo est imprimée avec une
 * légende « Photo n » juste en dessous. On repère la position de chaque image
 * (en suivant les matrices de transformation du contenu de la page) et on
 * l'associe à la légende placée sous elle. Les photos sont renvoyées en JPEG
 * (data URL), comme celles prises directement dans la visite.
 */

type Matrice = [number, number, number, number, number, number]

const TAILLE_MAX = 1280
const QUALITE_JPEG = 0.82

function multiplier(m: Matrice, t: number[]): Matrice {
  return [
    m[0] * t[0] + m[2] * t[1],
    m[1] * t[0] + m[3] * t[1],
    m[0] * t[2] + m[2] * t[3],
    m[1] * t[2] + m[3] * t[3],
    m[0] * t[4] + m[2] * t[5] + m[4],
    m[1] * t[4] + m[3] * t[5] + m[5],
  ]
}

interface ImagePlacee { id: string; x: number; y: number; largeur: number }

/** Images peintes sur la page avec leur position (coin bas gauche) en points PDF. */
async function imagesDeLaPage(page: PDFPageProxy): Promise<ImagePlacee[]> {
  const OPS = pdfjsLib.OPS
  const ops = await page.getOperatorList()
  let ctm: Matrice = [1, 0, 0, 1, 0, 0]
  const pile: Matrice[] = []
  const images: ImagePlacee[] = []
  ops.fnArray.forEach((fn, i) => {
    const args = ops.argsArray[i]
    if (fn === OPS.save) pile.push([...ctm] as Matrice)
    else if (fn === OPS.restore) ctm = pile.pop() ?? ctm
    else if (fn === OPS.transform) ctm = multiplier(ctm, args as number[])
    else if (fn === OPS.paintImageXObject || fn === (OPS as Record<string, number>).paintJpegXObject) {
      images.push({ id: String(args[0]), x: ctm[4], y: ctm[5], largeur: Math.abs(ctm[0]) })
    }
  })
  return images
}

function objetImage(page: PDFPageProxy, id: string): Promise<any> {
  const source = id.startsWith('g_') ? page.commonObjs : page.objs
  return new Promise(resolve => {
    try {
      source.get(id, (obj: unknown) => resolve(obj))
    } catch {
      resolve(null)
    }
  })
}

/** Convertit l'objet image de pdf.js en JPEG (data URL), réduit si besoin. */
function versJpeg(img: any): string | null {
  if (!img || typeof document === 'undefined') return null
  const largeur: number = img.width
  const hauteur: number = img.height
  if (!largeur || !hauteur) return null

  const source = document.createElement('canvas')
  source.width = largeur
  source.height = hauteur
  const ctx = source.getContext('2d')
  if (!ctx) return null

  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0)
  } else if (img.data) {
    const rgba = new Uint8ClampedArray(largeur * hauteur * 4)
    const data: Uint8Array | Uint8ClampedArray = img.data
    const pixels = largeur * hauteur
    if (img.kind === 3) {
      rgba.set(data.subarray(0, pixels * 4))
    } else if (img.kind === 2) {
      for (let p = 0, s = 0, d = 0; p < pixels; p++, s += 3, d += 4) {
        rgba[d] = data[s]; rgba[d + 1] = data[s + 1]; rgba[d + 2] = data[s + 2]; rgba[d + 3] = 255
      }
    } else {
      // Niveaux de gris ou 1 bit : on retombe sur une lecture simple.
      for (let p = 0, d = 0; p < pixels; p++, d += 4) {
        const v = data[p] ?? 0
        rgba[d] = v; rgba[d + 1] = v; rgba[d + 2] = v; rgba[d + 3] = 255
      }
    }
    ctx.putImageData(new ImageData(rgba, largeur, hauteur), 0, 0)
  } else {
    return null
  }

  const echelle = Math.min(1, TAILLE_MAX / Math.max(largeur, hauteur))
  if (echelle === 1) return source.toDataURL('image/jpeg', QUALITE_JPEG)
  const reduit = document.createElement('canvas')
  reduit.width = Math.round(largeur * echelle)
  reduit.height = Math.round(hauteur * echelle)
  reduit.getContext('2d')?.drawImage(source, 0, 0, reduit.width, reduit.height)
  return reduit.toDataURL('image/jpeg', QUALITE_JPEG)
}

export interface LegendePhoto { numero: number; x: number; y: number }

/**
 * Photos numérotées d'une page : { numéro de la légende → image JPEG }.
 * `legendes` : positions des textes « Photo n » de la page.
 */
export async function photosDeLaPage(
  page: PDFPageProxy,
  legendes: LegendePhoto[],
  dejaTrouvees: Set<number>,
): Promise<Record<number, string>> {
  const aChercher = legendes.filter(l => !dejaTrouvees.has(l.numero))
  if (!aChercher.length) return {}
  const images = await imagesDeLaPage(page)
  const resultat: Record<number, string> = {}

  for (const legende of aChercher) {
    // L'image est posée juste au-dessus de sa légende, alignée à gauche.
    const image = images
      .filter(im => Math.abs(im.x - legende.x) < 12 && im.y > legende.y && im.y - legende.y < 30)
      .sort((a, b) => (a.y - legende.y) - (b.y - legende.y))[0]
    if (!image) continue
    const jpeg = versJpeg(await objetImage(page, image.id))
    if (jpeg) {
      resultat[legende.numero] = jpeg
      dejaTrouvees.add(legende.numero)
    }
  }
  return resultat
}
