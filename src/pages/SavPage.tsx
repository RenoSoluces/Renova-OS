import { useCallback, useEffect, useMemo, useState } from 'react'
import { Wrench, Plus, CheckCircle2, Clock, CalendarClock, Hourglass, ListChecks } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { FloatSelect, FloatTextarea } from '../components/ui/FloatInput'
import { STATUTS_SAV, statutSav, compterSav } from '../lib/sav/statutsSav'
import { logAuditEvent } from '../lib/auditLog'

interface SavLigne {
  id: string
  dossier_id: string
  statut: string
  description: string
  observation: string | null
  compte_rendu: string | null
  installateur_id: string | null
  created_at: string
  date_cloture: string | null
  dossier?: { reference: string | null; prospect?: { prenom: string | null; nom: string | null; telephone: string | null; ville: string | null } | null } | null
}
interface DossierChoix { id: string; reference: string | null; installateur_id: string | null; prospect?: { prenom: string | null; nom: string | null } | null }

const dateFr = (v?: string | null) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—')
const nomClient = (s: SavLigne) => `${s.dossier?.prospect?.prenom || ''} ${s.dossier?.prospect?.nom || ''}`.trim() || '—'
const normaliser = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function SavPage() {
  const { profile } = useAuth()
  const [savs, setSavs] = useState<SavLigne[]>([])
  const [dossiers, setDossiers] = useState<DossierChoix[]>([])
  const [installateurs, setInstallateurs] = useState<{ id: string; nom: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('ouverts')

  const [nouveau, setNouveau] = useState(false)
  const [form, setForm] = useState({ dossier_id: '', description: '', observation: '', installateur_id: '' })
  const [saving, setSaving] = useState(false)
  const [aCloturer, setACloturer] = useState<SavLigne | null>(null)
  const [compteRendu, setCompteRendu] = useState('')

  const charger = useCallback(async () => {
    setErreur('')
    const [s, d, i] = await Promise.all([
      supabase.from('sav_interventions').select('*, dossier:dossiers(reference, prospect:prospects(prenom,nom,telephone,ville))').order('created_at', { ascending: false }),
      supabase.from('dossiers').select('id,reference,installateur_id,prospect:prospects(prenom,nom)').order('created_at', { ascending: false }),
      supabase.from('installateurs').select('id,nom').order('nom'),
    ])
    if (s.error) setErreur(s.error.message)
    setSavs((s.data || []) as unknown as SavLigne[])
    setDossiers((d.data || []) as unknown as DossierChoix[])
    setInstallateurs((i.data || []) as { id: string; nom: string }[])
    setLoading(false)
  }, [])
  useEffect(() => { void charger() }, [charger])

  const compte = useMemo(() => compterSav(savs), [savs])
  const nomInstallateur = (id?: string | null) => installateurs.find(x => x.id === id)?.nom || '—'

  const visibles = useMemo(() => savs.filter(s => {
    if (filtreStatut === 'ouverts' && !statutSav(s.statut).ouvert) return false
    if (filtreStatut && filtreStatut !== 'ouverts' && filtreStatut !== 'tous' && s.statut !== filtreStatut) return false
    if (recherche.trim()) {
      const texte = normaliser([s.dossier?.reference, nomClient(s), s.dossier?.prospect?.ville, s.description, s.observation, nomInstallateur(s.installateur_id)].join(' '))
      if (!normaliser(recherche.trim()).split(/\s+/).every(m => texte.includes(m))) return false
    }
    return true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [savs, filtreStatut, recherche, installateurs])

  function ouvrirNouveau() {
    setForm({ dossier_id: '', description: '', observation: '', installateur_id: '' })
    setNouveau(true)
  }

  async function creer() {
    if (!form.dossier_id || !form.description.trim()) return
    setSaving(true)
    const { error } = await supabase.from('sav_interventions').insert({
      dossier_id: form.dossier_id, type: 'sav', statut: 'ouvert', description: form.description.trim(),
      observation: form.observation.trim(), installateur_id: form.installateur_id || null, cree_par: profile?.id || null,
    })
    setSaving(false)
    if (error) { setErreur(`SAV non créé : ${error.message}`); return }
    void logAuditEvent({ action: 'sav_cree', entityType: 'dossier', entityId: form.dossier_id, description: `SAV ouvert : ${form.description.trim().slice(0, 80)}` })
    setNouveau(false)
    await charger()
  }

  async function changerStatut(s: SavLigne, statut: string) {
    if (statut === 'clos') { setACloturer(s); setCompteRendu(s.compte_rendu || ''); return }
    const { error } = await supabase.from('sav_interventions').update({ statut, date_cloture: null }).eq('id', s.id)
    if (error) { setErreur(`Statut non modifié : ${error.message}`); return }
    setSavs(prev => prev.map(x => x.id === s.id ? { ...x, statut, date_cloture: null } : x))
  }

  async function cloturer() {
    if (!aCloturer) return
    setSaving(true)
    const maintenant = new Date().toISOString()
    const { error } = await supabase.from('sav_interventions').update({ statut: 'clos', date_cloture: maintenant, date_intervention: maintenant, compte_rendu: compteRendu.trim() }).eq('id', aCloturer.id)
    setSaving(false)
    if (error) { setErreur(`Clôture impossible : ${error.message}`); return }
    void logAuditEvent({ action: 'sav_clos', entityType: 'dossier', entityId: aCloturer.dossier_id, description: 'SAV réglé' })
    setACloturer(null)
    await charger()
  }

  const tuiles = [
    { icone: <Wrench size={19} />, valeur: compte.aTraiter, label: 'À traiter', couleur: 'amber' },
    { icone: <Clock size={19} />, valeur: compte.enCours, label: 'En cours', couleur: 'blue' },
    { icone: <CalendarClock size={19} />, valeur: compte.rdvPlanifies, label: 'RDV planifiés', couleur: 'green' },
    { icone: <Hourglass size={19} />, valeur: compte.attenteFournisseur, label: 'Attente fournisseur', couleur: 'purple' },
    { icone: <CheckCircle2 size={19} />, valeur: compte.regles, label: 'Réglés (30 j)', couleur: 'green' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">SAV</h1>
          <p className="page-subtitle">Suivi des interventions après installation : problème, installateur, statut et clôture</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={ouvrirNouveau}><Plus size={18} /> Nouveau SAV</Button>
        </div>
      </div>

      <section className="dashboard-kpis page-kpi-strip">
        {tuiles.map(t => (
          <div className="dashboard-kpi" key={t.label}>
            <span className={`dashboard-kpi-icon ${t.couleur}`}>{t.icone}</span>
            <span className="dashboard-kpi-main"><strong>{t.valeur}</strong><span>{t.label}</span></span>
            <span className="dashboard-kpi-note">SAV</span>
          </div>
        ))}
      </section>

      <div className="dossier-filtres" role="search">
        <input type="search" className="input" placeholder="Rechercher un client, un dossier, un problème…" value={recherche} onChange={e => setRecherche(e.target.value)} aria-label="Rechercher un SAV" />
        <select className="input" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} aria-label="Filtrer par statut">
          <option value="ouverts">En cours de traitement</option>
          <option value="tous">Tous les SAV</option>
          {STATUTS_SAV.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <span className="dossier-filtres-compte">{visibles.length} / {savs.length} SAV</span>
      </div>

      {erreur && <div className="card card-pad" role="alert" style={{ marginBottom: 12, color: '#a12b2b' }}>{erreur}</div>}

      <div className="card">
        {loading ? (
          <div className="card-pad text-muted">Chargement…</div>
        ) : visibles.length === 0 ? (
          <div className="empty-state">
            <ListChecks size={40} />
            <h3>{savs.length === 0 ? 'Aucun SAV' : 'Aucun SAV avec ces filtres'}</h3>
            <p>{savs.length === 0 ? 'Ouvrez un SAV depuis un dossier installé pour suivre l’intervention jusqu’à sa clôture.' : 'Modifiez la recherche ou le statut.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>Dossier</th><th>Client</th><th>Problème</th><th>Statut</th><th>Installateur</th><th>Ouvert le</th><th>Réglé le</th></tr>
              </thead>
              <tbody>
                {visibles.map(s => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.dossier?.reference || '—'}</td>
                    <td>{nomClient(s)}{s.dossier?.prospect?.ville ? <div className="text-sm text-muted">{s.dossier.prospect.ville}</div> : null}</td>
                    <td style={{ maxWidth: 340 }}>
                      {s.description || 'Intervention SAV'}
                      {s.observation ? <div className="text-sm text-muted">{s.observation}</div> : null}
                      {s.compte_rendu && s.statut === 'clos' ? <div className="text-sm text-muted">Compte rendu : {s.compte_rendu}</div> : null}
                    </td>
                    <td>
                      <select className={`badge ${statutSav(s.statut).badge}`} style={{ border: 0, cursor: 'pointer' }} value={s.statut} onChange={e => void changerStatut(s, e.target.value)} aria-label="Statut du SAV">
                        {STATUTS_SAV.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                      </select>
                    </td>
                    <td>{nomInstallateur(s.installateur_id)}</td>
                    <td>{dateFr(s.created_at)}</td>
                    <td>{dateFr(s.date_cloture)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={nouveau}
        onClose={() => setNouveau(false)}
        title="Nouveau SAV"
        footer={<>
          <Button variant="ghost" onClick={() => setNouveau(false)}>Annuler</Button>
          <Button variant="primary" onClick={() => void creer()} disabled={saving || !form.dossier_id || !form.description.trim()}>{saving ? 'Création…' : 'Ouvrir le SAV'}</Button>
        </>}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <FloatSelect
            label="Dossier"
            value={form.dossier_id}
            onChange={v => setForm(f => ({ ...f, dossier_id: v, installateur_id: dossiers.find(d => d.id === v)?.installateur_id || f.installateur_id }))}
            options={[{ value: '', label: 'Choisir le dossier…' }, ...dossiers.map(d => ({ value: d.id, label: `${d.reference || d.id.slice(0, 8)} — ${`${d.prospect?.prenom || ''} ${d.prospect?.nom || ''}`.trim() || 'sans nom'}` }))]}
          />
          <FloatTextarea label="Problème constaté" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} rows={3} />
          <FloatTextarea label="Observations" value={form.observation} onChange={v => setForm(f => ({ ...f, observation: v }))} rows={2} />
          <FloatSelect
            label="Installateur concerné"
            value={form.installateur_id}
            onChange={v => setForm(f => ({ ...f, installateur_id: v }))}
            options={[{ value: '', label: 'Non précisé' }, ...installateurs.map(i => ({ value: i.id, label: i.nom }))]}
          />
        </div>
      </Modal>

      <Modal
        open={!!aCloturer}
        onClose={() => setACloturer(null)}
        title="Régler le SAV"
        footer={<>
          <Button variant="ghost" onClick={() => setACloturer(null)}>Annuler</Button>
          <Button variant="primary" onClick={() => void cloturer()} disabled={saving}>{saving ? 'Enregistrement…' : 'Marquer comme réglé'}</Button>
        </>}
      >
        <p className="text-sm text-muted" style={{ marginBottom: 12 }}>{aCloturer?.dossier?.reference} — {aCloturer ? nomClient(aCloturer) : ''}</p>
        <FloatTextarea label="Compte rendu de l’intervention" value={compteRendu} onChange={setCompteRendu} rows={4} />
      </Modal>
    </div>
  )
}
