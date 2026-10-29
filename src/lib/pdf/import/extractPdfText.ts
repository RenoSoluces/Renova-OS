import * as pdfjsLib from 'pdfjs-dist'
import { champsEnTexte, structurerChamps, type ChampPdf, type ItemPdf } from './champsPdf'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { photosDeLaPage } from './photosPdf'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export interface PdfTextExtractionResult {
  success: boolean
  text: string
  /** Couples question → réponse reconstitués d'après la mise en page. */
  champs: ChampPdf[]
  /** Photos du rapport, par numéro de légende (« Photo n »), en JPEG data URL. */
  photos: Record<number, string>
  pages: number
  erreurs: string[]
}

export async function extractPdfText(
  file: File,
): Promise<PdfTextExtractionResult> {
  const erreurs: string[] = []

  try {
    const arrayBuffer = await file.arrayBuffer()

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise

    const pages: string[] = []
    const itemsParPage: ItemPdf[][] = []
    const photos: Record<number, string> = {}
    const photosTrouvees = new Set<number>()

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber += 1
    ) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()

      const pageText = content.items
        .map((item) => {
          if (
            'str' in item &&
            typeof item.str === 'string'
          ) {
            return item.str
          }

          return ''
        })
        .filter(Boolean)
        .join(' ')

      pages.push(pageText)

      // Photos : chaque image est légendée « Photo n » juste en dessous.
      const legendes = content.items.flatMap(item => {
        if (!('str' in item)) return []
        const m = item.str.trim().match(/^Photo\s+(\d+)$/i)
        return m ? [{ numero: Number(m[1]), x: item.transform[4], y: item.transform[5] }] : []
      })
      if (legendes.length) {
        try {
          Object.assign(photos, await photosDeLaPage(page, legendes, photosTrouvees))
        } catch (error) {
          console.warn('[RENOVA OS] Photos du rapport non extraites (page ' + pageNumber + ') :', error)
        }
      }
      itemsParPage.push(
        content.items.flatMap(item =>
          'str' in item && typeof item.str === 'string' && item.str.trim()
            ? [{
                s: item.str,
                x: item.transform[4],
                y: item.transform[5],
                w: item.width,
                size: Math.hypot(item.transform[0], item.transform[1]),
              }]
            : [],
        ),
      )
    }

    const champs = structurerChamps(itemsParPage)

    // Texte lisible ligne par ligne (une ligne = une question et sa réponse).
    const text = (champs.length ? champsEnTexte(champs) : pages.join('\n\n'))
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim()

    if (!text) {
      erreurs.push(
        'Aucun texte exploitable n’a été trouvé dans le PDF. Le document est peut-être scanné ou image.',
      )
    }

    return {
      success: erreurs.length === 0,
      text,
      champs,
      photos,
      pages: pdf.numPages,
      erreurs,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Erreur inconnue lors de la lecture du PDF.'

    return {
      success: false,
      text: '',
      champs: [],
      photos: {},
      pages: 0,
      erreurs: [
        `Impossible de lire le PDF : ${message}`,
      ],
    }
  }
}