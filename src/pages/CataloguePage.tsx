import { useEffect, useState } from 'react'
import { Plus, Package, Pencil, Trash2, X, Copy, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Produit } from '../types'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'

const CATEGORIES = [
  { value: 'combles', label: 'Isolation combles / rampants' },
  { value: 'murs', label: 'Isolation murs' },
  { value: 'plancher', label: 'Isolation plancher bas' },
  { value: 'menuiseries', label: 'Menuiseries' },
  { value: 'pac_air_eau', label: 'Pompe à chaleur Air/Eau' },
  { value: 'pac_air_air', label: 'Pompe à chaleur Air/Air' },
  { value: 'pac_geothermie', label: 'Pompe à chaleur géothermique' },
  { value: 'ballon_thermodynamique', label: 'Ballon thermodynamique' },
  { value: 'vmc', label: 'VMC' },
  { value: 'photovoltaique', label: 'Panneaux photovoltaïques' },
  { value: 'autre', label: 'Autre prestation' },
]

const UNITES = [
  { value: 'unite', label: 'Unité' },
  { value: 'm2', label: 'm²' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'kw', label: 'kW' },
  { value: 'kwc', label: 'kWc (photovoltaïque)' },
  { value: 'ml', label: 'Mètre linéaire' },
]

const TVA_TAUX = [5.5, 10, 20]

const CATEGORIE_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))

type CaracLigne = { cle: string; valeur: string }

interface FormState {
  categorie: string
  nom: string
  marque: string
  reference: string
  description: string
  caracteristiques: CaracLigne[]
  prix_unitaire_ht: string
  unite: string
  tva_taux: number
  eligible_mpr: boolean
  eligible_cee: boolean
  fiche_cee: string
  actif: boolean
  zones_prix: { zone: string; prix_unitaire_ht: string }[]
  forfait_pose_ht: string
  forfait_evacuation_ht: string
}

function emptyForm(): FormState {
  return {
    categorie: 'combles', nom: '', marque: '', reference: '', description: '',
    caracteristiques: [{ cle: '', valeur: '' }],
    prix_unitaire_ht: '', unite: 'unite', tva_taux: 5.5,
    eligible_mpr: false, eligible_cee: false, fiche_cee: '', actif: true,
    zones_prix: [],
    forfait_pose_ht: '', forfait_evacuation_ht: '',
  }
}

export function CataloguePage() {
  const [rows, setRows] = useState<Produit[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreCategorie, setFiltreCategorie] = useState<string>('toutes')
  const [recherche, setRecherche] = useState('')
  const [groupement, setGroupement] = useState<'categorie' | 'fournisseur'>('categorie')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Produit | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)

  function fetchProduits() {
    setLoading(true)
    supabase
      .from('catalogue_produits')
      .select('*')
      .order('categorie', { ascending: true })
      .order('nom', { ascending: true })
      .then(({ data, error }) => {
        if (error) { setRows([]); setLoading(false); return }
        setRows((data || []) as Produit[])
        setLoading(false)
      })
  }

  useEffect(() => { fetchProduits() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(p: Produit) {
    setEditing(p)
    const carac = Object.entries(p.caracteristiques || {}).map(([cle, valeur]) => ({ cle, valeur: String(valeur) }))
    setForm({
      categorie: p.categorie, nom: p.nom, marque: p.marque, reference: p.reference,
      description: p.description,
      caracteristiques: carac.length ? carac : [{ cle: '', valeur: '' }],
      prix_unitaire_ht: String(p.prix_unitaire_ht),
      unite: p.unite, tva_taux: p.tva_taux,
      eligible_mpr: p.eligible_mpr, eligible_cee: p.eligible_cee, fiche_cee: p.fiche_cee,
      actif: p.actif,
      zones_prix: (p.zones_prix || []).map(z => ({ zone: z.zone, prix_unitaire_ht: String(z.prix_unitaire_ht) })),
      forfait_pose_ht: String(p.forfait_pose_ht ?? ''), forfait_evacuation_ht: String(p.forfait_evacuation_ht ?? ''),
    })
    setModalOpen(true)
  }

  function openDuplicate(p: Produit) {
    // Duplique un produit pour créer rapidement une variante de la même gamme
    // (même fournisseur/marque, mêmes caractéristiques de base à ajuster).
    setEditing(null)
    const carac = Object.entries(p.caracteristiques || {}).map(([cle, valeur]) => ({ cle, valeur: String(valeur) }))
    setForm({
      categorie: p.categorie, nom: `${p.nom} (copie)`, marque: p.marque, reference: '',
      description: p.description,
      caracteristiques: carac.length ? carac : [{ cle: '', valeur: '' }],
      prix_unitaire_ht: String(p.prix_unitaire_ht),
      unite: p.unite, tva_taux: p.tva_taux,
      eligible_mpr: p.eligible_mpr, eligible_cee: p.eligible_cee, fiche_cee: p.fiche_cee,
      actif: true,
      zones_prix: (p.zones_prix || []).map(z => ({ zone: z.zone, prix_unitaire_ht: String(z.prix_unitaire_ht) })),
      forfait_pose_ht: String(p.forfait_pose_ht ?? ''), forfait_evacuation_ht: String(p.forfait_evacuation_ht ?? ''),
    })
    setModalOpen(true)
  }

  function setZonePrix(i: number, patch: Partial<{ zone: string; prix_unitaire_ht: string }>) {
    setForm(f => ({ ...f, zones_prix: f.zones_prix.map((z, idx) => idx === i ? { ...z, ...patch } : z) }))
  }
  function addZonePrix() {
    setForm(f => ({ ...f, zones_prix: [...f.zones_prix, { zone: '', prix_unitaire_ht: '' }] }))
  }
  function removeZonePrix(i: number) {
    setForm(f => ({ ...f, zones_prix: f.zones_prix.filter((_, idx) => idx !== i) }))
  }

  function setCarac(i: number, patch: Partial<CaracLigne>) {
    setForm(f => ({ ...f, caracteristiques: f.caracteristiques.map((c, idx) => idx === i ? { ...c, ...patch } : c) }))
  }
  function addCarac() {
    setForm(f => ({ ...f, caracteristiques: [...f.caracteristiques, { cle: '', valeur: '' }] }))
  }
  function removeCarac(i: number) {
    setForm(f => ({ ...f, caracteristiques: f.caracteristiques.filter((_, idx) => idx !== i) }))
  }

  async function save() {
    if (!form.nom.trim()) return
    setSaving(true)

    const caracteristiques = Object.fromEntries(
      form.caracteristiques.filter(c => c.cle.trim()).map(c => [c.cle.trim(), c.valeur])
    )

    const payload = {
      categorie: form.categorie,
      nom: form.nom,
      marque: form.marque,
      reference: form.reference,
      description: form.description,
      caracteristiques,
      prix_unitaire_ht: parseFloat(form.prix_unitaire_ht) || 0,
      unite: form.unite,
      tva_taux: form.tva_taux,
      eligible_mpr: form.eligible_mpr,
      eligible_cee: form.eligible_cee,
      fiche_cee: form.fiche_cee,
      actif: form.actif,
      zones_prix: form.zones_prix
        .filter(z => z.zone.trim() && z.prix_unitaire_ht !== '')
        .map(z => ({ zone: z.zone.trim(), prix_unitaire_ht: parseFloat(z.prix_unitaire_ht) || 0 })),
      forfait_pose_ht: parseFloat(form.forfait_pose_ht) || 0,
      forfait_evacuation_ht: parseFloat(form.forfait_evacuation_ht) || 0,
    }

    if (editing) {
      await supabase.from('catalogue_produits').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('catalogue_produits').insert(payload)
    }

    setSaving(false)
    setModalOpen(false)
    fetchProduits()
  }

  async function toggleActif(p: Produit) {
    await supabase.from('catalogue_produits').update({ actif: !p.actif }).eq('id', p.id)
    fetchProduits()
  }

  async function remove(p: Produit) {
    if (!confirm(`Supprimer "${p.nom}" du catalogue ?`)) return
    await supabase.from('catalogue_produits').delete().eq('id', p.id)
    fetchProduits()
  }

  const euro = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

  const filtered = (filtreCategorie === 'toutes' ? rows : rows.filter(r => r.categorie === filtreCategorie))
    .filter(r => {
      if (!recherche.trim()) return true
      const q = recherche.trim().toLowerCase()
      return [r.nom, r.marque, r.reference].some(v => (v || '').toLowerCase().includes(q))
    })

  // Regroupement par fournisseur/marque : permet de visualiser les gammes proposées
  // par chaque fabricant plutôt que par seule catégorie technique.
  const groupes = (() => {
    if (groupement === 'categorie') {
      const parCategorie = new Map<string, Produit[]>()
      for (const p of filtered) {
        const key = p.categorie
        if (!parCategorie.has(key)) parCategorie.set(key, [])
        parCategorie.get(key)!.push(p)
      }
      return Array.from(parCategorie.entries()).map(([key, produits]) => ({
        label: CATEGORIE_LABEL[key] || key, produits,
      }))
    }
    const parMarque = new Map<string, Produit[]>()
    for (const p of filtered) {
      const key = p.marque?.trim() || 'Sans fournisseur renseigné'
      if (!parMarque.has(key)) parMarque.set(key, [])
      parMarque.get(key)!.push(p)
    }
    return Array.from(parMarque.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, produits]) => ({ label, produits }))
  })()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Catalogue produits</h1>
          <p className="page-subtitle">Les produits et prestations que vous proposez, utilisés pour construire vos devis</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={openCreate}>
            <Plus size={18} /> Ajouter un produit
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${filtreCategorie === 'toutes' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltreCategorie('toutes')}
          >
            Toutes ({rows.length})
          </button>
          {CATEGORIES.map(c => {
            const count = rows.filter(r => r.categorie === c.value).length
            if (count === 0) return null
            return (
              <button
                key={c.value}
                className={`btn btn-sm ${filtreCategorie === c.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltreCategorie(c.value)}
              >
                {c.label} ({count})
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="pro-search-wrap" style={{ maxWidth: 280 }}>
            <Search />
            <input
              placeholder="Rechercher un produit, une marque, une référence…"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`btn btn-sm ${groupement === 'categorie' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setGroupement('categorie')}
              title="Grouper par catégorie technique"
            >
              Par catégorie
            </button>
            <button
              className={`btn btn-sm ${groupement === 'fournisseur' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setGroupement('fournisseur')}
              title="Grouper par fournisseur / marque"
            >
              Par fournisseur
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="card-pad text-muted">Chargement…</div></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Package size={40} />
            <h3>{rows.length === 0 ? 'Catalogue vide' : 'Aucun résultat'}</h3>
            <p>{rows.length === 0 ? 'Ajoutez vos produits et prestations pour pouvoir construire des devis.' : 'Aucun produit ne correspond à cette recherche.'}</p>
            {rows.length === 0 && (
              <Button variant="primary" onClick={openCreate}>
                <Plus size={18} /> Ajouter un produit
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupes.map(groupe => (
            <div className="card" key={groupe.label}>
              <div className="card-header">
                <div className="card-title">{groupe.label}</div>
                <span className="badge badge-neutral">{groupe.produits.length} produit{groupe.produits.length > 1 ? 's' : ''}</span>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    {groupement === 'fournisseur' && <th>Catégorie</th>}
                    <th>Prix HT</th>
                    <th>TVA</th>
                    <th>Aides</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {groupe.produits.map(p => (
                    <tr key={p.id} style={{ opacity: p.actif ? 1 : 0.5 }}>
                      <td>
                        <div className="font-semibold">{p.nom}</div>
                        <div className="text-sm text-muted">{[p.marque, p.reference].filter(Boolean).join(' · ') || '—'}</div>
                        {p.zones_prix && p.zones_prix.length > 0 && (
                          <div className="text-xs text-muted mt-1">{p.zones_prix.length} zone{p.zones_prix.length > 1 ? 's' : ''} tarifaire{p.zones_prix.length > 1 ? 's' : ''}</div>
                        )}
                      </td>
                      {groupement === 'fournisseur' && <td>{CATEGORIE_LABEL[p.categorie] || p.categorie}</td>}
                      <td>{euro(p.prix_unitaire_ht)} / {UNITES.find(u => u.value === p.unite)?.label || p.unite}</td>
                      <td>{p.tva_taux}%</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {p.eligible_mpr && <span className="badge badge-info">MaPrimeRénov'</span>}
                          {p.eligible_cee && <span className="badge badge-info">CEE{p.fiche_cee ? ` ${p.fiche_cee}` : ''}</span>}
                          {!p.eligible_mpr && !p.eligible_cee && <span className="text-muted text-sm">—</span>}
                        </div>
                      </td>
                      <td>
                        <button className={`badge ${p.actif ? 'badge-success' : 'badge-neutral'}`} onClick={() => toggleActif(p)} style={{ cursor: 'pointer', border: 'none' }}>
                          {p.actif ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-icon" onClick={() => openDuplicate(p)} title="Dupliquer (nouvelle variante de cette gamme)"><Copy size={16} /></button>
                          <button className="btn-icon" onClick={() => openEdit(p)} title="Modifier"><Pencil size={16} /></button>
                          <button className="btn-icon" onClick={() => remove(p)} title="Supprimer"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le produit' : 'Ajouter un produit'}
        width={640}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid grid-2">
            <label className="field">
              <span>Catégorie</span>
              <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Nom du produit *</span>
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="ex: PAC Daikin Altherma 3" />
            </label>
          </div>

          <div className="grid grid-2">
            <label className="field">
              <span>Marque</span>
              <input value={form.marque} onChange={e => setForm(f => ({ ...f, marque: e.target.value }))} placeholder="ex: Daikin" />
            </label>
            <label className="field">
              <span>Référence</span>
              <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="ex: ETSX16P50D" />
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description commerciale du produit" />
          </label>

          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Caractéristiques techniques
              <span className="text-sm text-muted" style={{ fontWeight: 400 }}> — affichées sur le devis mono-geste</span>
            </div>
            {form.caracteristiques.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input placeholder="ex: COP" value={c.cle} onChange={e => setCarac(i, { cle: e.target.value })} style={{ flex: 1 }} />
                <input placeholder="ex: 4,2" value={c.valeur} onChange={e => setCarac(i, { valeur: e.target.value })} style={{ flex: 1 }} />
                <button className="btn-icon" onClick={() => removeCarac(i)} title="Retirer"><X size={16} /></button>
              </div>
            ))}
            <button className="btn btn-sm btn-secondary" onClick={addCarac}>
              <Plus size={14} /> Ajouter une caractéristique
            </button>
            <div className="text-sm text-muted mt-2">
              Exemples selon la catégorie : COP, SCOP, puissance (kW), R (m².K/W), Uw (W/m².K),
              rendement (%), classe énergétique, niveau sonore (dB)...
            </div>
          </div>

          <div className="grid grid-3">
            <label className="field">
              <span>Prix unitaire HT *</span>
              <input type="number" step="0.01" value={form.prix_unitaire_ht} onChange={e => setForm(f => ({ ...f, prix_unitaire_ht: e.target.value }))} placeholder="0.00" />
            </label>
            <label className="field">
              <span>Unité</span>
              <select value={form.unite} onChange={e => setForm(f => ({ ...f, unite: e.target.value }))}>
                {UNITES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>TVA</span>
              <select value={form.tva_taux} onChange={e => setForm(f => ({ ...f, tva_taux: parseFloat(e.target.value) }))}>
                {TVA_TAUX.map(t => <option key={t} value={t}>{t}%</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-2">
            <label className="field">
              <span>Forfait pose HT (par {UNITES.find(u => u.value === form.unite)?.label.toLowerCase() || 'unité'})</span>
              <input type="number" step="0.01" value={form.forfait_pose_ht} onChange={e => setForm(f => ({ ...f, forfait_pose_ht: e.target.value }))} placeholder="0.00" />
            </label>
            <label className="field">
              <span>Forfait évacuation des déchets HT (par {UNITES.find(u => u.value === form.unite)?.label.toLowerCase() || 'unité'})</span>
              <input type="number" step="0.01" value={form.forfait_evacuation_ht} onChange={e => setForm(f => ({ ...f, forfait_evacuation_ht: e.target.value }))} placeholder="0.00" />
            </label>
          </div>
          <p className="text-xs text-muted mb-2" style={{ marginTop: -8 }}>
            Si renseignés, ces forfaits sont ajoutés automatiquement en lignes séparées
            dans le devis dès que ce produit est sélectionné (laisser à 0 si non applicable).
          </p>

          <div className="grid grid-2">
            <label className="checkbox-field">
              <input type="checkbox" checked={form.eligible_mpr} onChange={e => setForm(f => ({ ...f, eligible_mpr: e.target.checked }))} />
              <span>Éligible MaPrimeRénov'</span>
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={form.eligible_cee} onChange={e => setForm(f => ({ ...f, eligible_cee: e.target.checked }))} />
              <span>Éligible CEE</span>
            </label>
          </div>

          {form.eligible_cee && (
            <label className="field">
              <span>Fiche CEE de référence</span>
              <input value={form.fiche_cee} onChange={e => setForm(f => ({ ...f, fiche_cee: e.target.value }))} placeholder="ex: BAR-TH-104" />
            </label>
          )}

          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Prix par zone géographique (optionnel)</div>
            <p className="text-xs text-muted mb-2">
              Remplace le prix de base pour les prospects situés dans le département indiqué (ex: coût de
              transport différent, tarif régional). Sans dérogation, le prix de base s'applique partout.
            </p>
            {form.zones_prix.map((z, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  placeholder="Département (ex: 75)"
                  value={z.zone}
                  maxLength={3}
                  onChange={e => setZonePrix(i, { zone: e.target.value })}
                  style={{ width: 130 }}
                />
                <input
                  type="number"
                  placeholder="Prix HT (€)"
                  value={z.prix_unitaire_ht}
                  onChange={e => setZonePrix(i, { prix_unitaire_ht: e.target.value })}
                  style={{ width: 130 }}
                />
                <button type="button" className="btn-icon" onClick={() => removeZonePrix(i)} title="Supprimer cette zone">
                  <X size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addZonePrix}>
              <Plus size={14} /> Ajouter une zone tarifaire
            </button>
          </div>

          <label className="checkbox-field">
            <input type="checkbox" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} />
            <span>Produit actif (visible dans les devis)</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
