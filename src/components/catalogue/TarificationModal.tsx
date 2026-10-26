import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Calculator, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { totalConsommables, type Consommable } from '../../lib/devis/rentabilite'
import type { Produit } from '../../types'

export interface RegleTarifaire {
  categorie: string
  coef_fourniture: number
  pose_defaut_ht: number
  depose_defaut_ht: number
  consommables: Consommable[]
  marge_min_pct: number
  notes: string
  updated_at?: string
}

interface Props {
  open: boolean
  onClose: () => void
  /** Produits du catalogue (pour l'aperçu) et prix d'achat par produit (lus par fonction réservée). */
  produits: Produit[]
  prixAchat: Map<string, number>
  libelles: Record<string, string>
  peutModifier: boolean
  onApplique: () => void
}

const euro = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const pct = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`

/** Règles de prix par catégorie : coefficient sur le prix d'achat, pose, dépose, consommables et marge minimale. */
export function TarificationModal({ open, onClose, produits, prixAchat, libelles, peutModifier, onApplique }: Props) {
  const [regles, setRegles] = useState<RegleTarifaire[]>([])
  const [selection, setSelection] = useState<string>('')
  const [brouillon, setBrouillon] = useState<RegleTarifaire | null>(null)
  const [etat, setEtat] = useState<'' | 'enregistrement' | 'application'>('')
  const [message, setMessage] = useState('')

  async function charger() {
    const { data } = await supabase.from('regles_tarifaires').select('*').order('categorie')
    const liste = (data || []).map(r => ({ ...r, consommables: Array.isArray(r.consommables) ? r.consommables : [] })) as RegleTarifaire[]
    setRegles(liste)
    setSelection(s => s || liste[0]?.categorie || '')
  }
  useEffect(() => { if (open) { setMessage(''); void charger() } }, [open])
  useEffect(() => {
    const r = regles.find(x => x.categorie === selection)
    setBrouillon(r ? { ...r, consommables: r.consommables.map(c => ({ ...c })) } : null)
  }, [selection, regles])

  const actifs = useMemo(() => produits.filter(p => p.actif), [produits])
  const apercu = useMemo(() => {
    if (!brouillon) return null
    const liste = actifs.filter(p => p.categorie === brouillon.categorie)
    let avant = 0, apres = 0, achat = 0, n = 0
    for (const p of liste) {
      const a = prixAchat.get(p.id) || 0
      if (a <= 0) continue
      n++; achat += a; avant += Number(p.prix_unitaire_ht) || 0; apres += Math.round(a * brouillon.coef_fourniture)
    }
    return {
      total: liste.length, avecAchat: n,
      margeAvant: avant > 0 ? ((avant - achat) / avant) * 100 : 0,
      margeApres: apres > 0 ? ((apres - achat) / apres) * 100 : 0,
      exemple: liste.find(p => (prixAchat.get(p.id) || 0) > 0),
    }
  }, [brouillon, actifs, prixAchat])

  const modifie = brouillon && JSON.stringify(brouillon) !== JSON.stringify(regles.find(r => r.categorie === brouillon.categorie))
  const maj = (patch: Partial<RegleTarifaire>) => setBrouillon(b => b ? { ...b, ...patch } : b)
  const majConso = (i: number, patch: Partial<Consommable>) => setBrouillon(b => b ? { ...b, consommables: b.consommables.map((c, idx) => idx === i ? { ...c, ...patch } : c) } : b)

  async function enregistrer(): Promise<boolean> {
    if (!brouillon) return false
    setEtat('enregistrement'); setMessage('')
    const { updated_at: _u, ...ligne } = brouillon
    const { error } = await supabase.from('regles_tarifaires').upsert({ ...ligne, consommables: brouillon.consommables.filter(c => c.libelle.trim()) })
    setEtat('')
    if (error) { setMessage(`Enregistrement impossible : ${error.message}`); return false }
    await charger()
    return true
  }

  async function appliquer(remplacerPrix: boolean) {
    if (!brouillon) return
    if (remplacerPrix && !window.confirm(`Remplacer le prix de vente des ${apercu?.avecAchat || 0} produits « ${libelles[brouillon.categorie] || brouillon.categorie} » par le prix conseillé (achat × ${brouillon.coef_fourniture}) ?\n\nLes poses, déposes et consommables vides seront aussi complétés. Les devis déjà créés ne changent pas.`)) return
    if (modifie && !(await enregistrer())) return
    setEtat('application'); setMessage('')
    const { data, error } = await supabase.rpc('appliquer_regles_tarifaires', { p_categorie: brouillon.categorie, p_appliquer: remplacerPrix })
    setEtat('')
    if (error) { setMessage(`Échec : ${error.message}`); return }
    setMessage(remplacerPrix ? `${data} produit(s) mis à jour au prix conseillé.` : `Prix conseillés et planchers recalculés pour ${data} produit(s).`)
    onApplique()
  }

  const conso = brouillon ? totalConsommables(brouillon.consommables) : 0
  const exempleAchat = apercu?.exemple ? prixAchat.get(apercu.exemple.id) || 0 : 0

  return (
    <Modal open={open} onClose={onClose} title="Tarification du catalogue" width={980}>
      <div className="tarif">
        <aside className="tarif-cats" aria-label="Catégories">
          {regles.map(r => (
            <button key={r.categorie} className="tarif-cat" aria-pressed={r.categorie === selection} onClick={() => setSelection(r.categorie)}>
              <span>{libelles[r.categorie] || r.categorie}</span>
              <small>× {String(r.coef_fourniture).replace('.', ',')} · marge min {pct(r.marge_min_pct)}</small>
            </button>
          ))}
        </aside>

        {brouillon && (
          <section className="tarif-detail">
            <p className="tarif-intro">
              Le prix d’achat fournisseur reste visible de la seule direction. Le <b>prix conseillé</b> (achat × coefficient) est le tarif artisan affiché au commercial ;
              le <b>prix plancher</b> (achat + marge minimale) déclenche l’alerte « devis non rentable ».
            </p>
            <div className="tarif-grille">
              <label className="field"><span>Coefficient fourniture</span>
                <input type="number" step="0.05" min="0.5" max="5" value={brouillon.coef_fourniture} disabled={!peutModifier} onChange={e => maj({ coef_fourniture: parseFloat(e.target.value) || 1 })} />
                <small>Marge brute sur la fourniture : {pct((1 - 1 / (brouillon.coef_fourniture || 1)) * 100)}</small>
              </label>
              <label className="field"><span>Marge minimale</span>
                <input type="number" step="1" min="0" max="200" value={brouillon.marge_min_pct} disabled={!peutModifier} onChange={e => maj({ marge_min_pct: parseFloat(e.target.value) || 0 })} />
                <small>Plancher = achat + {pct(brouillon.marge_min_pct)}</small>
              </label>
              <label className="field"><span>Pose par défaut HT</span>
                <input type="number" step="10" min="0" value={brouillon.pose_defaut_ht} disabled={!peutModifier} onChange={e => maj({ pose_defaut_ht: parseFloat(e.target.value) || 0 })} />
                <small>Utilisée si le produit n’a pas de pose</small>
              </label>
              <label className="field"><span>Dépose et évacuation HT</span>
                <input type="number" step="10" min="0" value={brouillon.depose_defaut_ht} disabled={!peutModifier} onChange={e => maj({ depose_defaut_ht: parseFloat(e.target.value) || 0 })} />
                <small>Ancien équipement, déchets en filière agréée</small>
              </label>
            </div>

            <div className="tarif-conso">
              <div className="tarif-conso-tete"><b>Consommables détaillés</b><span className="num">{euro(conso)} HT</span></div>
              {brouillon.consommables.length === 0 && <p className="note">Aucun consommable type pour cette catégorie.</p>}
              {brouillon.consommables.map((c, i) => (
                <div key={i} className="tarif-conso-ligne">
                  <input aria-label="Libellé" value={c.libelle} disabled={!peutModifier} onChange={e => majConso(i, { libelle: e.target.value })} placeholder="Ex. liaison frigorifique isolée" />
                  <input aria-label="Quantité" type="number" min="0" step="0.5" value={c.quantite ?? 1} disabled={!peutModifier} onChange={e => majConso(i, { quantite: parseFloat(e.target.value) || 0 })} />
                  <select aria-label="Unité" value={c.unite || 'forfait'} disabled={!peutModifier} onChange={e => majConso(i, { unite: e.target.value })}>
                    {['forfait', 'u', 'ml', 'm²', 'kg', 'l'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input aria-label="Prix HT" type="number" min="0" step="1" value={c.prix_ht} disabled={!peutModifier} onChange={e => majConso(i, { prix_ht: parseFloat(e.target.value) || 0 })} />
                  {peutModifier && <button className="iconbtn" title="Retirer" onClick={() => setBrouillon(b => b ? { ...b, consommables: b.consommables.filter((_, idx) => idx !== i) } : b)}><Trash2 size={15} /></button>}
                </div>
              ))}
              {peutModifier && <button className="tarif-ajout" onClick={() => setBrouillon(b => b ? { ...b, consommables: [...b.consommables, { libelle: '', quantite: 1, unite: 'forfait', prix_ht: 0 }] } : b)}><Plus size={14} /> Ajouter un consommable</button>}
              <p className="note" style={{ marginTop: 8 }}>Pour un produit qui a déjà un forfait consommables, le détail est ramené à ce montant : le total facturé ne change pas.</p>
            </div>

            {apercu && (
              <div className="tarif-apercu">
                <div><span>Produits actifs</span><b>{apercu.total}</b><small>{apercu.avecAchat} avec prix d’achat</small></div>
                <div><span>Marge fourniture actuelle</span><b className={apercu.margeAvant < brouillon.marge_min_pct ? 'mauvais' : ''}>{pct(apercu.margeAvant)}</b><small>prix de vente actuels</small></div>
                <div><span>Marge au prix conseillé</span><b>{pct(apercu.margeApres)}</b><small>après application</small></div>
                {apercu.exemple && <div className="tarif-exemple"><span>Exemple</span><b>{euro(exempleAchat)} → {euro(Math.round(exempleAchat * brouillon.coef_fourniture))}</b><small title={apercu.exemple.nom}>{apercu.exemple.nom}</small></div>}
              </div>
            )}

            {brouillon.notes && <p className="note">{brouillon.notes}</p>}
            {message && <p className="tarif-message" role="status"><Check size={14} /> {message}</p>}

            {peutModifier ? (
              <div className="tarif-actions">
                <Button variant="secondary" onClick={() => void enregistrer()} disabled={!modifie || !!etat}>Enregistrer la règle</Button>
                <Button variant="secondary" onClick={() => void appliquer(false)} disabled={!!etat}><Calculator size={15} /> Recalculer conseillé et plancher</Button>
                <Button variant="primary" onClick={() => void appliquer(true)} disabled={!!etat || !apercu?.avecAchat}>{etat === 'application' ? 'Application…' : 'Appliquer au catalogue'}</Button>
              </div>
            ) : <p className="note">Seul un administrateur peut modifier les règles de prix.</p>}
          </section>
        )}
      </div>
    </Modal>
  )
}
