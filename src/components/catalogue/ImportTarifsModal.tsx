import { useMemo, useState } from 'react'
import { FileSpreadsheet, ClipboardPaste, Check, AlertTriangle, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { lignesDepuisFeuille, lignesDepuisTexte, rapprocher, type LigneTarif, type ProduitTarif } from '../../lib/catalogue/importTarifs'
import './import-tarifs.css'

interface Props {
  open: boolean
  onClose: () => void
  produits: ProduitTarif[]
  prixAchat: Map<string, number>
  peutModifier: boolean
  onApplique: () => void
}

const euro = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
const SEUIL_ALERTE = 25

/** Mise à jour des prix d'achat depuis le tarif d'un fournisseur (Excel, CSV ou texte copié d'un PDF). */
export function ImportTarifsModal({ open, onClose, produits, prixAchat, peutModifier, onApplique }: Props) {
  const [mode, setMode] = useState<'fichier' | 'texte'>('fichier')
  const [nomFichier, setNomFichier] = useState('')
  const [texte, setTexte] = useState('')
  const [lignes, setLignes] = useState<LigneTarif[]>([])
  const [exclus, setExclus] = useState<Set<number>>(new Set())
  const [majVente, setMajVente] = useState(false)
  const [etat, setEtat] = useState<'' | 'lecture' | 'application'>('')
  const [message, setMessage] = useState<{ ok: boolean; t: string } | null>(null)

  const actifs = useMemo(() => produits.filter(p => p.actif !== false), [produits])
  const resultats = useMemo(() => rapprocher(lignes, actifs, prixAchat), [lignes, actifs, prixAchat])
  const trouves = resultats.map((r, i) => ({ ...r, i })).filter(r => r.produit)
  const nonTrouves = resultats.filter(r => !r.produit)
  const retenus = trouves.filter(r => !exclus.has(r.i) && Math.abs(r.ligne.prix - r.ancien) >= 0.005)
  const hausses = retenus.filter(r => r.ecartPct !== null && r.ecartPct > 0).length
  const baisses = retenus.filter(r => r.ecartPct !== null && r.ecartPct < 0).length

  function reinitialiser(l: LigneTarif[]) {
    setLignes(l); setMessage(null)
    // Les écarts très importants sont décochés par défaut : souvent une erreur d'unité ou de colonne.
    const r = rapprocher(l, actifs, prixAchat)
    setExclus(new Set(r.map((x, i) => (x.ecartPct !== null && Math.abs(x.ecartPct) > 60 ? i : -1)).filter(i => i > -1)))
  }

  async function lireFichier(f: File) {
    setEtat('lecture'); setNomFichier(f.name); setMessage(null)
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' })
      let meilleur: LigneTarif[] = []
      for (const nom of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nom], { header: 1, raw: true, defval: '' })
        const { lignes: l } = lignesDepuisFeuille(rows)
        if (l.length > meilleur.length) meilleur = l
      }
      reinitialiser(meilleur)
      if (!meilleur.length) setMessage({ ok: false, t: 'Aucune colonne « référence » et « prix » reconnue dans ce fichier.' })
    } catch {
      setMessage({ ok: false, t: 'Fichier illisible. Formats acceptés : .xlsx, .xls, .csv.' })
    } finally { setEtat('') }
  }

  function analyserTexte() {
    const l = lignesDepuisTexte(texte, actifs)
    reinitialiser(l)
    if (!l.length) setMessage({ ok: false, t: 'Aucune référence du catalogue trouvée dans le texte collé.' })
  }

  async function appliquer() {
    if (!retenus.length) return
    setEtat('application'); setMessage(null)
    const { data, error } = await supabase.rpc('maj_prix_achat', {
      p_lignes: retenus.map(r => ({ id: r.produit!.id, prix_achat_ht: r.ligne.prix })),
      p_appliquer_vente: majVente,
    })
    setEtat('')
    if (error) { setMessage({ ok: false, t: error.message }); return }
    setMessage({ ok: true, t: `${data ?? retenus.length} prix d’achat mis à jour. Prix conseillés et planchers recalculés${majVente ? ', prix de vente alignés' : ''}.` })
    setLignes([]); setExclus(new Set())
    onApplique()
  }

  const basculer = (i: number) => setExclus(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })

  return (
    <Modal open={open} onClose={onClose} title="Importer un tarif fournisseur" width={860}>
      <div className="it">
        <div className="it-modes" role="tablist">
          <button role="tab" aria-selected={mode === 'fichier'} className={mode === 'fichier' ? 'on' : ''} onClick={() => setMode('fichier')}><FileSpreadsheet size={16} /> Fichier Excel ou CSV</button>
          <button role="tab" aria-selected={mode === 'texte'} className={mode === 'texte' ? 'on' : ''} onClick={() => setMode('texte')}><ClipboardPaste size={16} /> Copier-coller depuis un PDF</button>
        </div>

        {mode === 'fichier' ? (
          <label className="it-depot">
            <input type="file" accept=".xlsx,.xls,.csv,.ods" onChange={e => { const f = e.target.files?.[0]; if (f) void lireFichier(f); e.target.value = '' }} />
            <Upload size={22} />
            <b>{etat === 'lecture' ? 'Lecture…' : nomFichier || 'Choisir le tarif du fournisseur'}</b>
            <small>Colonnes reconnues automatiquement : référence (ou code article), désignation, prix net / prix d’achat HT.</small>
          </label>
        ) : (
          <div className="it-texte">
            <textarea rows={6} value={texte} onChange={e => setTexte(e.target.value)} placeholder={'Ouvrez le PDF du fournisseur, sélectionnez le tableau, copiez puis collez ici.\nChaque ligne contenant une référence de votre catalogue et un prix sera reprise.'} />
            <Button variant="secondary" onClick={analyserTexte} disabled={!texte.trim()}>Analyser le texte</Button>
          </div>
        )}

        {message && <p className={`it-message ${message.ok ? 'ok' : 'ko'}`} role="status">{message.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {message.t}</p>}

        {lignes.length > 0 && (
          <>
            <div className="it-bilan">
              <div><b>{lignes.length}</b><span>lignes lues</span></div>
              <div><b>{trouves.length}</b><span>produits reconnus</span></div>
              <div><b className="hausse">{hausses}</b><span>hausses</span></div>
              <div><b className="baisse">{baisses}</b><span>baisses</span></div>
            </div>

            {trouves.length > 0 && (
              <div className="it-table" role="table">
                <div className="it-ligne tete" role="row"><span /><span>Produit</span><span>Achat actuel</span><span>Nouveau</span><span>Écart</span></div>
                {trouves.map(r => {
                  const identique = Math.abs(r.ligne.prix - r.ancien) < 0.005
                  const fort = r.ecartPct !== null && Math.abs(r.ecartPct) > SEUIL_ALERTE
                  return (
                    <label key={r.i} className={`it-ligne ${exclus.has(r.i) || identique ? 'off' : ''}`} role="row">
                      <input type="checkbox" checked={!exclus.has(r.i) && !identique} disabled={identique} onChange={() => basculer(r.i)} aria-label={`Mettre à jour ${r.produit!.nom}`} />
                      <span className="it-produit"><b>{r.produit!.nom}</b><small>{[r.produit!.marque, r.produit!.reference].filter(Boolean).join(' · ')}{r.methode === 'designation' ? ' · reconnu par la désignation' : ''}</small></span>
                      <span className="num">{r.ancien > 0 ? euro(r.ancien) : '—'}</span>
                      <span className="num"><b>{euro(r.ligne.prix)}</b></span>
                      <span className={`num ecart ${r.ecartPct === null ? '' : r.ecartPct > 0 ? 'hausse' : r.ecartPct < 0 ? 'baisse' : ''} ${fort ? 'fort' : ''}`}>
                        {identique ? 'inchangé' : r.ecartPct === null ? 'nouveau' : `${r.ecartPct > 0 ? '+' : ''}${r.ecartPct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`}
                        {fort && <AlertTriangle size={13} aria-label="Écart important : vérifiez l’unité" />}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}

            {nonTrouves.length > 0 && (
              <details className="it-inconnus">
                <summary>{nonTrouves.length} ligne{nonTrouves.length > 1 ? 's' : ''} sans produit correspondant dans le catalogue</summary>
                <ul>{nonTrouves.slice(0, 50).map((r, k) => <li key={k}><code>{r.ligne.reference || '—'}</code> {r.ligne.designation} <span className="num">{euro(r.ligne.prix)}</span></li>)}</ul>
                <p className="note">Vérifiez que la référence fabricant est bien renseignée sur la fiche produit.</p>
              </details>
            )}

            {peutModifier ? (
              <div className="it-pied">
                <label className="it-option"><input type="checkbox" checked={majVente} onChange={e => setMajVente(e.target.checked)} /> Aligner aussi le prix de vente sur le nouveau prix conseillé</label>
                <Button variant="primary" onClick={() => void appliquer()} disabled={!retenus.length || !!etat}>
                  {etat === 'application' ? 'Mise à jour…' : `Mettre à jour ${retenus.length} prix d’achat`}
                </Button>
              </div>
            ) : <p className="note">Seul un administrateur peut appliquer un tarif fournisseur.</p>}
            <p className="note">Le prix conseillé et le prix plancher suivent la règle de tarification de chaque catégorie. Les devis déjà envoyés ne changent pas.</p>
          </>
        )}
      </div>
    </Modal>
  )
}
