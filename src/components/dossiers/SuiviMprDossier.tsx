import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { Button } from '../ui/Button'
import { FloatInput, FloatSelect } from '../ui/FloatInput'
import { LIBELLES_PHASE, STATUTS_MPR, actionRequise, statutsDePhase, type PhaseMpr } from '../../lib/mpr/suiviAnah'

interface Props {
  dossier: {
    id: string
    mpr_plateforme?: string | null
    mpr_parcours?: string | null
    mpr_numero_dossier?: string | null
    mpr_phase?: string | null
    mpr_statut?: string | null
    mpr_statut_maj_le?: string | null
    mpr_montant?: number | null
  }
  lecture?: boolean
  /** Appelé après un enregistrement, avec les champs mis à jour (pour rafraîchir la fiche et la liste). */
  onSauve: (champs: Record<string, unknown>) => void
}

interface Evenement { id: string; phase: PhaseMpr | null; statut: string; source: 'manuel' | 'import'; note: string | null; observe_le: string; created_at: string }

const dateFr = (v?: string | null) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—')
const euro = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`

/** Avancement du dossier d'aide à l'Anah (MaPrimeRénov' / MonProjetAnah), avec historique des changements. */
export function SuiviMprDossier({ dossier, lecture, onSauve }: Props) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ plateforme: '', parcours: '', numero: '', phase: 'subvention' as PhaseMpr, statut: '', montant: '' })
  const [historique, setHistorique] = useState<Evenement[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('mpr_historique').select('id,phase,statut,source,note,observe_le,created_at').eq('dossier_id', dossier.id).order('created_at', { ascending: false }).limit(30)
    setHistorique((data || []) as Evenement[])
  }, [dossier.id])

  useEffect(() => {
    setForm({
      plateforme: dossier.mpr_plateforme || '', parcours: dossier.mpr_parcours || '', numero: dossier.mpr_numero_dossier || '',
      phase: (dossier.mpr_phase as PhaseMpr) || 'subvention', statut: dossier.mpr_statut || '', montant: dossier.mpr_montant != null ? String(dossier.mpr_montant) : '',
    })
    setMessage('')
    void charger()
  }, [dossier.id, dossier.mpr_plateforme, dossier.mpr_parcours, dossier.mpr_numero_dossier, dossier.mpr_phase, dossier.mpr_statut, dossier.mpr_montant, charger])

  const phases = Object.keys(LIBELLES_PHASE) as PhaseMpr[]
  const options = statutsDePhase(form.phase)
  const significations = STATUTS_MPR.find(s => s.phase === form.phase && s.statut === form.statut)?.signification

  async function enregistrer() {
    setSaving(true); setMessage('')
    const montant = form.montant.trim() === '' ? null : parseFloat(form.montant.replace(',', '.'))
    if (montant !== null && !Number.isFinite(montant)) { setSaving(false); setMessage('Le montant n’est pas un nombre valide.'); return }
    const statutChange = form.statut !== (dossier.mpr_statut || '') || form.phase !== (dossier.mpr_phase || '')
    const champs = {
      mpr_plateforme: form.plateforme || null, mpr_parcours: form.parcours || null, mpr_numero_dossier: form.numero.trim() || null,
      mpr_phase: form.statut ? form.phase : null, mpr_statut: form.statut || null, mpr_montant: montant,
      ...(statutChange ? { mpr_statut_maj_le: new Date().toISOString() } : {}),
    }
    const { error } = await supabase.from('dossiers').update(champs).eq('id', dossier.id)
    if (error) { setSaving(false); setMessage(`Enregistrement impossible : ${error.message}`); return }
    if (statutChange && form.statut) {
      await supabase.from('mpr_historique').insert({ dossier_id: dossier.id, phase: form.phase, statut: form.statut, source: 'manuel', cree_par: profile?.id || null })
    }
    setSaving(false)
    setMessage('Suivi enregistré.')
    onSauve(champs)
    void charger()
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 14 }}>
      <div className="font-semibold" style={{ marginBottom: 2 }}>Aide de l'Anah — MaPrimeRénov' / MonProjetAnah</div>
      <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
        Reprenez l'état affiché dans votre espace mandataire de l'Anah, ou importez l'export Excel du tableau de bord depuis la page Dossiers.
      </div>
      {actionRequise(dossier.mpr_statut) && (
        <div className="mpr-alerte" role="alert"><AlertTriangle size={16} /> L'Anah attend une action de votre part ou de celle du client : « {dossier.mpr_statut} ».</div>
      )}
      <div className="grid grid-3 gap-3">
        <FloatSelect label="Plateforme" value={form.plateforme} onChange={v => setForm(f => ({ ...f, plateforme: v }))} disabled={lecture}
          options={[{ value: '', label: 'Non renseignée' }, { value: 'maprimerenov', label: 'MaPrimeRénov\'' }, { value: 'monprojetanah', label: 'MonProjetAnah' }]} />
        <FloatSelect label="Parcours" value={form.parcours} onChange={v => setForm(f => ({ ...f, parcours: v }))} disabled={lecture}
          options={[{ value: '', label: 'Non renseigné' }, { value: 'geste', label: 'Par geste' }, { value: 'ampleur', label: 'Rénovation d\'ampleur' }]} />
        <FloatInput label="N° de dossier Anah" value={form.numero} onChange={v => setForm(f => ({ ...f, numero: v }))} disabled={lecture} />
      </div>
      <div className="grid grid-3 gap-3 mt-3">
        <FloatSelect label="Étape" value={form.phase} onChange={v => setForm(f => ({ ...f, phase: v as PhaseMpr, statut: '' }))} disabled={lecture}
          options={phases.map(p => ({ value: p, label: LIBELLES_PHASE[p] }))} />
        <FloatSelect label="État dans l'espace Anah" value={form.statut} onChange={v => setForm(f => ({ ...f, statut: v }))} disabled={lecture}
          options={[{ value: '', label: 'Aucun état' }, ...options.map(o => ({ value: o.statut, label: o.statut }))]} />
        <FloatInput label="Montant de l'aide (€)" inputMode="decimal" value={form.montant} onChange={v => setForm(f => ({ ...f, montant: v }))} disabled={lecture} />
      </div>
      {significations && <p className="text-sm text-muted" style={{ margin: '8px 0 0' }}>{significations}</p>}
      {!lecture && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button variant="primary" size="sm" onClick={() => void enregistrer()} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le suivi'}</Button>
          {message && <span className="text-sm text-muted" role="status">{message}</span>}
          {dossier.mpr_statut_maj_le && !message && <span className="text-sm text-muted">Dernière mise à jour : {dateFr(dossier.mpr_statut_maj_le)}{dossier.mpr_montant != null ? ` · aide ${euro(Number(dossier.mpr_montant))}` : ''}</span>}
        </div>
      )}
      {historique.length > 0 && (
        <ol className="mpr-historique" aria-label="Historique du suivi Anah">
          {historique.map(h => (
            <li key={h.id}>
              <span className="mpr-historique-date">{dateFr(h.observe_le)}</span>
              <span><b>{h.statut}</b>{h.phase ? ` · ${LIBELLES_PHASE[h.phase]}` : ''}</span>
              <small>{h.source === 'import' ? 'Import de l\'export Anah' : 'Saisie manuelle'}{h.note ? ` — ${h.note}` : ''}</small>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
