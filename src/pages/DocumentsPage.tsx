import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, FileText, FileImage, FileSpreadsheet, Upload, Trash2, ExternalLink, Loader2, Folder, History, Eye, UploadCloud, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Document, Dossier, Prospect } from '../types'
import { uploadDocument } from '../lib/storage/uploadDocument'
import { useAuth } from '../lib/auth/AuthContext'
import { FloatSelect } from '../components/ui/FloatInput'
import { Modal } from '../components/ui/Modal'

const TYPE_ICON: Record<string, any> = {
  pdf: FileText, doc: FileText, docx: FileText,
  jpg: FileImage, jpeg: FileImage, png: FileImage,
  xls: FileSpreadsheet, xlsx: FileSpreadsheet, csv: FileSpreadsheet,
}

const TYPE_BADGE: Record<string, string> = {
  pdf: 'badge-error', doc: 'badge-info', docx: 'badge-info',
  jpg: 'badge-accent', png: 'badge-accent', jpeg: 'badge-accent',
  xls: 'badge-success', xlsx: 'badge-success', csv: 'badge-success',
}

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp'])

const TYPE_FILTERS: { key: string; label: string; exts: string[] }[] = [
  { key: 'tous', label: 'Tous', exts: [] },
  { key: 'pdf', label: 'PDF', exts: ['pdf'] },
  { key: 'image', label: 'Images', exts: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
  { key: 'tableur', label: 'Tableurs', exts: ['xls', 'xlsx', 'csv'] },
  { key: 'autre', label: 'Autres', exts: [] },
]

function formatSize(t: string | number | null | undefined) {
  if (t == null || t === '') return '—'
  const n = Number(t)
  if (!Number.isNaN(n)) {
    if (n < 1024) return `${n} o`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`
    return `${(n / 1024 / 1024).toFixed(1)} Mo`
  }
  return String(t)
}

type DocRow = Document & { dossier?: (Dossier & { prospect?: Prospect }) | null }

export function DocumentsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'
  const [docs, setDocs] = useState<DocRow[]>([])
  const [dossiers, setDossiers] = useState<(Dossier & { prospect?: Prospect })[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dossierCible, setDossierCible] = useState('') // dossier auquel rattacher le prochain import
  const [filtreDossier, setFiltreDossier] = useState('tous') // 'tous' | 'sans_dossier' | dossier id
  const [filtreType, setFiltreType] = useState('tous')
  const [groupesOuverts, setGroupesOuverts] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<DocRow | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const versionInputRef = useRef<HTMLInputElement>(null)
  const [docPourNouvelleVersion, setDocPourNouvelleVersion] = useState<DocRow | null>(null)

  function load() {
    supabase
      .from('documents')
      .select('*, dossier:dossiers(*, prospect:prospects(*))')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setDocs([]); setLoading(false); return }
        setDocs((data || []) as any)
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
    supabase.from('dossiers').select('*, prospect:prospects(*)').order('created_at', { ascending: false })
      .then(({ data }) => setDossiers((data || []) as any))
  }, [])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    for (const file of Array.from(files)) {
      const { error } = await uploadDocument(file, { dossierId: dossierCible || null })
      if (error) setError(`Échec de l'envoi de "${file.name}" : ${error}`)
    }
    setUploading(false)
    load()
  }

  async function handleNouvelleVersion(files: FileList | null) {
    if (!files || files.length === 0 || !docPourNouvelleVersion) return
    setUploading(true)
    setError('')
    const { error } = await uploadDocument(files[0], { nouvelleVersionDe: docPourNouvelleVersion })
    if (error) setError(`Échec de l'envoi de la nouvelle version : ${error}`)
    setUploading(false)
    setDocPourNouvelleVersion(null)
    load()
  }

  async function removeDoc(d: Document) {
    if (!confirm(`Supprimer "${d.nom}" ?${d.version > 1 || docs.some(x => x.groupe_id === d.groupe_id && x.id !== d.id) ? ' Seule cette version sera supprimée.' : ''}`)) return
    await supabase.from('documents').delete().eq('id', d.id)
    load()
  }

  const ext = (d: Document) => ((d.type || (d.nom || '').split('.').pop() || '').toLowerCase())
  const estPdf = (d: Document) => ext(d) === 'pdf'

  const dossierLabel = (d: DocRow) => {
    if (!d.dossier) return null
    const p = d.dossier.prospect
    return p ? `${d.dossier.reference} — ${p.prenom} ${p.nom}` : d.dossier.reference
  }

  // Regroupement par document logique (groupe_id) : on n'affiche que la dernière version
  // dans la grille principale, les versions précédentes sont dépliables.
  const groupes = useMemo(() => {
    const parGroupe = new Map<string, DocRow[]>()
    for (const d of docs) {
      const key = d.groupe_id || d.id
      if (!parGroupe.has(key)) parGroupe.set(key, [])
      parGroupe.get(key)!.push(d)
    }
    return Array.from(parGroupe.values()).map(versions => {
      const triees = [...versions].sort((a, b) => (b.version || 1) - (a.version || 1))
      return { derniere: triees[0], anciennes: triees.slice(1) }
    })
  }, [docs])

  const groupesFiltres = useMemo(() => {
    return groupes.filter(({ derniere: d }) => {
      if (filtreDossier === 'sans_dossier' && d.dossier_id) return false
      if (filtreDossier !== 'tous' && filtreDossier !== 'sans_dossier' && d.dossier_id !== filtreDossier) return false
      if (filtreType !== 'tous') {
        const e = ext(d)
        const famille = TYPE_FILTERS.find(f => f.key === filtreType)
        if (filtreType === 'autre') {
          const connu = TYPE_FILTERS.some(f => f.exts.includes(e))
          if (connu) return false
        } else if (famille && !famille.exts.includes(e)) {
          return false
        }
      }
      return true
    })
  }, [groupes, filtreDossier, filtreType])

  const sansDossierCount = groupes.filter(g => !g.derniere.dossier_id).length

  function toggleGroupe(id: string) {
    setGroupesOuverts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function downloadDocument(doc: Document) {
    if (!doc.url) return
    try {
      const response = await fetch(doc.url)
      if (!response.ok) throw new Error('Téléchargement impossible')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = doc.nom || 'document'; document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(doc.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Pièces justificatives, devis et contrats</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ minWidth: 240 }}>
            <FloatSelect
              label="Classer l'import dans"
              value={dossierCible}
              onChange={setDossierCible}
              options={[
                { value: '', label: 'Sans dossier (à classer plus tard)' },
                ...dossiers.map(d => ({
                  value: d.id,
                  label: d.prospect ? `${d.reference} — ${d.prospect.prenom} ${d.prospect.nom}` : d.reference,
                })),
              ]}
            />
          </div>
          <input ref={inputRef} type="file" multiple hidden onChange={e => handleFiles(e.target.files)} />
          <button className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
            {uploading ? 'Envoi en cours…' : 'Importer un document'}
          </button>
        </div>
      </div>

      {/* Input caché dédié à l'ajout d'une nouvelle version d'un document existant */}
      <input
        ref={versionInputRef}
        type="file"
        hidden
        onChange={e => handleNouvelleVersion(e.target.files)}
      />

      {error && (
        <div className="card mb-4">
          <div className="card-pad flex items-center gap-2 text-sm" style={{ color: 'var(--c-error)' }}>
            <Upload size={16} /> {error}
          </div>
        </div>
      )}

      {/* Filtres : dossier + type de fichier */}
      <div className="flex items-center gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220 }}>
          <FloatSelect
            label="Filtrer par dossier"
            value={filtreDossier}
            onChange={setFiltreDossier}
            options={[
              { value: 'tous', label: `Tous les dossiers (${groupes.length})` },
              { value: 'sans_dossier', label: `Sans dossier (${sansDossierCount})` },
              ...dossiers.map(d => ({
                value: d.id,
                label: d.prospect ? `${d.reference} — ${d.prospect.prenom} ${d.prospect.nom}` : d.reference,
              })),
            ]}
          />
        </div>
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              className={`btn ${filtreType === f.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: 32, padding: '0 12px', fontSize: 13 }}
              onClick={() => setFiltreType(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="card-pad text-muted">Chargement…</div></div>
      ) : docs.length === 0 ? (
        <div
          className="card"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          <div className="empty-state">
            <FileText size={40} />
            <h3>Aucun document</h3>
            <p>Importez vos devis, contrats et pièces justificatives, ou glissez-déposez un fichier ici.</p>
            <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
              <Plus size={18} /> Importer un document
            </button>
          </div>
        </div>
      ) : groupesFiltres.length === 0 ? (
        <div className="card">
          <div className="card-pad text-muted">Aucun document ne correspond à ce filtre.</div>
        </div>
      ) : (
        <div className="grid grid-3 gap-4" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}>
          {groupesFiltres.map(({ derniere: d, anciennes }) => {
            const e = ext(d)
            const Icon = TYPE_ICON[e] || FileText
            const estImage = IMAGE_EXT.has(e)
            const label = dossierLabel(d)
            const ouvert = groupesOuverts.has(d.groupe_id)
            return (
              <div className="card" key={d.groupe_id}>
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    {estImage && d.url ? (
                      <button onClick={() => setPreview(d)} style={{ flexShrink: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                        <img
                          src={d.url}
                          alt={d.nom}
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--neutral-200)' }}
                        />
                      </button>
                    ) : (
                      <div className="kpi-tile-icon blue" style={{ borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} />
                      </div>
                    )}
                    <div className="flex-col">
                      <div className="font-semibold text-sm" style={{ wordBreak: 'break-word' }}>{d.nom}</div>
                      <div className="text-xs text-muted">
                        {new Date(d.created_at).toLocaleDateString('fr-FR')} · {formatSize(d.taille)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                    <span className={`badge ${TYPE_BADGE[e] || 'badge-neutral'}`}>{e.toUpperCase() || 'FICHIER'}</span>
                    {label ? (
                      <span className="badge badge-info flex items-center gap-1"><Folder size={11} /> {label}</span>
                    ) : (
                      <span className="badge badge-neutral">Sans dossier</span>
                    )}
                    {(d.version > 1 || anciennes.length > 0) && (
                      <button
                        className="badge badge-warning flex items-center gap-1"
                        style={{ border: 'none', cursor: 'pointer' }}
                        onClick={() => toggleGroupe(d.groupe_id)}
                        title="Voir les versions précédentes"
                      >
                        <History size={11} /> v{d.version} · {anciennes.length + 1} version{anciennes.length > 0 ? 's' : ''}
                      </button>
                    )}
                  </div>

                  {ouvert && anciennes.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--neutral-200)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {anciennes.map(v => (
                        <div key={v.id} className="flex items-center gap-2 text-xs" style={{ justifyContent: 'space-between' }}>
                          <span className="text-muted">v{v.version} — {new Date(v.created_at).toLocaleDateString('fr-FR')}</span>
                          <div className="flex items-center gap-2">
                            {v.url && <a href={v.url} target="_blank" rel="noreferrer" title="Ouvrir cette version"><ExternalLink size={13} /></a>}                            {isAdmin && v.url && <button onClick={() => downloadDocument(v)} title="Télécharger cette version" style={{border:0,background:'none',cursor:'pointer'}}><Download size={13} /></button>}
                            <button onClick={() => removeDoc(v)} title="Supprimer cette version"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2" style={{ justifyContent: 'flex-end' }}>
                    {estPdf(d) && d.url && (
                      <button className="btn-icon-sm" title="Aperçu" onClick={() => setPreview(d)}>
                        <Eye size={15} />
                      </button>
                    )}
                    <button
                      className="btn-icon-sm"
                      title="Importer une nouvelle version"
                      onClick={() => { setDocPourNouvelleVersion(d); versionInputRef.current?.click() }}
                    >
                      <UploadCloud size={15} />
                    </button>
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noreferrer" className="btn-icon-sm" title="Ouvrir">
                        <ExternalLink size={15} />
                      </a>
                    )}
                    {isAdmin && d.url && (
                      <button className="btn-icon-sm" title="Télécharger le document" onClick={() => downloadDocument(d)}>
                        <Download size={15} />
                      </button>
                    )}
                    <button className="btn-icon-sm" title="Supprimer" onClick={() => removeDoc(d)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.nom || 'Aperçu'} width={820}>
        {preview && estPdf(preview) && preview.url && (
          <iframe
            src={preview.url}
            title={preview.nom}
            style={{ width: '100%', height: '75vh', border: 'none', borderRadius: 8 }}
          />
        )}
        {preview && IMAGE_EXT.has(ext(preview)) && preview.url && (
          <img src={preview.url} alt={preview.nom} style={{ width: '100%', borderRadius: 8 }} />
        )}
      </Modal>
    </div>
  )
}
