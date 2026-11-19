import { useEffect, useRef, useState } from 'react'
import { Download, Eye, EyeOff, FileText, KeyRound, Trash2, UploadCloud } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadDocument } from '../../lib/storage/uploadDocument'
import { removeDocumentStorageObject } from '../../lib/storage/documentUrl'

export const PREFIXE_PIECE_CLIENT = 'Pièce client'

export const PIECES_CLIENT = [
  { code: 'avis_impots', label: "Avis d'impôts" },
  { code: 'taxe_fonciere', label: 'Taxe foncière' },
  { code: 'piece_identite', label: "Pièce d'identité" },
  { code: 'facture_energie', label: "Facture d'énergie" },
] as const

export const categoriePiece = (label: string) => `${PREFIXE_PIECE_CLIENT} — ${label}`
export const estPieceClient = (categorie?: string | null) => !!categorie && categorie.startsWith(PREFIXE_PIECE_CLIENT)

interface Props {
  prospectId: string
  documents: any[]
  onChange: () => void | Promise<void>
}

export function PiecesClient({ prospectId, documents, onChange }: Props) {
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null)
  const [identifiant, setIdentifiant] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [afficher, setAfficher] = useState(false)
  const [mprMaj, setMprMaj] = useState<string | null>(null)
  const [mprMessage, setMprMessage] = useState('')
  const [mprEnregistrement, setMprEnregistrement] = useState(false)
  const [mprModifie, setMprModifie] = useState(false)

  useEffect(() => {
    let annule = false
    setIdentifiant(''); setMotDePasse(''); setAfficher(false); setMprMaj(null); setMprMessage(''); setMprModifie(false)
    void (async () => {
      const { data, error } = await supabase.rpc('lire_acces_mpr', { p_prospect_id: prospectId })
      if (annule) return
      if (error) { setMprMessage(error.message); return }
      const ligne = Array.isArray(data) ? data[0] : data
      if (ligne) {
        setIdentifiant(ligne.identifiant || '')
        setMotDePasse(ligne.mot_de_passe || '')
        setMprMaj(ligne.updated_at || null)
      }
    })()
    return () => { annule = true }
  }, [prospectId])

  const piecesDe = (label: string) => documents.filter(d => d.categorie === categoriePiece(label))

  async function envoyer(label: string, files: FileList | null) {
    if (!files || files.length === 0) return
    setEnvoiEnCours(label)
    for (const file of Array.from(files)) {
      const { error } = await uploadDocument(file, { prospectId, type: 'piece_client', categorie: categoriePiece(label) })
      if (error) window.alert(`Impossible d'ajouter « ${file.name} » : ${error}`)
    }
    await onChange()
    setEnvoiEnCours(null)
    const champ = inputs.current[label]
    if (champ) champ.value = ''
  }

  async function supprimer(doc: any) {
    if (!window.confirm(`Supprimer « ${doc.nom} » ? Cette action est définitive.`)) return
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) { window.alert(`Suppression impossible : ${error.message}`); return }
    await removeDocumentStorageObject(doc.url)
    await onChange()
  }

  async function enregistrerMpr() {
    setMprEnregistrement(true)
    setMprMessage('')
    const { error } = await supabase.rpc('definir_acces_mpr', { p_prospect_id: prospectId, p_identifiant: identifiant, p_mot_de_passe: motDePasse })
    setMprEnregistrement(false)
    if (error) { setMprMessage(`Enregistrement impossible : ${error.message}`); return }
    setMprModifie(false)
    setMprMaj(new Date().toISOString())
    setMprMessage('Accès MPR enregistrés.')
  }

  return (
    <div className="detail-section-card">
      <div className="detail-section-top">
        <div>
          <div className="detail-etape-row"><span className="detail-etape-label">Pièces du client</span></div>
          <div className="detail-section-heading">Documents du dossier</div>
          <div className="detail-section-subdesc">Avis d’impôts, taxe foncière, pièce d’identité, facture d’énergie et accès MaPrimeRénov.</div>
        </div>
      </div>

      <div className="detail-info-card">
        <div className="detail-info-inner">
          {PIECES_CLIENT.map(p => {
            const liste = piecesDe(p.label)
            return (
              <div className="detail-info-row piece-client-row" key={p.code}>
                <span className="detail-info-key" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={15} /> {p.label}
                  <span className={`badge ${liste.length ? 'badge-success' : 'badge-neutral'}`}>{liste.length ? (liste.length > 1 ? `${liste.length} fichiers` : 'Reçu') : 'Manquant'}</span>
                </span>
                <span className="detail-info-val piece-client-actions">
                  {liste.map(doc => (
                    <span key={doc.id} className="piece-client-fichier">
                      <span className="text-xs text-muted">{doc.nom} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                      {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" title="Ouvrir"><Download size={14} /></a>}
                      <button type="button" className="btn btn-ghost btn-sm" title="Supprimer" onClick={() => void supprimer(doc)}><Trash2 size={14} /></button>
                    </span>
                  ))}
                  <input
                    ref={el => { inputs.current[p.label] = el }}
                    type="file" hidden multiple
                    accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
                    onChange={e => void envoyer(p.label, e.target.files)}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" disabled={envoiEnCours === p.label} onClick={() => inputs.current[p.label]?.click()}>
                    <UploadCloud size={14} /> {envoiEnCours === p.label ? 'Envoi…' : liste.length ? 'Ajouter' : 'Téléverser'}
                  </button>
                </span>
              </div>
            )
          })}

          <div className="detail-info-row piece-client-mpr">
            <span className="detail-info-key" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={15} /> Accès compte MPR
              <span className={`badge ${identifiant || motDePasse ? 'badge-success' : 'badge-neutral'}`}>{identifiant || motDePasse ? 'Renseigné' : 'Manquant'}</span>
            </span>
            <span className="detail-info-val piece-client-mpr-champs">
              <input className="input" placeholder="Identifiant (e-mail)" autoComplete="off" value={identifiant} onChange={e => { setIdentifiant(e.target.value); setMprModifie(true) }} />
              <span className="piece-client-mdp">
                <input className="input" placeholder="Mot de passe" autoComplete="new-password" type={afficher ? 'text' : 'password'} value={motDePasse} onChange={e => { setMotDePasse(e.target.value); setMprModifie(true) }} />
                <button type="button" className="btn btn-ghost btn-sm" title={afficher ? 'Masquer' : 'Afficher'} onClick={() => setAfficher(v => !v)}>{afficher ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              </span>
              <button type="button" className="btn btn-primary btn-sm" disabled={!mprModifie || mprEnregistrement} onClick={() => void enregistrerMpr()}>
                {mprEnregistrement ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </span>
          </div>
          <div className="text-xs text-muted" style={{ padding: '6px 2px 0' }}>
            {mprMessage || (mprMaj ? `Mot de passe chiffré — dernière mise à jour le ${new Date(mprMaj).toLocaleDateString('fr-FR')}.` : 'Le mot de passe est chiffré dans la base et visible uniquement des personnes ayant accès à ce prospect.')}
          </div>
        </div>
      </div>
    </div>
  )
}
