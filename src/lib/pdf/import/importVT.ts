import type { AuditData } from '../../../types'
import {
  extractPdfText,
  type PdfTextExtractionResult,
} from './extractPdfText'
import {
  parseVT174,
  type VT174ParseResult,
} from './parseVT174'

export interface ImportVTResult {
  success: boolean
  fichier: string
  lecture: PdfTextExtractionResult
  parsing: VT174ParseResult | null
  audit_data: AuditData | null
  erreurs: string[]
}

/**
 * Importe un rapport de visite technique PDF
 * et le transforme en données RENOVA OS.
 */
export async function importVTFromPdf(
  file: File,
): Promise<ImportVTResult> {
  const lecture =
    await extractPdfText(file)

  if (!lecture.success) {
    return {
      success: false,
      fichier: file.name,
      lecture,
      parsing: null,
      audit_data: null,
      erreurs: lecture.erreurs,
    }
  }

  const parsing =
    parseVT174(lecture.champs, lecture.text, lecture.photos)

  if (!parsing.success) {
    return {
      success: false,
      fichier: file.name,
      lecture,
      parsing,
      audit_data: null,
      erreurs: parsing.erreurs,
    }
  }

  return {
    success: true,
    fichier: file.name,
    lecture,
    parsing,
    audit_data: parsing.audit_data,
    erreurs: parsing.erreurs,
  }
}