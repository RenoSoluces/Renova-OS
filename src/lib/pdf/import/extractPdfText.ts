import * as pdfjsLib from 'pdfjs-dist'
import { champsEnTexte, structurerChamps, type ChampPdf, type ItemPdf } from './champsPdf'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export interface PdfTextExtractionResult {
  success: boolean
  text: string
  /** Couples question → réponse reconstitués d'après la mise en page. */
  champs: ChampPdf[]
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
      pages: 0,
      erreurs: [
        `Impossible de lire le PDF : ${message}`,
      ],
    }
  }
}