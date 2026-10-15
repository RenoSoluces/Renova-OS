export interface PdfTextExtractionResult {
  success: boolean
  text: string
  pages: number
  erreurs: string[]
}

/**
 * Charge PDF.js uniquement au moment où l'utilisateur importe un PDF.
 * Cela évite de bloquer le démarrage général de l'application sur les
 * navigateurs mobiles si le module PDF rencontre un problème de compatibilité.
 */
export async function extractPdfText(
  file: File,
): Promise<PdfTextExtractionResult> {
  const erreurs: string[] = []

  try {
    const [pdfjsLib, pdfWorker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])

    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
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
      erreurs: [`Impossible de lire le PDF : ${message}`],
    }
  }
}
