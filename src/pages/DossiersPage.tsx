import { useEffect, useRef, useState } from 'react'
import { Plus, FolderOpen, CheckCircle2, Clock, Wallet, FileText, Check, Upload, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Dossier, Prospect, Devis, Document as DocumentPiece } from '../types'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { FloatSelect } from '../components/ui/FloatInput'
import { uploadDocument } from '../lib/storage/uploadDocument'

const STATUT_BADGE: Record<string, string> = {
  en_cours: 'badge-info', cours: 'badge-info', creation: 'badge-info',
  signe: 'badge-success', accepte: 'badge-success',
  refuse: 'badge-error', annule: 'badge-error',
  attente: 'badge-warning', en_attente: 'badge-warning',
}

const STATUTS_DOSSIER = [
  { value: 'creation', label: 'En création' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'attente', label: "En attente de pièces" },
  { value: 'signe', label: 'Signé' },
  { value: 'accepte', label: 'Accepté (aides validées)' },
  { value: 'refuse', label: 'Refusé' },
]

export function DossiersPage() {
  const [rows, setRows] = useState<(Dossier & { prospect?: Prospect })[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newProspectId, setNewProspectId] = useState('')
  const [devisDuProspect, setDevisDuProspect] = useState<Devis[]>([])
  const [newDevisId, setNewDevisId] = useState('')
  const [creating, setCreating] = useState(false)

  const [detail, setDetail] = useState<(Dossier & { prospect?: Prospect }) | null>(null)
  const [pieces, setPieces] = useState<DocumentPiece[]>([])
  const [detailStatut, setDetailStatut] = useState('')
  const [savingStatut, setSavingStatut] = useState(false)
  const [uploadingPieceId, setUploadingPieceId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [addingPiece, setAddingPiece] = useState(false)
  const extraFileInputRef = useRef<HTMLInputElement>(null)

  function fetchListe() {
    setLoading(true)
    supabase
      .from('dossiers')
      .select('*, prospect:prospects(*)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setRows([]); setLoading(false); return }
        setRows((data || []) as any)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchListe()
    supabase.from('prospects').select('*').order('nom').then(({ data }) => setProspects((data || []) as Prospect[]))
  }, [])

  useEffect(() => {
    if (!newProspectId) { setDevisDuProspect([]); setNewDevisId(''); return }
    supabase.from('devis').select('*').eq('prospect_id', newProspectId).order('created_at', { ascending: false })
      .then(({ data }) => setDevisDuProspect((data || []) as Devis[]))
  }, [newProspectId])

  async function creerDossier() {
    if (!newProspectId) return
    setCreating(true)
    const devisChoisi = devisDuProspect.find(d => d.id === newDevisId) || null
    const { data, error } = await supabase.from('dossiers').insert({
      prospect_id: newProspectId,
      devis_id: devisChoisi?.id || null,
      visite_id: devisChoisi?.visite_id || null,
      reference: `DOS-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      statut: devisChoisi?.statut === 'signe' ? 'signe' : 'creation',
      montant_total: devisChoisi?.montant_ttc || 0,
      aides_montant: devisChoisi?.montant_aides || 0,
      reste_a_charge: devisChoisi?.reste_a_charge || 0,
    }).select('id').single()

    if (!error && data) {
      if (devisChoisi) {
        await supabase.from('devis').update({ dossier_id: data.id }).eq('id', devisChoisi.id)
      }
      await supabase.from('documents').insert([
        { dossier_id: data.id, prospect_id: newProspectId, nom: "Avis d'imposition N-2", type: 'avis_imposition', categorie: 'Administratif', recu: false },
        { dossier_id: data.id, prospect_id: newProspectId, nom: 'RIB', type: 'rib', categorie: 'Administratif', recu: false },
        { dossier_id: data.id, prospect_id: newProspectId, nom: 'Photos avant travaux', type: 'photos', categorie: 'Technique', recu: false },
      ])
      setNewModalOpen(false)
      setNewProspectId('')
      setNewDevisId('')
      fetchListe()
    }
    setCreating(false)
  }

  async function ouvrirDetail(d: Dossier & { prospect?: Prospect }) {
    setDetail(d)
    setDetailStatut(d.statut || 'creation')
    setUploadError('')
    const { data } = await supabase.from('documents').select('*').eq('dossier_id', d.id).order('created_at')
    setPieces((data || []) as DocumentPiece[])
  }

  async function uploaderPiece(piece: DocumentPiece, file: File | null) {
    if (!file || !detail) return
    setUploadingPieceId(piece.id)
    setUploadError('')
    try {
      const ext = file.name.split('.').pop() || 'bin'
      const path = `${detail.id}/${piece.id}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file, { cacheControl: '3600', upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      const { data, error } = await supabase.from('documents').update({
        url: urlData.publicUrl, taille: file.size, recu: true, nom: piece.nom,
      }).eq('id', piece.id).select('*').single()
      if (error) throw error
      if (data) setPieces(prev => prev.map(p => p.id === piece.id ? (data as DocumentPiece) : p))
    } catch (e: any) {
      setUploadError(`Échec de l'envoi de "${file.name}" : ${e?.message || 'erreur inconnue'}`)
    }
    setUploadingPieceId(null)
  }

  function retirerFichier(piece: DocumentPiece) {
    supabase.from('documents').update({ url: '', recu: false }).eq('id', piece.id).select('*').single()
      .then(({ data }) => { if (data) setPieces(prev => prev.map(p => p.id === piece.id ? (data as DocumentPiece) : p)) })
  }

  async function ajouterPieceLibre(files: FileList | null) {
    if (!files || files.length === 0 || !detail) return
    setAddingPiece(true)
    setUploadError('')
    for (const file of Array.from(files)) {
      const { error } = await uploadDocument(file, { dossierId: detail.id, type: 'autre' })
      if (error) setUploadError(`Échec de l'envoi de "${file.name}" : ${error}`)
    }
    const { data } = await supabase.from('documents').select('*').eq('dossier_id', detail.id).order('created_at')
    setPieces((data || []) as DocumentPiece[])
    setAddingPiece(false)
  }

  async function supprimerPieceLibre(piece: DocumentPiece) {
    if (!confirm(`Supprimer "${piece.nom}" ?`)) return
    await supabase.from('documents').delete().eq('id', piece.id)
    setPieces(prev => prev.filter(p => p.id !== piece.id))
  }

  async function enregistrerStatut() {
    if (!detail) return
    setSavingStatut(true)
    const { data } = await supabase.from('dossiers').update({ statut: detailStatut }).eq('id', detail.id).select('*, prospect:prospects(*)').single()
    setSavingStatut(false)
    if (data) {
      setDetail(data as any)
      setRows(prev => prev.map(r => r.id === detail.id ? (data as any) : r))
    }
  }

  const total = rows.length
  const enCours = rows.filter(d => {
    const s = (d.statut || '').toLowerCase()
    return s.includes('cours') || s === 'attente' || s === 'en_attente' || s === 'creation'
  }).length
  const signes = rows.filter(d => {
    const s = (d.statut || '').toLowerCase()
    return s === 'signe' || s === 'accepte'
  }).length
  const montantTotal = rows.reduce((sum, d) => sum + (Number(d.montant_total ?? (d as any).ca_potentiel) || 0), 0)

  const euro = (n: number | null | undefined) =>
    n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n) || 0) : '—'

  const badgeFor = (s: string) => STATUT_BADGE[(s || '').toLowerCase()] || 'badge-neutral'

  const kpis = [
    { icon: <FolderOpen size={20} />, value: total, label: 'Total dossiers', tone: 'blue' },
    { icon: <Clock size={20} />, value: enCours, label: 'En cours', tone: 'amber' },
    { icon: <CheckCircle2 size={20} />, value: signes, label: 'Signés', tone: 'green' },
    { icon: <Wallet size={20} />, value: euro(montantTotal), label: 'Montant total', tone: 'accent' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dossiers</h1>
          <p className="page-subtitle">Suivez vos dossiers de rénovation de la proposition à la signature</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => setNewModalOpen(true)}>
            <Plus size={18} /> Nouveau dossier
          </Button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map(k => (
          <div className="kpi-tile" key={k.label}>
            <div className="kpi-tile-top">
              <div className={`kpi-tile-icon ${k.tone}`}>{k.icon}</div>
            </div>
            <div className="kpi-tile-value">{k.value}</div>
            <div className="kpi-tile-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="card-pad text-muted">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={40} />
            <h3>Aucun dossier</h3>
            <p>Un dossier se crée automatiquement à la signature d'un devis, ou manuellement ici.</p>
            <Button variant="primary" onClick={() => setNewModalOpen(true)}>
              <Plus size={18} /> Nouveau dossier
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Référence</th><th>Prospect</th><th>Statut</th>
                  <th>Montant total</th><th>Aides</th><th>Reste à charge</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(d => (
                  <tr key={d.id} onClick={() => ouvrirDetail(d)} style={{ cursor: 'pointer' }}>
                    <td className="font-semibold">{d.reference || d.id.slice(0, 8)}</td>
                    <td>{d.prospect ? `${d.prospect.prenom} ${d.prospect.nom}` : '—'}</td>
                    <td><span className={`badge ${badgeFor(d.statut)}`}>{d.statut || '—'}</span></td>
                    <td>{euro(d.montant_total ?? (d as any).ca_potentiel)}</td>
                    <td>{euro(d.aides_montant)}</td>
                    <td>{euro(d.reste_a_charge)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Création manuelle d'un dossier */}
      <Modal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Nouveau dossier"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewModalOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={creerDossier} disabled={!newProspectId || creating}>
              {creating ? 'Création…' : 'Créer le dossier'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FloatSelect
            label="Prospect / client"
            value={newProspectId}
            onChange={setNewProspectId}
            options={prospects.map(p => ({ value: p.id, label: `${p.prenom} ${p.nom} — ${p.ville || ''}` }))}
          />
          {newProspectId && (
            <FloatSelect
              label="Devis à rattacher (optionnel)"
              value={newDevisId}
              onChange={setNewDevisId}
              options={[
                { value: '', label: 'Aucun devis pour le moment' },
                ...devisDuProspect.map(d => ({ value: d.id, label: `${d.numero} — ${d.statut}` })),
              ]}
            />
          )}
          <p className="text-sm text-muted">
            Le dossier ouvre automatiquement une checklist de pièces administratives
            (avis d'imposition, RIB, photos) à faire compléter par le client.
          </p>
        </div>
      </Modal>

      {/* Détail d'un dossier */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Dossier ${detail.reference || ''}` : ''}
        footer={<Button variant="ghost" onClick={() => setDetail(null)}>Fermer</Button>}
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-sm text-muted">Client</div>
              <div className="font-semibold">{detail.prospect ? `${detail.prospect.prenom} ${detail.prospect.nom}` : '—'}</div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="text-sm text-muted">Montant total</div>
                <div className="font-semibold">{euro(detail.montant_total)}</div>
              </div>
              <div>
                <div className="text-sm text-muted">Aides</div>
                <div className="font-semibold">{euro(detail.aides_montant)}</div>
              </div>
              <div>
                <div className="text-sm text-muted">Reste à charge</div>
                <div className="font-semibold">{euro(detail.reste_a_charge)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <FloatSelect label="Statut du dossier" value={detailStatut} onChange={setDetailStatut} options={STATUTS_DOSSIER} />
              </div>
              <Button variant="secondary" onClick={enregistrerStatut} disabled={savingStatut || detailStatut === detail.statut}>
                {savingStatut ? 'Enregistrement…' : 'Mettre à jour'}
              </Button>
            </div>

            <div>
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} /> Pièces à recueillir
              </div>
              {uploadError && (
                <div className="text-sm" style={{ color: 'var(--c-error)', marginTop: 6 }}>{uploadError}</div>
              )}
              {pieces.length === 0 ? (
                <p className="text-sm text-muted">Aucune pièce suivie pour ce dossier.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {pieces.map(p => {
                    const inputId = `piece-upload-${p.id}`
                    const isUploading = uploadingPieceId === p.id
                    return (
                      <div key={p.id} className="recap-card" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: 10 }}>
                        <span style={{ flex: 1, minWidth: 140 }}>{p.nom}</span>
                        {p.recu
                          ? <span className="badge badge-success"><Check size={12} /> Reçu</span>
                          : <span className="badge badge-neutral">Attendu</span>}
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noreferrer" className="btn-icon-sm" title="Voir le fichier">
                            <ExternalLink size={15} />
                          </a>
                        )}
                        <input
                          id={inputId} type="file" hidden
                          onChange={e => uploaderPiece(p, e.target.files?.[0] || null)}
                        />
                        <label htmlFor={inputId} className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                          {isUploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                          {isUploading ? 'Envoi…' : p.url ? 'Remplacer' : 'Envoyer'}
                        </label>
                        {p.url && (
                          <button className="btn-icon-sm" title="Retirer le fichier" onClick={() => retirerFichier(p)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                        {p.type === 'autre' && (
                          <button className="btn-icon-sm" title="Supprimer cette pièce" onClick={() => supprimerPieceLibre(p)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-3">
                <input ref={extraFileInputRef} type="file" multiple hidden onChange={e => ajouterPieceLibre(e.target.files)} />
                <Button variant="secondary" onClick={() => extraFileInputRef.current?.click()} disabled={addingPiece}>
                  {addingPiece ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                  {addingPiece ? 'Envoi…' : 'Ajouter une pièce'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
