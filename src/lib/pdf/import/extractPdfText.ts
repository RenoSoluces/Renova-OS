import * as pdfjsLib from 'pdfjs-dist'

export interface PdfTextExtractionResult {
  success: boolean
  text: string
  pages: number
  erreurs: string[]
}

/**
 * Extrait le texte brut d'un fichier PDF avec pdfjs-dist.
 *
 * Cette fonction ne fait pas encore d'OCR :
 * elle fonctionne avec les PDF dont le texte est réellement
 * présent dans le document.
 */
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
    }

    const text = pages
      .join('\n\n')
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
      pages: 0,
      erreurs: [
        `Impossible de lire le PDF : ${message}`,
      ],
    }
  }
}