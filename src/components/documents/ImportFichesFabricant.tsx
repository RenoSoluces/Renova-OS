import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, FolderOpen, HelpCircle, Loader2, Upload, X } from 'lucide-react'
import { uploadDocument } from '../../lib/storage/uploadDocument'
import { extraireFiche } from '../../lib/devis/conformite'
import { normaliser, rattacherFichiers, type Confiance, type ProduitRattachable } from '../../lib/documents/rattacherFiches'

interface ProduitCatalogue extends ProduitRattachable {
  catalogue_groupe?: string | null
  public_cible?: string | null
}

interface Ligne {
  file: File
  confiance: Confiance
  candidats: ProduitCatalogue[]
  /** Produits retenus pour cette fiche. */
  retenus: string[]
  recherche: string
  /** Fiche d'opération officielle (BAR-TH-171…) reconnue dans le nom du fichier : rattachée à l'opération, pas à un produit. */
  operation?: string
}

const categorie = (p?: ProduitCatalogue) =>
  (p?.catalogue_groupe || p?.public_cible) === 'professionnel' ? 'Fiche technique — Professionnels' : 'Fiche technique — Particuliers'

const ETIQUETTE: Record<Confiance, { texte: string; classe: string }> = {
  sur: { texte: 'Référence reconnue', classe: 'badge badge-success' },
  probable: { texte: 'À vérifier', classe: 'badge badge-warning' },
  aucun: { texte: 'Non reconnu', classe: 'badge badge-neutral' },
}

/** Import en masse de fiches fabricant : rattachement automatique par référence, validation avant envoi. */
export function ImportFichesFabricant({ produits, onFermer, onTermine }: { produits: ProduitCatalogue[]; onFermer: () => void; onTermine: () => void }) {
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [envoi, setEnvoi] = useState<{ fait: number; total: number } | null>(null)
  const [bilan, setBilan] = useState('')
  const [erreurs, setErreurs] = useState<string[]>([])
  const fichiersRef = useRef<HTMLInputElement>(null)
  const dossierRef = useRef<HTMLInputElement>(null)
  const parId = useMemo(() => new Map(produits.map(p => [p.id, p])), [produits])

  function choisir(liste: FileList | null) {
    const pdfs = [...(liste || [])].filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (!pdfs.length) return
    const rattaches = rattacherFichiers(pdfs.map(f => f.name), produits)
    setLignes(ancien => {
      const deja = new Set(ancien.map(l => `${l.file.name}|${l.file.size}`))
      const nouvelles = pdfs.map((file, i): Ligne => ({
        operation: extraireFiche(file.name) || undefined,
        file, confiance: extraireFiche(file.name) ? 'sur' : rattaches[i].confiance, candidats: extraireFiche(file.name) ? [] : rattaches[i].produits,
        // Seule une référence exacte est cochée d'office ; le reste attend un choix explicite.
        retenus: !extraireFiche(file.name) && rattaches[i].confiance === 'sur' ? rattaches[i].produits.map(p => p.id) : [], recherche: '',
      })).filter(l => !deja.has(`${l.file.name}|${l.file.size}`))
      return [...ancien, ...nouvelles]
    })
    setBilan(''); setErreurs([])
  }

  const maj = (i: number, patch: Partial<Ligne>) => setLignes(l => l.map((x, j) => j === i ? { ...x, ...patch } : x))
  const bascule = (i: number, id: string) => setLignes(l => l.map((x, j) => j !== i ? x : { ...x, retenus: x.retenus.includes(id) ? x.retenus.filter(r => r !== id) : [...x.retenus, id] }))
  const retirer = (i: number) => setLignes(l => l.filter((_, j) => j !== i))

  function proposes(l: Ligne): ProduitCatalogue[] {
    const q = normaliser(l.recherche)
    if (q.length >= 2) return produits.filter(p => normaliser(`${p.marque ?? ''} ${p.nom} ${p.reference ?? ''}`).includes(q)).slice(0, 8)
    return l.candidats
  }

  const aEnvoyer = lignes.filter(l => l.operation || l.retenus.length > 0)
  const compte = { sur: lignes.filter(l => l.confiance === 'sur').length, probable: lignes.filter(l => l.confiance === 'probable').length, aucun: lignes.filter(l => l.confiance === 'aucun').length }

  async function valider() {
    const taches = aEnvoyer.flatMap(l => l.operation ? [{ l, produit: undefined as ProduitCatalogue | undefined }] : l.retenus.map(id => ({ l, produit: parId.get(id) })).filter(t => t.produit))
    setEnvoi({ fait: 0, total: taches.length }); setErreurs([]); setBilan('')
    const echecs: string[] = []
    let ok = 0
    for (const [i, t] of taches.entries()) {
      const cible = t.l.operation
        ? { categorie: t.l.operation.startsWith('BAT') ? 'Fiche CEE — Professionnels' : 'Fiche CEE — Particuliers', produitId: null as string | null }
        : { categorie: categorie(t.produit), produitId: t.produit!.id }
      const { error } = await uploadDocument(t.l.file, { categorie: cible.categorie, produitId: cible.produitId, type: 'pdf' })
      const libelle = t.l.operation || t.produit!.nom
      if (error) echecs.push(`${t.l.file.name} → ${libelle} : ${error}`); else ok++
      setEnvoi({ fait: i + 1, total: taches.length })
    }
    setEnvoi(null)
    setErreurs(echecs)
    setBilan(`${ok} fiche${ok > 1 ? 's' : ''} rattachée${ok > 1 ? 's' : ''}${echecs.length ? `, ${echecs.length} en échec` : ''}.`)
    // Les fiches envoyées disparaissent de la liste ; celles en échec ou non rattachées restent.
    const reussies = new Set(taches.filter(t => !echecs.some(e => e.startsWith(`${t.l.file.name} → ${t.l.operation || t.produit!.nom}`))).map(t => t.l.file))
    setLignes(l => l.filter(x => !reussies.has(x.file)))
    onTermine()
  }

  return <div className="modal-overlay" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget && !envoi) onFermer() }}>
    <div className="modal" style={{ maxWidth: 900, width: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Importer des fiches fabricant</h2>
        <button className="btn-icon-sm" onClick={onFermer} disabled={!!envoi} title="Fermer"><X size={18} /></button>
      </div>
      <p className="text-muted" style={{ fontSize: 13, marginTop: 0 }}>
        Sélectionnez plusieurs PDF (ou un dossier entier). Chaque fichier est rattaché au produit dont la référence correspond au nom du fichier, par exemple <code>520559.pdf</code>. Un fichier dont le nom contient un code d'opération (<code>BAR-TH-171 vA…pdf</code>) est classé comme fiche officielle de cette opération CEE.
        Vous validez avant l'envoi : seules les références exactes sont cochées d'office.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => fichiersRef.current?.click()} disabled={!!envoi}><Upload size={16} /> Choisir des PDF</button>
        <button className="btn btn-secondary" onClick={() => dossierRef.current?.click()} disabled={!!envoi}><FolderOpen size={16} /> Choisir un dossier</button>
        <input ref={fichiersRef} hidden type="file" multiple accept="application/pdf,.pdf" onChange={e => { choisir(e.target.files); e.target.value = '' }} />
        <input ref={dossierRef} hidden type="file" multiple {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} onChange={e => { choisir(e.target.files); e.target.value = '' }} />
      </div>

      {lignes.length > 0 && <div style={{ fontSize: 13, marginBottom: 8 }}>
        {lignes.length} fichier{lignes.length > 1 ? 's' : ''} : <strong>{compte.sur}</strong> reconnu{compte.sur > 1 ? 's' : ''}, <strong>{compte.probable}</strong> à vérifier, <strong>{compte.aucun}</strong> non reconnu{compte.aucun > 1 ? 's' : ''}.
      </div>}

      <div style={{ overflowY: 'auto', flex: 1, minHeight: 80, border: lignes.length ? '1px solid var(--c-border)' : 'none', borderRadius: 10 }}>
        {lignes.map((l, i) => <div key={`${l.file.name}-${l.file.size}-${i}`} style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <strong style={{ overflowWrap: 'anywhere' }}>{l.file.name}</strong>{' '}
              {l.operation ? <span className="badge badge-success">Fiche officielle {l.operation}</span> : <span className={ETIQUETTE[l.confiance].classe}>{ETIQUETTE[l.confiance].texte}</span>}
            </div>
            <button className="btn-icon-sm" onClick={() => retirer(i)} title="Retirer de la liste"><X size={15} /></button>
          </div>
          {!l.operation && <div style={{ marginTop: 6 }}>
            {proposes(l).map(p => <label key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, padding: '2px 0' }}>
              <input type="checkbox" checked={l.retenus.includes(p.id)} onChange={() => bascule(i, p.id)} style={{ marginTop: 3 }} />
              <span>{p.nom}<span className="text-muted"> · {p.marque} {p.reference}</span></span>
            </label>)}
            {l.retenus.filter(id => !proposes(l).some(p => p.id === id)).map(id => <div key={id} className="text-muted" style={{ fontSize: 12 }}>+ {parId.get(id)?.nom}</div>)}
            <input className="input" style={{ marginTop: 6, maxWidth: 360 }} placeholder={l.confiance === 'sur' ? 'Ajouter un autre produit…' : 'Rechercher le produit (nom, marque, référence)…'} value={l.recherche} onChange={e => maj(i, { recherche: e.target.value })} />
          </div>}
        </div>)}
        {lignes.length === 0 && <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}><HelpCircle size={22} /><div>Aucun fichier sélectionné.</div></div>}
      </div>

      {bilan && <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--c-primary-50)', color: 'var(--c-primary-600)', display: 'flex', gap: 6, alignItems: 'center' }}><CheckCircle2 size={15} /> {bilan}</div>}
      {erreurs.length > 0 && <div className="alert alert-error" style={{ marginTop: 10, maxHeight: 100, overflowY: 'auto', fontSize: 12 }}>{erreurs.map(e => <div key={e}>{e}</div>)}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <span className="text-muted" style={{ fontSize: 13 }}>{envoi ? `Envoi ${envoi.fait}/${envoi.total}…` : `${aEnvoyer.length} fiche${aEnvoyer.length > 1 ? 's' : ''} prête${aEnvoyer.length > 1 ? 's' : ''} à rattacher`}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onFermer} disabled={!!envoi}>Fermer</button>
          <button className="btn btn-primary" onClick={() => void valider()} disabled={!!envoi || aEnvoyer.length === 0}>
            {envoi ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} Rattacher {aEnvoyer.length || ''}
          </button>
        </div>
      </div>
    </div>
  </div>
}
