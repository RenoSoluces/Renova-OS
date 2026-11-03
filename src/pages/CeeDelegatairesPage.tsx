import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Landmark } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { FloatInput, FloatSelect, FloatTextarea } from '../components/ui/FloatInput'
import { LIBELLES_PRECARITE, prixNet, type LignePrix, type PrecariteCee } from '../lib/cee/grillePrix'

interface Delegataire { id: string; nom: string; type: 'obligé' | 'delegataire' | 'eligible'; contact: string | null; email: string | null; notes: string | null; actif: boolean }

const TYPES = [
  { value: 'delegataire', label: 'Délégataire' },
  { value: 'obligé', label: 'Obligé (fournisseur d\'énergie)' },
  { value: 'eligible', label: 'Éligible' },
]
const libelleType = (t: string) => TYPES.find(x => x.value === t)?.label.split(' (')[0] || t
const dateFr = (v?: string | null) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString('fr-FR') : '')
const euro = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} €`

const FORM_DELEGATAIRE = { nom: '', type: 'delegataire', contact: '', email: '', notes: '', actif: true }
const FORM_PRIX = { fiche_reference: '', precarite: '', prix: '', bonification: '0', date_debut: '', date_fin: '', notes: '', actif: true }

export function CeeDelegatairesPage() {
  const [delegataires, setDelegataires] = useState<Delegataire[]>([])
  const [grille, setGrille] = useState<(LignePrix & { notes: string | null })[]>([])
  const [choisi, setChoisi] = useState('')
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [formD, setFormD] = useState<(typeof FORM_DELEGATAIRE & { id?: string }) | null>(null)
  const [formP, setFormP] = useState<(typeof FORM_PRIX & { id?: string }) | null>(null)
  const [saving, setSaving] = useState(false)

  const charger = useCallback(async () => {
    const [d, g] = await Promise.all([
      supabase.from('cee_delegataires').select('*').order('nom'),
      supabase.from('cee_grille_prix').select('*').order('date_debut', { ascending: false, nullsFirst: false }),
    ])
    if (d.error) setErreur(d.error.message)
    setDelegataires((d.data || []) as Delegataire[])
    setGrille(((g.data || []) as any[]).map(l => ({ ...l, prix_eur_par_mwh_cumac: Number(l.prix_eur_par_mwh_cumac), bonification_pct: Number(l.bonification_pct) })))
    setLoading(false)
  }, [])
  useEffect(() => { void charger() }, [charger])
  useEffect(() => { if (!choisi && delegataires.length) setChoisi(delegataires[0].id) }, [delegataires, choisi])

  const courant = delegataires.find(d => d.id === choisi) || null
  const lignes = useMemo(() => grille.filter(l => l.delegataire_id === choisi), [grille, choisi])

  async function enregistrerDelegataire() {
    if (!formD || !formD.nom.trim()) return
    setSaving(true); setErreur('')
    const champs = { nom: formD.nom.trim(), type: formD.type, contact: formD.contact.trim() || null, email: formD.email.trim() || null, notes: formD.notes.trim() || null, actif: formD.actif }
    const { data, error } = formD.id
      ? await supabase.from('cee_delegataires').update(champs).eq('id', formD.id).select('id').single()
      : await supabase.from('cee_delegataires').insert(champs).select('id').single()
    setSaving(false)
    if (error) { setErreur(`Enregistrement impossible : ${error.message}`); return }
    setFormD(null)
    if (data?.id) setChoisi(data.id)
    await charger()
  }

  async function supprimerDelegataire(d: Delegataire) {
    if (!window.confirm(`Supprimer « ${d.nom} » et toute sa grille de prix ? Les dossiers qui l'utilisent perdront ce choix.`)) return
    const { error } = await supabase.from('cee_delegataires').delete().eq('id', d.id)
    if (error) { setErreur(`Suppression impossible : ${error.message}`); return }
    setChoisi('')
    await charger()
  }

  async function enregistrerPrix() {
    if (!formP || !courant) return
    const prix = parseFloat(formP.prix.replace(',', '.'))
    const bonif = parseFloat((formP.bonification || '0').replace(',', '.'))
    if (!Number.isFinite(prix) || prix < 0) { setErreur('Le prix doit être un nombre positif.'); return }
    if (!Number.isFinite(bonif) || bonif < 0) { setErreur('La bonification doit être un nombre positif ou nul.'); return }
    if (formP.date_debut && formP.date_fin && formP.date_fin < formP.date_debut) { setErreur('La date de fin précède la date de début.'); return }
    setSaving(true); setErreur('')
    const champs = {
      delegataire_id: courant.id, fiche_reference: formP.fiche_reference.trim().toUpperCase() || null, precarite: (formP.precarite || null) as PrecariteCee | null,
      prix_eur_par_mwh_cumac: prix, bonification_pct: bonif, date_debut: formP.date_debut || null, date_fin: formP.date_fin || null,
      notes: formP.notes.trim() || null, actif: formP.actif,
    }
    const { error } = formP.id
      ? await supabase.from('cee_grille_prix').update(champs).eq('id', formP.id)
      : await supabase.from('cee_grille_prix').insert(champs)
    setSaving(false)
    if (error) { setErreur(`Enregistrement impossible : ${error.message}`); return }
    setFormP(null)
    await charger()
  }

  async function supprimerPrix(id: string) {
    if (!window.confirm('Supprimer cette ligne de prix ?')) return
    const { error } = await supabase.from('cee_grille_prix').delete().eq('id', id)
    if (error) { setErreur(`Suppression impossible : ${error.message}`); return }
    await charger()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Délégataires CEE</h1>
          <p className="page-subtitle">Le prix du MWh cumac dépend du délégataire (ou de l'obligé) qui rachète vos certificats. Saisissez ici vos contrats : ils servent à calculer la prime CEE de chaque dossier.</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => setFormD({ ...FORM_DELEGATAIRE })}><Plus size={18} /> Nouveau délégataire</Button>
        </div>
      </div>

      {erreur && <div className="card card-pad" role="alert" style={{ marginBottom: 12, color: '#a12b2b' }}>{erreur}</div>}

      {loading ? <div className="card card-pad text-muted">Chargement…</div> : delegataires.length === 0 ? (
        <div className="card"><div className="empty-state">
          <Landmark size={40} /><h3>Aucun délégataire</h3>
          <p>Ajoutez votre premier délégataire CEE, puis sa grille de prix (€/MWh cumac) par fiche et par précarité. Aucun prix n'est préchargé : ils viennent de vos contrats.</p>
          <Button variant="primary" onClick={() => setFormD({ ...FORM_DELEGATAIRE })}><Plus size={18} /> Nouveau délégataire</Button>
        </div></div>
      ) : (
        <div className="cee-layout">
          <aside className="card cee-liste" aria-label="Délégataires">
            {delegataires.map(d => (
              <button key={d.id} type="button" className={`cee-liste-item ${d.id === choisi ? 'actif' : ''}`} onClick={() => setChoisi(d.id)}>
                <b>{d.nom}</b>
                <small>{libelleType(d.type)}{d.actif ? '' : ' · inactif'} · {grille.filter(l => l.delegataire_id === d.id).length} prix</small>
              </button>
            ))}
          </aside>

          <section className="card card-pad">
            {courant && (
              <>
                <div className="cee-entete">
                  <div>
                    <h2 style={{ margin: 0 }}>{courant.nom}</h2>
                    <p className="text-sm text-muted" style={{ margin: '4px 0 0' }}>
                      {libelleType(courant.type)}{courant.contact ? ` · ${courant.contact}` : ''}{courant.email ? ` · ${courant.email}` : ''}
                    </p>
                    {courant.notes && <p className="text-sm" style={{ margin: '6px 0 0' }}>{courant.notes}</p>}
                  </div>
                  <div className="cee-entete-actions">
                    <Button variant="ghost" size="sm" onClick={() => setFormD({ id: courant.id, nom: courant.nom, type: courant.type, contact: courant.contact || '', email: courant.email || '', notes: courant.notes || '', actif: courant.actif })}><Pencil size={14} /> Modifier</Button>
                    <Button variant="ghost" size="sm" onClick={() => void supprimerDelegataire(courant)}><Trash2 size={14} /> Supprimer</Button>
                  </div>
                </div>

                <div className="cee-grille-titre">
                  <h3 style={{ margin: 0 }}>Grille de prix</h3>
                  <Button variant="secondary" size="sm" onClick={() => setFormP({ ...FORM_PRIX })}><Plus size={14} /> Ajouter un prix</Button>
                </div>
                {lignes.length === 0 ? <p className="text-sm text-muted">Aucun prix saisi pour ce délégataire : ses dossiers n'auront pas de prime calculée.</p> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead><tr><th>Fiche</th><th>Précarité</th><th>Prix €/MWh cumac</th><th>Bonification</th><th>Prix net</th><th>Période</th><th /></tr></thead>
                      <tbody>
                        {lignes.map(l => (
                          <tr key={l.id} style={l.actif ? undefined : { opacity: 0.5 }}>
                            <td>{l.fiche_reference || <span className="text-muted">Toutes</span>}</td>
                            <td>{l.precarite ? LIBELLES_PRECARITE[l.precarite] : <span className="text-muted">Tous</span>}</td>
                            <td>{euro(l.prix_eur_par_mwh_cumac)}</td>
                            <td>{l.bonification_pct ? `+ ${l.bonification_pct} %` : '—'}</td>
                            <td><b>{euro(prixNet(l))}</b></td>
                            <td>{l.date_debut || l.date_fin ? `${dateFr(l.date_debut) || '…'} → ${dateFr(l.date_fin) || '…'}` : 'Sans limite'}{l.actif ? '' : ' (inactif)'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <Button variant="ghost" size="sm" aria-label="Modifier ce prix" onClick={() => setFormP({ id: l.id, fiche_reference: l.fiche_reference || '', precarite: l.precarite || '', prix: String(l.prix_eur_par_mwh_cumac), bonification: String(l.bonification_pct), date_debut: l.date_debut || '', date_fin: l.date_fin || '', notes: l.notes || '', actif: l.actif })}><Pencil size={14} /></Button>
                              <Button variant="ghost" size="sm" aria-label="Supprimer ce prix" onClick={() => void supprimerPrix(l.id)}><Trash2 size={14} /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-sm text-muted" style={{ marginTop: 12 }}>
                  Règle appliquée : la ligne la plus précise l'emporte (fiche précise avant « toutes les fiches », puis précarité précise avant « tous »), puis la période la plus récente.
                </p>
              </>
            )}
          </section>
        </div>
      )}

      <Modal
        open={!!formD}
        onClose={() => setFormD(null)}
        title={formD?.id ? 'Modifier le délégataire' : 'Nouveau délégataire'}
        footer={<>
          <Button variant="ghost" onClick={() => setFormD(null)}>Annuler</Button>
          <Button variant="primary" onClick={() => void enregistrerDelegataire()} disabled={saving || !formD?.nom.trim()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </>}
      >
        {formD && (
          <div style={{ display: 'grid', gap: 14 }}>
            <FloatInput label="Nom" value={formD.nom} onChange={v => setFormD({ ...formD, nom: v })} />
            <FloatSelect label="Type" value={formD.type} onChange={v => setFormD({ ...formD, type: v })} options={TYPES} />
            <div className="grid grid-2 gap-3">
              <FloatInput label="Contact" value={formD.contact} onChange={v => setFormD({ ...formD, contact: v })} />
              <FloatInput label="E-mail" type="email" value={formD.email} onChange={v => setFormD({ ...formD, email: v })} />
            </div>
            <FloatTextarea label="Notes (contrat, conditions)" value={formD.notes} onChange={v => setFormD({ ...formD, notes: v })} rows={3} />
            <label className="text-sm" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={formD.actif} onChange={e => setFormD({ ...formD, actif: e.target.checked })} /> Délégataire actif
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!formP}
        onClose={() => setFormP(null)}
        title={formP?.id ? 'Modifier le prix' : `Nouveau prix — ${courant?.nom || ''}`}
        footer={<>
          <Button variant="ghost" onClick={() => setFormP(null)}>Annuler</Button>
          <Button variant="primary" onClick={() => void enregistrerPrix()} disabled={saving || !formP?.prix.trim()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </>}
      >
        {formP && (
          <div style={{ display: 'grid', gap: 14 }}>
            <FloatInput label="Fiche d'opération (vide = toutes), ex. BAR-TH-171" value={formP.fiche_reference} onChange={v => setFormP({ ...formP, fiche_reference: v })} />
            <FloatSelect label="Précarité du ménage" value={formP.precarite} onChange={v => setFormP({ ...formP, precarite: v })}
              options={[{ value: '', label: 'Tous les ménages' }, ...(Object.keys(LIBELLES_PRECARITE) as PrecariteCee[]).map(k => ({ value: k, label: LIBELLES_PRECARITE[k] }))]} />
            <div className="grid grid-2 gap-3">
              <FloatInput label="Prix (€ par MWh cumac)" inputMode="decimal" value={formP.prix} onChange={v => setFormP({ ...formP, prix: v })} />
              <FloatInput label="Bonification (%) — ex. coup de pouce" inputMode="decimal" value={formP.bonification} onChange={v => setFormP({ ...formP, bonification: v })} />
            </div>
            <div className="grid grid-2 gap-3">
              <FloatInput label="Valable à partir du" type="date" value={formP.date_debut} onChange={v => setFormP({ ...formP, date_debut: v })} />
              <FloatInput label="Jusqu'au (inclus)" type="date" value={formP.date_fin} onChange={v => setFormP({ ...formP, date_fin: v })} />
            </div>
            <FloatTextarea label="Notes" value={formP.notes} onChange={v => setFormP({ ...formP, notes: v })} rows={2} />
            <label className="text-sm" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={formP.actif} onChange={e => setFormP({ ...formP, actif: e.target.checked })} /> Ligne active
            </label>
          </div>
        )}
      </Modal>
    </div>
  )
}
