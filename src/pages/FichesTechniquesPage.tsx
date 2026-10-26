import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Download, ExternalLink, FileText, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import { uploadDocument } from '../lib/storage/uploadDocument'
import type { Document, Produit } from '../types'

type Cible = 'particulier' | 'professionnel'
type Famille = 'technique' | 'cee'
const CATEGORIE: Record<Famille, Record<Cible, string>> = {
  technique: {
    particulier: 'Fiche technique — Particuliers',
    professionnel: 'Fiche technique — Professionnels',
  },
  cee: {
    particulier: 'Fiche CEE — Particuliers',
    professionnel: 'Fiche CEE — Professionnels',
  },
}

export function FichesTechniquesPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'
  const [docs, setDocs] = useState<(Document & { produit?: Produit | null })[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [cible, setCible] = useState<Cible>('particulier')
  const [famille, setFamille] = useState<Famille>('technique')
  const [produitId, setProduitId] = useState('')
  const [recherche, setRecherche] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const [{ data: documents, error: docError }, { data: catalogue, error: produitError }] = await Promise.all([
      supabase.from('documents').select('id, nom, categorie, produit_id, url, created_at, produit:catalogue_produits(id, nom, marque, reference, fiche_cee)')
        .in('categorie', Object.values(CATEGORIE).flat()).order('created_at', { ascending: false }),
      supabase.from('catalogue_produits').select('id, nom, marque, reference, fiche_cee, catalogue_groupe, public_cible, actif').eq('actif', true).order('nom'),
    ])
    if (docError) setError(`Lecture des fiches impossible : ${docError.message}`)
    else setDocs((documents || []) as any)
    if (produitError) setError(`Lecture du catalogue impossible : ${produitError.message}`)
    else setProduits((catalogue || []) as Produit[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const produitsFiltres = useMemo(() => produits.filter(p =>
    p.catalogue_groupe !== 'visite_technique' && (p.catalogue_groupe === cible || (!p.catalogue_groupe && (p.public_cible === cible || p.public_cible === 'tous' || !p.public_cible)))
  ), [produits, cible])

  useEffect(() => {
    if (produitId && !produitsFiltres.some(p => p.id === produitId)) setProduitId('')
  }, [produitId, produitsFiltres])

  const visibles = docs.filter(d =>
    d.categorie === CATEGORIE[famille][cible] &&
    (!produitId || d.produit_id === produitId) &&
    `${d.nom} ${d.produit?.nom || ''} ${d.produit?.marque || ''} ${d.produit?.reference || ''} ${d.produit?.fiche_cee || ''}`
      .toLowerCase().includes(recherche.toLowerCase())
  )

  async function ajouterFiche(file?: File) {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Seuls les fichiers PDF sont acceptés.')
      return
    }
    if (!produitId) {
      setError('Sélectionnez le produit auquel rattacher cette fiche.')
      return
    }
    setUploading(true)
    setError('')
    const { error: uploadError } = await uploadDocument(file, {
      categorie: CATEGORIE[famille][cible],
      produitId,
      type: 'pdf',
    })
    if (uploadError) setError(`Import impossible : ${uploadError}`)
    else await load()
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function supprimer(doc: Document) {
    if (!isAdmin || !confirm(`Supprimer la fiche « ${doc.nom} » ?`)) return
    const { error: deleteError } = await supabase.from('documents').delete().eq('id', doc.id)
    if (deleteError) setError(deleteError.message)
    else setDocs(old => old.filter(d => d.id !== doc.id))
  }

  return <div className="page">
    <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
      <div><h1 className="page-title">Fiches techniques</h1><p className="text-muted">Documents PDF associés à un produit du catalogue.</p></div>
      {isAdmin && <button className="btn btn-primary" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 size={16} className="spin" /> : <Plus size={16}/>} Ajouter un PDF
      </button>}
      <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onChange={e => void ajouterFiche(e.target.files?.[0])}/>
    </div>

    <div className="card card-pad" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,marginBottom:16}}>
      <label className="field"><span className="field-label">Public cible</span><select className="input" value={cible} onChange={e=>{setCible(e.target.value as Cible);setProduitId('')}}>
        <option value="particulier">Particuliers</option><option value="professionnel">Professionnels</option>
      </select></label>
      <label className="field"><span className="field-label">Type de document</span><select className="input" value={famille} onChange={e=>setFamille(e.target.value as Famille)}>
        <option value="technique">Fiches techniques produits</option><option value="cee">Fiches d'opérations CEE</option>
      </select></label>
      <label className="field"><span className="field-label">Produit / opération</span><select className="input" value={produitId} onChange={e=>setProduitId(e.target.value)}>
        <option value="">Tous les produits</option>{produitsFiltres.map(p=><option key={p.id} value={p.id}>{p.nom}{p.fiche_cee ? ` — ${p.fiche_cee}` : ''}</option>)}
      </select></label>
      <label className="field"><span className="field-label">Rechercher</span><div style={{position:'relative'}}><Search size={15} style={{position:'absolute',left:10,top:12}}/><input className="input" style={{paddingLeft:32}} value={recherche} onChange={e=>setRecherche(e.target.value)} placeholder="Nom, marque, référence…"/></div></label>
    </div>

    {isAdmin && <div className="card card-pad" style={{marginBottom:16,fontSize:13}}>
      <strong>Ajouter une fiche</strong>
      <p className="text-muted" style={{margin:'6px 0 10px'}}>Choisissez le public, le type de document et le produit ci-dessus, puis cliquez sur « Ajouter un PDF ». Les fiches CEE doivent correspondre à la référence et à la version applicables.</p>
    </div>}
    {error && <div className="alert alert-error" style={{marginBottom:12}}>{error}</div>}
    {loading ? <div className="card card-pad"><Loader2 className="spin"/> Chargement…</div> : visibles.length === 0 ?
      <div className="card card-pad" style={{textAlign:'center',padding:40}}><BookOpen size={28}/><h3>Aucune fiche dans cette catégorie</h3><p className="text-muted">Importez un PDF et associez-le à un produit du bon public cible.</p></div> :
      <div className="card"><div style={{display:'grid',gridTemplateColumns:'minmax(220px,1.5fr) minmax(180px,1fr) 130px 110px',gap:12,padding:'12px 16px',fontWeight:700,borderBottom:'1px solid var(--c-border)'}}>
        <span>Document</span><span>Produit associé</span><span>Catégorie</span><span>Actions</span></div>
        {visibles.map(d=><div key={d.id} style={{display:'grid',gridTemplateColumns:'minmax(220px,1.5fr) minmax(180px,1fr) 130px 110px',gap:12,alignItems:'center',padding:'12px 16px',borderBottom:'1px solid var(--c-border)'}}>
          <div style={{display:'flex',gap:10,alignItems:'center',minWidth:0}}><FileText size={20}/><div style={{minWidth:0}}><strong style={{display:'block',overflowWrap:'anywhere'}}>{d.nom}</strong><span className="text-muted text-xs">{new Date(d.created_at).toLocaleDateString('fr-FR')}</span></div></div>
          <div>{d.produit?.nom || 'Produit non renseigné'}<div className="text-muted text-xs">{d.produit?.marque} {d.produit?.reference} {d.produit?.fiche_cee ? `· ${d.produit.fiche_cee}` : ''}</div></div>
          <span className="badge badge-neutral">{cible === 'professionnel' ? 'PRO' : 'PARTICULIER'}</span>
          <div style={{display:'flex',gap:8}}>{d.url && <a href={d.url} target="_blank" rel="noreferrer" title="Ouvrir le PDF"><ExternalLink size={17}/></a>}{d.url && <a href={d.url} download title="Télécharger"><Download size={17}/></a>}{isAdmin && <button className="btn-icon-sm" onClick={()=>void supprimer(d)} title="Supprimer"><Trash2 size={16}/></button>}</div>
        </div>)}
      </div>}
  </div>
}
