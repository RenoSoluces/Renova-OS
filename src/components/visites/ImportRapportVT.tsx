import { AlertCircle, CheckCircle2, FileText, Image as ImageIcon, Loader2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AuditData } from '../../types'
import { construireBatiment3CL } from '../../lib/3cl/batiment3CL'
import { calculDPE } from '../../lib/3cl/calculDPE'
import { dpeColor } from '../../lib/3cl/moteur3CL'
import { importVTFromPdf, type ImportVTResult } from '../../lib/pdf/import/importVT'
import { Modal } from '../ui/Modal'

interface ImportRapportVTProps {
  onImport: (auditData: AuditData, result: ImportVTResult) => void | Promise<void>
  onClose: () => void
  /** Fichier déjà choisi (bouton « Importer un rapport PDF ») : analysé dès l'ouverture. */
  fichier?: File | null
}

/**
 * Fenêtre d'import d'un rapport de visite technique PDF.
 * S'affiche au-dessus de la fenêtre « Nouvelle visite » : on garde le prospect
 * et le produit choisis, on analyse le PDF, on montre la note obtenue puis on importe.
 */
export function ImportRapportVT({ onImport, onClose, fichier }: ImportRapportVTProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [glisse, setGlisse] = useState(false)
  const [analyse, setAnalyse] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [result, setResult] = useState<ImportVTResult | null>(null)
  const [erreur, setErreur] = useState('')

  const traiter = async (file: File) => {
    setErreur('')
    setResult(null)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErreur('Veuillez sélectionner un fichier PDF.')
      return
    }
    setAnalyse(true)
    try {
      const r = await importVTFromPdf(file)
      setResult(r)
      if (!r.success || !r.audit_data) setErreur(r.erreurs.join('\n') || 'Impossible d’importer ce rapport.')
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Une erreur est survenue pendant l’import.')
    } finally {
      setAnalyse(false)
    }
  }

  useEffect(() => {
    if (fichier) void traiter(fichier)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichier])

  const parsing = result?.parsing
  const photos = useMemo(() => Object.values(result?.lecture.photos ?? {}), [result])

  const note = useMemo(() => {
    if (!result?.success || !result.audit_data?.donnees_batiment?.surface_habitable) return null
    try {
      return calculDPE(construireBatiment3CL(result.audit_data))
    } catch {
      return null
    }
  }, [result])

  const choisir = () => inputRef.current?.click()
  const pret = !!(result?.success && result.audit_data)

  const importer = async () => {
    if (!result?.audit_data) return
    setEnvoi(true)
    try {
      await onImport(result.audit_data, result)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Importer un rapport de visite"
      width={640}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          {(pret || erreur) && (
            <button className="btn btn-secondary" onClick={choisir} disabled={analyse || envoi}>
              <Upload size={16} /> Autre PDF
            </button>
          )}
          <button className="btn btn-primary" onClick={importer} disabled={!pret || envoi}>
            {envoi ? <Loader2 size={16} className="ivt-spin" /> : <CheckCircle2 size={16} />}
            Importer et calculer la note
          </button>
        </>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) void traiter(f)
          e.target.value = ''
        }}
      />

      {!result && !analyse && (
        <div
          className={`ivt-drop ${glisse ? 'is-over' : ''}`}
          role="button"
          tabIndex={0}
          onClick={choisir}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') choisir() }}
          onDragOver={e => { e.preventDefault(); setGlisse(true) }}
          onDragLeave={() => setGlisse(false)}
          onDrop={e => {
            e.preventDefault()
            setGlisse(false)
            const f = e.dataTransfer.files?.[0]
            if (f) void traiter(f)
          }}
        >
          <span className="ivt-drop-icon"><Upload size={22} /></span>
          <strong>Déposez le rapport PDF ici</strong>
          <span>ou cliquez pour choisir le fichier</span>
          <small>Rapports « VT TH174 / 175 SMART » : questions, mesures et photos sont repris.</small>
        </div>
      )}

      {analyse && (
        <div className="ivt-loading">
          <Loader2 size={30} className="ivt-spin" />
          <strong>Analyse du rapport…</strong>
          <span>Lecture des pages, des réponses et des photos</span>
        </div>
      )}

      {erreur && (
        <div className="ivt-alert is-error" role="alert">
          <AlertCircle size={18} />
          <div>{erreur}</div>
        </div>
      )}

      {pret && result && (
        <div className="ivt-result">
          <div className="ivt-file">
            <FileText size={18} />
            <div>
              <strong>{result.fichier}</strong>
              <span>{parsing?.format_detecte ? 'Format VT TH174 / 175 SMART reconnu' : 'Format non identifié'}</span>
            </div>
            <CheckCircle2 size={18} className="ivt-ok" />
          </div>

          {note && (
            <div className="ivt-note">
              <div
                className="ivt-note-lettre"
                style={{ background: dpeColor(note.etiquette), color: note.etiquette >= 'E' ? '#fff' : '#1f2937' }}
              >
                {note.etiquette}
              </div>
              <div className="ivt-note-txt">
                <span>Note estimée du logement</span>
                <strong>{Math.round(note.consommationM2)} kWh/m²·an</strong>
                <small>{Math.round(note.emissionsM2)} kg CO₂/m²·an · GES {note.etiquetteGES}</small>
              </div>
            </div>
          )}

          <div className="ivt-stats">
            <Stat label="Murs" value={parsing?.statistiques.murs_detectes ?? 0} />
            <Stat label="Menuiseries" value={parsing?.statistiques.menuiseries_detectees ?? 0} />
            <Stat label="Planchers" value={parsing?.statistiques.planchers_detectes ?? 0} />
            <Stat label="Combles" value={parsing?.statistiques.plafonds_detectes ?? 0} />
            <Stat label="Photos" value={photos.length} />
          </div>

          {photos.length > 0 && (
            <div className="ivt-photos">
              {photos.slice(0, 7).map((src, i) => <img key={i} src={src} alt="" />)}
              {photos.length > 7 && <span className="ivt-photos-plus"><ImageIcon size={14} />+{photos.length - 7}</span>}
            </div>
          )}

          {parsing && parsing.avertissements.length > 0 && (
            <div className="ivt-alert is-warning">
              <AlertCircle size={18} />
              <div>
                <strong>À vérifier après import</strong>
                <ul>{parsing.avertissements.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="ivt-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
