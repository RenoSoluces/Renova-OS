import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Archive, CheckCircle2, ExternalLink, Scale } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { FloatInput, FloatSelect, FloatTextarea } from '../components/ui/FloatInput'
import {
  DISPOSITIFS, TYPES_TEXTE, LIBELLES_ETAT, etatTexte, joursAvantEffet, dossiersConcernes,
  type EntreeVeille, type DossierVeille, type TypeTexte, type StatutVeille,
} from '../lib/veille/impact'

const dateFr = (v?: string | null) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString('fr-FR') : '—')
const FORM_VIDE = { titre: '', resume: '', dispositifs: ['cee'] as string[], type_texte: 'arrete' as TypeTexte, fiches: '', date_publication: '', date_effet: '', source_url: '', impact: '' }

export function VeillePage({ onNavigate }: { onNavigate?: (p: any) => void }) {
  const { profile } = useAuth()
  const admin = ['admin', 'manager', 'partner_admin', 'company_admin'].includes(profile?.role || '')
  const [entrees, setEntrees] = useState<EntreeVeille[]>([])
  const [dossiers, setDossiers] = useState<DossierVeille[]>([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [filtreDispositif, setFiltreDispositif] = useState('')
  const [filtreStatut, setFiltreStatut] = useState<'' | StatutVeille>('')
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [form, setForm] = useState<(typeof FORM_VIDE & { id?: string }) | null>(null)
  const [saving, setSaving] = useState(false)

  const charger = useCallback(async () => {
    const [v, d] = await Promise.all([
      supabase.from('veille_reglementaire').select('*').order('date_publication', { ascending: false, nullsFirst: false }),
      supabase.from('dossiers').select('id,reference,statut,cee_fiche_reference,prospect:prospects(prenom,nom,fiches_cee)'),
    ])
    if (v.error) setErreur(v.error.message)
    setEntrees((v.data || []) as EntreeVeille[])
    setDossiers(((d.data || []) as any[]).map(x => ({
      id: x.id, reference: x.reference, statut: x.statut,
      client: `${x.prospect?.prenom || ''} ${x.prospect?.nom || ''}`.trim() || '—',
      fiches: [x.cee_fiche_reference, ...(Array.isArray(x.prospect?.fiches_cee) ? x.prospect.fiches_cee : [])].filter(Boolean),
    })))
    setLoading(false)
  }, [])
  useEffect(() => { void charger() }, [charger])

  const visibles = useMemo(() => entrees.filter(e => {
    if (!admin && e.statut !== 'publie') return false
    if (filtreStatut ? e.statut !== filtreStatut : e.statut === 'archive') return false
    if (filtreDispositif && !e.dispositifs.includes(filtreDispositif)) return false
    return true
  }), [entrees, admin, filtreStatut, filtreDispositif])
  const aRelire = entrees.filter(e => e.statut === 'a_relire').length

  async function enregistrer() {
    if (!form || !form.titre.trim()) return
    setSaving(true); setErreur('')
    const champs = {
      titre: form.titre.trim(), resume: form.resume.trim() || null, dispositifs: form.dispositifs, type_texte: form.type_texte,
      fiches_concernees: form.fiches.split(/[,;\s]+/).map(f => f.trim().toUpperCase()).filter(Boolean),
      date_publication: form.date_publication || null, date_effet: form.date_effet || null,
      source_url: form.source_url.trim() || null, impact: form.impact.trim() || null,
    }
    const { error } = form.id
      ? await supabase.from('veille_reglementaire').update(champs).eq('id', form.id)
      : await supabase.from('veille_reglementaire').insert({ ...champs, statut: 'a_relire', cree_par: profile?.id || null })
    setSaving(false)
    if (error) { setErreur(`Enregistrement impossible : ${error.message}`); return }
    setForm(null)
    await charger()
  }

  async function changerStatut(e: EntreeVeille, statut: StatutVeille) {
    const { error } = await supabase.from('veille_reglementaire').update({ statut }).eq('id', e.id)
    if (error) { setErreur(`Changement impossible : ${error.message}`); return }
    setEntrees(prev => prev.map(x => x.id === e.id ? { ...x, statut } : x))
  }

  const basculerDispositif = (v: string) => setForm(f => f ? { ...f, dispositifs: f.dispositifs.includes(v) ? f.dispositifs.filter(x => x !== v) : [...f.dispositifs, v] } : f)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Veille réglementaire</h1>
          <p className="page-subtitle">Arrêtés CEE, mises à jour MaPrimeRénov' et MonProjetAnah, avec leur date d'effet et les dossiers concernés. Chaque entrée est relue avant d'être publiée.</p>
        </div>
        {admin && <div className="page-actions"><Button variant="primary" onClick={() => setForm({ ...FORM_VIDE })}><Plus size={18} /> Nouvelle entrée</Button></div>}
      </div>

      <div className="dossier-filtres">
        <select className="input" value={filtreDispositif} onChange={e => setFiltreDispositif(e.target.value)} aria-label="Filtrer par dispositif">
          <option value="">Tous les dispositifs</option>
          {DISPOSITIFS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        {admin && (
          <select className="input" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value as any)} aria-label="Filtrer par statut">
            <option value="">À relire et publiées</option>
            <option value="a_relire">À relire ({aRelire})</option>
            <option value="publie">Publiées</option>
            <option value="archive">Archivées</option>
          </select>
        )}
        <span className="dossier-filtres-compte">{visibles.length} entrée{visibles.length > 1 ? 's' : ''}</span>
      </div>

      {erreur && <div className="card card-pad" role="alert" style={{ marginBottom: 12, color: '#a12b2b' }}>{erreur}</div>}

      {loading ? <div className="card card-pad text-muted">Chargement…</div> : visibles.length === 0 ? (
        <div className="card"><div className="empty-state"><Scale size={40} /><h3>Aucune entrée</h3><p>{admin ? 'Ajoutez les textes à suivre : ils seront rattachés aux dossiers concernés.' : 'Aucune actualité réglementaire publiée pour le moment.'}</p></div></div>
      ) : (
        <div className="veille-liste">
          {visibles.map(e => {
            const etat = etatTexte(e)
            const jours = joursAvantEffet(e.date_effet)
            const concernes = dossiersConcernes(e, dossiers)
            return (
              <article key={e.id} className={`card card-pad veille-carte ${e.statut === 'a_relire' ? 'a-relire' : ''}`}>
                <div className="veille-badges">
                  {e.statut === 'a_relire' && <span className="badge badge-warning">À relire</span>}
                  {e.statut === 'archive' && <span className="badge badge-neutral">Archivée</span>}
                  <span className={`badge ${etat === 'en_vigueur' ? 'badge-success' : etat === 'a_venir' ? 'badge-info' : 'badge-neutral'}`}>{LIBELLES_ETAT[etat]}</span>
                  <span className="badge badge-neutral">{TYPES_TEXTE.find(t => t.value === e.type_texte)?.label}</span>
                  {e.dispositifs.map(d => <span key={d} className="badge badge-info">{DISPOSITIFS.find(x => x.value === d)?.label || d}</span>)}
                </div>
                <h3 className="veille-titre">{e.titre}</h3>
                {e.resume && <p className="text-sm">{e.resume}</p>}
                <div className="veille-meta text-sm text-muted">
                  <span>Publié le {dateFr(e.date_publication)}</span>
                  <span>Effet : {dateFr(e.date_effet)}{jours != null && jours > 0 ? ` (dans ${jours} j)` : ''}</span>
                  {e.fiches_concernees.length > 0 && <span>Fiches : {e.fiches_concernees.join(', ')}</span>}
                </div>
                {e.impact && <p className="text-sm veille-impact"><b>Impact :</b> {e.impact}</p>}
                {e.source_note && <p className="text-sm text-muted">{e.source_note}</p>}
                <div className="veille-actions">
                  {e.fiches_concernees.length > 0 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOuvert(ouvert === e.id ? null : e.id)} aria-expanded={ouvert === e.id}>
                      {concernes.length} dossier{concernes.length > 1 ? 's' : ''} en cours concerné{concernes.length > 1 ? 's' : ''}
                    </button>
                  )}
                  {e.source_url && <a className="btn btn-ghost btn-sm" href={e.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Texte officiel</a>}
                  {admin && (
                    <>
                      {e.statut === 'a_relire' && <Button variant="secondary" size="sm" onClick={() => void changerStatut(e, 'publie')}><CheckCircle2 size={14} /> Publier</Button>}
                      {e.statut !== 'archive' && <Button variant="ghost" size="sm" onClick={() => void changerStatut(e, 'archive')}><Archive size={14} /> Archiver</Button>}
                      {e.statut === 'archive' && <Button variant="ghost" size="sm" onClick={() => void changerStatut(e, 'a_relire')}>Remettre à relire</Button>}
                      <Button variant="ghost" size="sm" onClick={() => setForm({ id: e.id, titre: e.titre, resume: e.resume || '', dispositifs: e.dispositifs, type_texte: e.type_texte, fiches: e.fiches_concernees.join(', '), date_publication: e.date_publication || '', date_effet: e.date_effet || '', source_url: e.source_url || '', impact: e.impact || '' })}><Pencil size={14} /> Modifier</Button>
                    </>
                  )}
                </div>
                {ouvert === e.id && (
                  <ul className="veille-dossiers">
                    {concernes.length === 0 ? <li className="text-muted">Aucun dossier en cours n'utilise ces fiches.</li> : concernes.map(d => (
                      <li key={d.id}><b>{d.reference || d.id.slice(0, 8)}</b> — {d.client} <span className="text-muted">({d.statut})</span></li>
                    ))}
                    {onNavigate && concernes.length > 0 && <li><button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('dossiers')}>Ouvrir les dossiers</button></li>}
                  </ul>
                )}
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Modifier l\'entrée' : 'Nouvelle entrée de veille'}
        width={640}
        footer={<>
          <Button variant="ghost" onClick={() => setForm(null)}>Annuler</Button>
          <Button variant="primary" onClick={() => void enregistrer()} disabled={saving || !form?.titre.trim()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </>}
      >
        {form && (
          <div style={{ display: 'grid', gap: 14 }}>
            <FloatTextarea label="Titre du texte" value={form.titre} onChange={v => setForm({ ...form, titre: v })} rows={2} />
            <FloatTextarea label="Résumé (facultatif)" value={form.resume} onChange={v => setForm({ ...form, resume: v })} rows={3} />
            <div>
              <div className="text-sm text-muted" style={{ marginBottom: 6 }}>Dispositifs concernés</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {DISPOSITIFS.map(d => (
                  <label key={d.value} className="text-sm" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="checkbox" checked={form.dispositifs.includes(d.value)} onChange={() => basculerDispositif(d.value)} /> {d.label}
                  </label>
                ))}
              </div>
            </div>
            <FloatSelect label="Nature du texte" value={form.type_texte} onChange={v => setForm({ ...form, type_texte: v as TypeTexte })} options={TYPES_TEXTE} />
            <FloatInput label="Fiches d'opération concernées (séparées par une virgule), ex. BAR-TH-159" value={form.fiches} onChange={v => setForm({ ...form, fiches: v })} />
            <div className="grid grid-2 gap-3">
              <FloatInput label="Date de publication" type="date" value={form.date_publication} onChange={v => setForm({ ...form, date_publication: v })} />
              <FloatInput label="Date d'effet" type="date" value={form.date_effet} onChange={v => setForm({ ...form, date_effet: v })} />
            </div>
            <FloatInput label="Lien vers le texte officiel (Légifrance)" value={form.source_url} onChange={v => setForm({ ...form, source_url: v })} />
            <FloatTextarea label="Impact pour Reno Soluces (facultatif)" value={form.impact} onChange={v => setForm({ ...form, impact: v })} rows={2} />
          </div>
        )}
      </Modal>
    </div>
  )
}
