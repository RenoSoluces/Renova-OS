import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { AuditData } from '../../types'
import { construireBatiment3CL } from '../../lib/3cl/batiment3CL'
import { calculDPE } from '../../lib/3cl/calculDPE'
import { dpeColor } from '../../lib/3cl/moteur3CL'
import {
  importVTFromPdf,
  type ImportVTResult,
} from '../../lib/pdf/import/importVT'

interface ImportRapportVTProps {
  onImport: (auditData: AuditData, result: ImportVTResult) => void
  onClose?: () => void
}

export function ImportRapportVT({
  onImport,
  onClose,
}: ImportRapportVTProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] =
    useState<ImportVTResult | null>(null)
  const [error, setError] = useState('')

  const traiterFichier = async (file: File) => {
    setError('')
    setResult(null)

    if (file.type !== 'application/pdf') {
      setError(
        'Veuillez sélectionner un fichier PDF.',
      )
      return
    }

    setIsLoading(true)

    try {
      const importResult =
        await importVTFromPdf(file)

      setResult(importResult)

      if (
        !importResult.success ||
        !importResult.audit_data
      ) {
        setError(
          importResult.erreurs.join('\n') ||
            'Impossible d’importer ce rapport.',
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue pendant l’import.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (file) {
      void traiterFichier(file)
    }

    event.target.value = ''
  }

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()
    setIsDragging(false)

    const file =
      event.dataTransfer.files?.[0]

    if (file) {
      void traiterFichier(file)
    }
  }

  const importResult =
    result?.parsing

  // Note du logement calculée avec les données reprises du rapport (même calcul que la visite).
  const noteLogement = useMemo(() => {
    if (!result?.success || !result.audit_data?.donnees_batiment?.surface_habitable) return null
    try {
      return calculDPE(construireBatiment3CL(result.audit_data))
    } catch {
      return null
    }
  }, [result])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <FileText size={21} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Importer un rapport de visite
                </h2>

                <p className="text-sm text-gray-500">
                  Import automatique d’un rapport PDF
                </p>
              </div>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {!result && !isLoading && (
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() =>
                setIsDragging(false)
              }
              onDrop={handleDrop}
              onClick={() =>
                inputRef.current?.click()
              }
              className={[
                'cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition',
                isDragging
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/50',
              ].join(' ')}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Upload size={25} />
              </div>

              <h3 className="text-base font-semibold text-gray-900">
                Déposez votre rapport PDF ici
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                ou cliquez pour sélectionner un fichier
              </p>

              <p className="mt-4 text-xs text-gray-400">
                Format accepté : PDF
              </p>

              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 px-6 py-14 text-center">
              <Loader2
                size={36}
                className="animate-spin text-emerald-600"
              />

              <h3 className="mt-4 font-semibold text-gray-900">
                Analyse du rapport...
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Lecture du PDF et détection des données
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <div className="whitespace-pre-line">
                {error}
              </div>
            </div>
          )}

          {result?.success &&
            result.audit_data && (
              <div className="space-y-5">
                {/* Success */}
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2
                    size={21}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <div>
                    <p className="font-semibold text-emerald-900">
                      Rapport analysé avec succès
                    </p>

                    <p className="mt-1 text-sm text-emerald-700">
                      {result.fichier}
                    </p>
                  </div>
                </div>

                {/* Format */}
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Format détecté
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {importResult?.format_detecte
                      ? 'VT TH174 / 175 SMART'
                      : 'Format non identifié'}
                  </p>
                </div>

                {/* Note du logement */}
                {noteLogement && (
                  <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold"
                      style={{ background: dpeColor(noteLogement.etiquette), color: noteLogement.etiquette >= 'E' ? '#fff' : '#1f2937' }}
                    >
                      {noteLogement.etiquette}
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Note du logement (estimation 3CL)
                      </p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {Math.round(noteLogement.consommationM2)} kWh/m²/an · {Math.round(noteLogement.emissionsM2)} kg CO₂/m²/an (GES {noteLogement.etiquetteGES})
                      </p>
                      <p className="text-xs text-gray-500">
                        Recalculée dans la visite après import ; vous pourrez corriger chaque section.
                      </p>
                    </div>
                  </div>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Murs" value={importResult?.statistiques.murs_detectes ?? 0} />
                  <Stat label="Menuiseries" value={importResult?.statistiques.menuiseries_detectees ?? 0} />
                  <Stat label="Planchers bas" value={importResult?.statistiques.planchers_detectes ?? 0} />
                  <Stat label="Combles / toiture" value={importResult?.statistiques.plafonds_detectes ?? 0} />
                </div>

                {/* Warnings */}
                {importResult &&
                  importResult.avertissements
                    .length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex gap-3">
                        <AlertCircle
                          size={20}
                          className="mt-0.5 shrink-0 text-amber-600"
                        />

                        <div>
                          <p className="font-medium text-amber-900">
                            Points à vérifier
                          </p>

                          <ul className="mt-2 space-y-1 text-sm text-amber-800">
                            {importResult.avertissements.map(
                              (warning, index) => (
                                <li key={index}>
                                  • {warning}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Actions */}
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null)
                      setError('')
                    }}
                    className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Choisir un autre PDF
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onImport(
                        result.audit_data!,
                        result,
                      )
                    }
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    Importer et calculer la note
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  )
}