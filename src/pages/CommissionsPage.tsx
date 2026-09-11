import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Wallet, Plus, Percent, Settings2, Clock, CheckCircle2, Banknote, XCircle,
  ClipboardCheck, FileSignature, Pencil,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import type { Commission, CommissionBareme, CommissionType, CommissionStatut } from '../types'
import { FloatInput, FloatSelect } from '../components/ui/FloatInput'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { euro, timeAgo } from '../lib/crm/constants'

const TYPE_LABEL: Record<CommissionType, string> = {
  vt: 'Visite technique (VT)',
  devis_signe: 'Devis signé',
  manuel: 'Commission manuelle',
}
const TYPE_ICON: Record<CommissionType, any> = { vt: ClipboardCheck, devis_signe: FileSignature, manuel: Wallet }

const STATUT_LABEL: Record<CommissionStatut, string> = {
  en_attente: 'En attente', validee: 'Validée', payee: 'Payée', annulee: 'Annulée',
}
const STATUT_BADGE: Record<CommissionStatut, string> = {
  en_attente: 'badge-warning', validee: 'badge-info', payee: 'badge-success', annulee: 'badge-neutral',
}
const STATUT_ICON: Record<CommissionStatut, any> = {
  en_attente: Clock, validee: CheckCircle2, payee: Banknote, annulee: XCircle,
}

const EMPTY_BAREME = {
  type: 'vt' as CommissionType, libelle: '', montant_commercial: '', montant_societe: '',
  pourcentage_commercial: '', actif: true,
}

export function CommissionsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  const [tab, setTab] = useState<'commissions' | 'bareme'>('commissions')
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [bareme, setBareme] = useState<CommissionBareme[]>([])
  const [commerciaux, setCommerciaux] = useState<{ id: string; nom_complet: string; role: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreCommercial, setFiltreCommercial] = useState('tous')
  const [filtreStatut, setFiltreStatut] = useState('tous')

  const [baremeModal, setBaremeModal] = useState(false)
  const [baremeForm, setBaremeForm] = useState({ ...EMPTY_BAREME })
  const [editingBaremeId, setEditingBaremeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchCommissions = useCallback(async () => {
    let query = supabase
      .from('commissions')
      .select('*, commercial:profiles(id, nom_complet, couleur)')
      .order('date_generation', { ascending: false })
    if (!isAdmin && profile?.id) query = query.eq('commercial_id', profile.id)
    const { data } = await query
    setCommissions((data || []) as unknown as Commission[])
  }, [isAdmin, profile?.id])

  const fetchBareme = useCallback(async () => {
    const { data } = await supabase.from('commission_bareme').select('*').order('created_at', { ascending: false })
    setBareme((data || []) as CommissionBareme[])
  }, [])

  useEffect(() => {
    setLoading(true)
    const jobs: PromiseLike<any>[] = [fetchCommissions(), fetchBareme()]
    if (isAdmin) jobs.push(supabase.from('profiles').select('id, nom_complet, role').order('nom_complet').then(({ data }) => setCommerciaux((data || []) as any)))
    Promise.all(jobs).finally(() => setLoading(false))
  }, [fetchCommissions, fetchBareme, isAdmin])

  const filtered = useMemo(() => commissions.filter(c =>
    (filtreCommercial === 'tous' || c.commercial_id === filtreCommercial) &&
    (filtreStatut === 'tous' || c.statut === filtreStatut)
  ), [commissions, filtreCommercial, filtreStatut])

  const totaux = useMemo(() => {
    const sum = (statut: CommissionStatut) => commissions
      .filter(c => c.statut === statut && (filtreCommercial === 'tous' || c.commercial_id === filtreCommercial))
      .reduce((s, c) => s + (Number(c.montant_commercial) || 0), 0)
    return { en_attente: sum('en_attente'), validee: sum('validee'), payee: sum('payee') }
  }, [commissions, filtreCommercial])

  async function changerStatut(c: Commission, statut: CommissionStatut) {
    setCommissions(cs => cs.map(x => x.id === c.id ? { ...x, statut } : x))
    await supabase.from('commissions').update({
      statut, date_validation: statut === 'validee' || statut === 'payee' ? new Date().toISOString() : c.date_validation,
    }).eq('id', c.id)
  }

  function openNewBareme() {
    setBaremeForm({ ...EMPTY_BAREME })
    setEditingBaremeId(null)
    setBaremeModal(true)
  }

  function openEditBareme(b: CommissionBareme) {
    setBaremeForm({
      type: b.type, libelle: b.libelle,
      montant_commercial: String(b.montant_commercial ?? ''),
      montant_societe: String(b.montant_societe ?? ''),
      pourcentage_commercial: b.pourcentage_commercial != null ? String(b.pourcentage_commercial) : '',
      actif: b.actif,
    })
    setEditingBaremeId(b.id)
    setBaremeModal(true)
  }

  async function saveBareme() {
    if (!baremeForm.libelle) return
    setSaving(true)
    const payload = {
      type: baremeForm.type,
      libelle: baremeForm.libelle,
      montant_commercial: parseFloat(baremeForm.montant_commercial) || 0,
      montant_societe: parseFloat(baremeForm.montant_societe) || 0,
      pourcentage_commercial: baremeForm.pourcentage_commercial ? parseFloat(baremeForm.pourcentage_commercial) : null,
      actif: baremeForm.actif,
    }
    if (editingBaremeId) {
      await supabase.from('commission_bareme').update(payload).eq('id', editingBaremeId)
    } else {
      await supabase.from('commission_bareme').insert(payload)
    }
    setSaving(false)
    setBaremeModal(false)
    fetchBareme()
  }

  async function toggleActif(b: CommissionBareme) {
    setBareme(bs => bs.map(x => x.id === b.id ? { ...x, actif: !x.actif } : x))
    await supabase.from('commission_bareme').update({ actif: !b.actif }).eq('id', b.id)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Commissions</h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Barème prédéfini et suivi des commissions de toute l\'équipe.'
              : 'Vos commissions générées automatiquement (VT, devis signés…).'}
          </p>
        </div>
        {isAdmin && tab === 'bareme' && (
          <div className="page-actions">
            <Button variant="primary" onClick={openNewBareme}>
              <Plus size={18} /> Nouvelle règle
            </Button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="view-toggle" style={{ marginBottom: 16 }}>
          <button className={`view-toggle-btn ${tab === 'commissions' ? 'active' : ''}`} onClick={() => setTab('commissions')}>
            <Wallet size={15} /> Commissions
          </button>
          <button className={`view-toggle-btn ${tab === 'bareme' ? 'active' : ''}`} onClick={() => setTab('bareme')}>
            <Settings2 size={15} /> Barème
          </button>
        </div>
      )}

      {(tab === 'commissions' || !isAdmin) && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi-tile">
              <div className="kpi-tile-top"><div className="kpi-tile-icon amber"><Clock size={20} /></div></div>
              <div className="kpi-tile-value">{euro(totaux.en_attente)}</div>
              <div className="kpi-tile-label">En attente</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile-top"><div className="kpi-tile-icon blue"><CheckCircle2 size={20} /></div></div>
              <div className="kpi-tile-value">{euro(totaux.validee)}</div>
              <div className="kpi-tile-label">Validées</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile-top"><div className="kpi-tile-icon green"><Banknote size={20} /></div></div>
              <div className="kpi-tile-value">{euro(totaux.payee)}</div>
              <div className="kpi-tile-label">Payées</div>
            </div>
          </div>

          <div className="pro-list-filters" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
            {isAdmin && commerciaux.length > 0 && (
              <select className="pro-filter-select" value={filtreCommercial} onChange={e => setFiltreCommercial(e.target.value)}>
                <option value="tous">Tous les commerciaux</option>
                {commerciaux.map(c => <option key={c.id} value={c.id}>{c.nom_complet || c.role}</option>)}
              </select>
            )}
            <select className="pro-filter-select" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
              <option value="tous">Tous les statuts</option>
              {Object.entries(STATUT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="card"><div className="card-pad text-muted">Chargement…</div></div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <Wallet size={40} />
                <h3>Aucune commission</h3>
                <p>
                  {isAdmin
                    ? 'Les commissions apparaissent automatiquement dès qu\'une VT est attribuée ou qu\'un devis est signé.'
                    : 'Vos VT et devis signés généreront automatiquement des commissions ici.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="prospect-list-card">
              {filtered.map(c => {
                const TIcon = TYPE_ICON[c.type] || Wallet
                const SIcon = STATUT_ICON[c.statut] || Clock
                return (
                  <div key={c.id} className="prospect-row" style={{ cursor: 'default' }}>
                    <div className="prospect-row-avatar" style={{ background: 'var(--c-primary-400)' }}>
                      <TIcon size={16} />
                    </div>
                    <div className="prospect-row-info">
                      <div className="prospect-row-name">{c.libelle || TYPE_LABEL[c.type]}</div>
                      <div className="prospect-row-sub">
                        <span>{TYPE_LABEL[c.type]}</span>
                        {isAdmin && <span>{c.commercial?.nom_complet || 'Non attribué'}</span>}
                        <span>{timeAgo(c.date_generation)}</span>
                      </div>
                    </div>
                    <div className="prospect-row-tags" style={{ alignItems: 'flex-end' }}>
                      <span className={`badge ${STATUT_BADGE[c.statut]} flex items-center gap-1`}>
                        <SIcon size={11} /> {STATUT_LABEL[c.statut]}
                      </span>
                      <span className="font-semibold">{euro(c.montant_commercial)}</span>
                      {isAdmin && <span className="text-sm text-muted">société : {euro(c.montant_societe)}</span>}
                    </div>
                    {isAdmin && c.statut !== 'annulee' && (
                      <div className="flex items-center gap-1" style={{ marginLeft: 12 }}>
                        {c.statut === 'en_attente' && (
                          <Button variant="ghost" size="sm" onClick={() => changerStatut(c, 'validee')}>Valider</Button>
                        )}
                        {c.statut === 'validee' && (
                          <Button variant="ghost" size="sm" onClick={() => changerStatut(c, 'payee')}>Marquer payée</Button>
                        )}
                        {c.statut !== 'payee' && (
                          <Button variant="ghost" size="sm" onClick={() => changerStatut(c, 'annulee')}>Annuler</Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {isAdmin && tab === 'bareme' && (
        loading ? (
          <div className="card"><div className="card-pad text-muted">Chargement…</div></div>
        ) : bareme.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Settings2 size={40} />
              <h3>Aucune règle de commission</h3>
              <p>Définissez un barème (VT, devis signé…) pour que les commissions se génèrent automatiquement.</p>
              <Button variant="primary" onClick={openNewBareme}><Plus size={18} /> Nouvelle règle</Button>
            </div>
          </div>
        ) : (
          <div className="prospect-list-card">
            {bareme.map(b => {
              const TIcon = TYPE_ICON[b.type] || Wallet
              return (
                <div key={b.id} className="prospect-row" style={{ cursor: 'default', opacity: b.actif ? 1 : 0.5 }}>
                  <div className="prospect-row-avatar" style={{ background: 'var(--c-primary-400)' }}>
                    <TIcon size={16} />
                  </div>
                  <div className="prospect-row-info">
                    <div className="prospect-row-name">{b.libelle}</div>
                    <div className="prospect-row-sub">
                      <span>{TYPE_LABEL[b.type]}</span>
                      <span>Commercial : {euro(b.montant_commercial)}{b.pourcentage_commercial ? ` + ${b.pourcentage_commercial}%` : ''}</span>
                      <span>Société : {euro(b.montant_societe)}</span>
                    </div>
                  </div>
                  <div className="prospect-row-tags">
                    <span className={`badge ${b.actif ? 'badge-success' : 'badge-neutral'}`}>{b.actif ? 'Actif' : 'Inactif'}</span>
                  </div>
                  <div className="flex items-center gap-1" style={{ marginLeft: 12 }}>
                    <Button variant="ghost" size="sm" onClick={() => openEditBareme(b)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActif(b)}>{b.actif ? 'Désactiver' : 'Activer'}</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      <Modal
        open={baremeModal}
        onClose={() => setBaremeModal(false)}
        title={editingBaremeId ? 'Modifier la règle' : 'Nouvelle règle de commission'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBaremeModal(false)}>Annuler</Button>
            <Button variant="primary" onClick={saveBareme} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <FloatSelect
          label="Type d'événement"
          value={baremeForm.type}
          onChange={v => setBaremeForm(f => ({ ...f, type: v as CommissionType }))}
          options={[
            { value: 'vt', label: 'Visite technique (VT)' },
            { value: 'devis_signe', label: 'Devis signé' },
            { value: 'manuel', label: 'Commission manuelle' },
          ]}
        />
        <div className="mt-4">
          <FloatInput label="Libellé" value={baremeForm.libelle} onChange={v => setBaremeForm(f => ({ ...f, libelle: v }))} placeholder="ex : VT standard, Commission devis signé…" />
        </div>
        <div className="grid grid-2 gap-3 mt-4">
          <FloatInput label="Montant commercial (€)" type="number" value={baremeForm.montant_commercial} onChange={v => setBaremeForm(f => ({ ...f, montant_commercial: v }))} />
          <FloatInput label="Montant société (€)" type="number" value={baremeForm.montant_societe} onChange={v => setBaremeForm(f => ({ ...f, montant_societe: v }))} />
        </div>
        {baremeForm.type === 'devis_signe' && (
          <div className="mt-4">
            <FloatInput
              label="Pourcentage additionnel sur le montant HT (%)"
              type="number"
              value={baremeForm.pourcentage_commercial}
              onChange={v => setBaremeForm(f => ({ ...f, pourcentage_commercial: v }))}
            />
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              <Percent size={12} style={{ display: 'inline', marginRight: 4 }} />
              S'ajoute au montant commercial fixe : commission = montant fixe + % × montant HT du devis.
            </p>
          </div>
        )}
        <div className="mt-4 flex items-center gap-2">
          <input type="checkbox" checked={baremeForm.actif} onChange={e => setBaremeForm(f => ({ ...f, actif: e.target.checked }))} id="bareme-actif" />
          <label htmlFor="bareme-actif" className="text-sm">Règle active (appliquée automatiquement)</label>
        </div>
      </Modal>
    </div>
  )
}
