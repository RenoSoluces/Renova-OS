import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  Plus,
  Settings2,
  Clock,
  CheckCircle2,
  Banknote,
  XCircle,
  Pencil,
  Trash2,
  Building2,
  UserRound,
  CalendarDays,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import type { Commission, CommissionBareme, CommissionType } from '../types'
import { FloatInput, FloatSelect } from '../components/ui/FloatInput'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { euro } from '../lib/crm/constants'

const TYPES: Record<CommissionType, string> = {
  vt: 'Visite technique',
  devis_signe: 'Devis signé',
  manuel: 'Commission manuelle',
}

const EMPTY = {
  type: 'devis_signe' as CommissionType,
  libelle: '',
  commercial_id: '',
  produit_id: '',
  montant_commercial: '',
  montant_societe: '',
  pourcentage_commercial: '',
  mode: 'fixe',
  base_pourcentage: 'montant_ht',
  priorite: '0',
  date_debut: '',
  date_fin: '',
  actif: true,
}

type PaymentTarget = 'commercial' | 'societe'

function formatDate(value?: string | null) {
  if (!value) return 'Non payée'
  return new Date(value).toLocaleDateString('fr-FR')
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

export function CommissionsPage() {
  const { profile } = useAuth()
  const admin = profile?.role === 'admin' || profile?.role === 'manager'

  const [tab, setTab] = useState<'suivi' | 'bareme'>('suivi')
  const [rows, setRows] = useState<Commission[]>([])
  const [rules, setRules] = useState<CommissionBareme[]>([])
  const [commerciaux, setCommerciaux] = useState<any[]>([])
  const [produits, setProduits] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paymentModal, setPaymentModal] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget>('commercial')
  const [paymentCommission, setPaymentCommission] = useState<Commission | null>(null)
  const [paymentDate, setPaymentDate] = useState(todayInput())
  const [paymentSaving, setPaymentSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [c, b, p, u] = await Promise.all([
      supabase
        .from('commissions')
        .select('*, commercial:profiles(id, nom_complet)')
        .order('date_generation', { ascending: false }),
      supabase
        .from('commission_bareme')
        .select('*')
        .order('priorite', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('catalogue_produits')
        .select('id,nom,categorie')
        .eq('actif', true)
        .order('nom'),
      supabase
        .from('profiles')
        .select('id,nom_complet,role')
        .in('role', ['commercial', 'manager', 'admin'])
        .order('nom_complet'),
    ])

    if (c.error) console.error('[RENOVA OS] Chargement commissions:', c.error)
    if (b.error) console.error('[RENOVA OS] Chargement barèmes:', b.error)

    setRows((c.data || []) as Commission[])
    setRules((b.data || []) as CommissionBareme[])
    setProduits(p.data || [])
    setCommerciaux(u.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totalCommercial = useMemo(
    () => rows.reduce((s, r) => s + Number(r.montant_commercial || 0), 0),
    [rows],
  )

  const commercialEnAttente = useMemo(
    () => rows
      .filter(r => r.statut !== 'annulee' && !r.date_paiement_commercial)
      .reduce((s, r) => s + Number(r.montant_commercial || 0), 0),
    [rows],
  )

  const commercialPaye = useMemo(
    () => rows
      .filter(r => !!r.date_paiement_commercial)
      .reduce((s, r) => s + Number(r.montant_commercial || 0), 0),
    [rows],
  )

  const societeEnAttente = useMemo(
    () => rows
      .filter(r => r.statut !== 'annulee' && !r.date_paiement_societe)
      .reduce((s, r) => s + Number(r.montant_societe || 0), 0),
    [rows],
  )

  const societePaye = useMemo(
    () => rows
      .filter(r => !!r.date_paiement_societe)
      .reduce((s, r) => s + Number(r.montant_societe || 0), 0),
    [rows],
  )

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY })
    setModal(true)
  }

  function openEdit(r: any) {
    setEditing(r.id)
    setForm({
      type: r.type,
      libelle: r.libelle,
      commercial_id: r.commercial_id || '',
      produit_id: r.produit_id || '',
      montant_commercial: String(r.montant_commercial ?? ''),
      montant_societe: String(r.montant_societe ?? ''),
      pourcentage_commercial: r.pourcentage_commercial == null ? '' : String(r.pourcentage_commercial),
      mode: r.mode || 'fixe',
      base_pourcentage: r.base_pourcentage || 'montant_ht',
      priorite: String(r.priorite || 0),
      date_debut: r.date_debut || '',
      date_fin: r.date_fin || '',
      actif: r.actif,
    })
    setModal(true)
  }

  async function save() {
    if (!form.libelle) return
    setSaving(true)

    const payload = {
      type: form.type,
      libelle: form.libelle,
      commercial_id: form.commercial_id || null,
      produit_id: form.produit_id || null,
      montant_commercial: Number(form.montant_commercial) || 0,
      montant_societe: Number(form.montant_societe) || 0,
      pourcentage_commercial: form.pourcentage_commercial === '' ? null : Number(form.pourcentage_commercial),
      mode: form.mode,
      base_pourcentage: form.base_pourcentage,
      priorite: Number(form.priorite) || 0,
      date_debut: form.date_debut || null,
      date_fin: form.date_fin || null,
      actif: form.actif,
    }

    const q = editing
      ? supabase.from('commission_bareme').update(payload).eq('id', editing)
      : supabase.from('commission_bareme').insert(payload)

    const { error } = await q
    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setModal(false)
    load()
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette règle ?')) return
    await supabase.from('commission_bareme').delete().eq('id', id)
    load()
  }

  async function status(c: Commission, s: 'validee' | 'annulee') {
    const { error } = await supabase
      .from('commissions')
      .update({
        statut: s,
        date_validation: s === 'validee' ? new Date().toISOString() : null,
      })
      .eq('id', c.id)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  function openPayment(c: Commission, target: PaymentTarget) {
    setPaymentCommission(c)
    setPaymentTarget(target)
    const current = target === 'commercial'
      ? c.date_paiement_commercial
      : c.date_paiement_societe
    setPaymentDate(current ? current.slice(0, 10) : todayInput())
    setPaymentModal(true)
  }

  async function savePayment() {
    if (!paymentCommission || !paymentDate) return
    setPaymentSaving(true)

    const paymentIso = new Date(`${paymentDate}T12:00:00`).toISOString()
    const field = paymentTarget === 'commercial'
      ? 'date_paiement_commercial'
      : 'date_paiement_societe'

    const nextCommercialDate = paymentTarget === 'commercial'
      ? paymentIso
      : paymentCommission.date_paiement_commercial
    const nextSocieteDate = paymentTarget === 'societe'
      ? paymentIso
      : paymentCommission.date_paiement_societe

    const bothPaid = !!nextCommercialDate && !!nextSocieteDate

    const { error } = await supabase
      .from('commissions')
      .update({
        [field]: paymentIso,
        ...(bothPaid ? { statut: 'payee' } : {}),
      })
      .eq('id', paymentCommission.id)

    setPaymentSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setPaymentModal(false)
    setPaymentCommission(null)
    load()
  }

  async function clearPayment(c: Commission, target: PaymentTarget) {
    const label = target === 'commercial' ? 'commercial' : 'société'
    if (!confirm(`Retirer la date de paiement du ${label} ?`)) return

    const field = target === 'commercial'
      ? 'date_paiement_commercial'
      : 'date_paiement_societe'

    const otherPaid = target === 'commercial'
      ? !!c.date_paiement_societe
      : !!c.date_paiement_commercial

    const { error } = await supabase
      .from('commissions')
      .update({
        [field]: null,
        ...(c.statut === 'payee' ? { statut: otherPaid ? 'validee' : 'en_attente' } : {}),
      })
      .eq('id', c.id)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Commissions</h1>
          <p className="page-subtitle">Suivi séparé des commissions commerciales et de la part société.</p>
        </div>
        {admin && tab === 'bareme' && (
          <Button variant="primary" onClick={openNew}>
            <Plus size={18} /> Nouvelle règle
          </Button>
        )}
      </div>

      {admin && (
        <div className="view-toggle" style={{ marginBottom: 16 }}>
          <button className={`view-toggle-btn ${tab === 'suivi' ? 'active' : ''}`} onClick={() => setTab('suivi')}>
            <Wallet size={15} /> Suivi
          </button>
          <button className={`view-toggle-btn ${tab === 'bareme' ? 'active' : ''}`} onClick={() => setTab('bareme')}>
            <Settings2 size={15} /> Matrice de rémunération
          </button>
        </div>
      )}

      {(tab === 'suivi' || !admin) && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi-tile">
              <div className="kpi-tile-icon amber"><Clock size={20} /></div>
              <div className="kpi-tile-value">{euro(commercialEnAttente)}</div>
              <div className="kpi-tile-label">Commercial à payer</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile-icon green"><Banknote size={20} /></div>
              <div className="kpi-tile-value">{euro(commercialPaye)}</div>
              <div className="kpi-tile-label">Commercial déjà payé</div>
            </div>
            {admin && (
              <>
                <div className="kpi-tile">
                  <div className="kpi-tile-icon amber"><Building2 size={20} /></div>
                  <div className="kpi-tile-value">{euro(societeEnAttente)}</div>
                  <div className="kpi-tile-label">Société à payer</div>
                </div>
                <div className="kpi-tile">
                  <div className="kpi-tile-icon green"><CheckCircle2 size={20} /></div>
                  <div className="kpi-tile-value">{euro(societePaye)}</div>
                  <div className="kpi-tile-label">Société déjà payée</div>
                </div>
              </>
            )}
            <div className="kpi-tile">
              <div className="kpi-tile-icon purple"><Wallet size={20} /></div>
              <div className="kpi-tile-value">{euro(totalCommercial)}</div>
              <div className="kpi-tile-label">Total commissions commerciales</div>
            </div>
          </div>

          <div className="prospect-list-card">
            {loading ? (
              <div className="card-pad text-muted">Chargement…</div>
            ) : rows.length === 0 ? (
              <div className="empty-state">
                <Wallet size={40} />
                <h3>Aucune commission</h3>
                <p>Les commissions apparaîtront automatiquement selon la matrice définie.</p>
              </div>
            ) : (
              rows.map(c => (
                <div className="prospect-row" key={c.id}>
                  <div className="prospect-row-avatar"><Wallet size={16} /></div>

                  <div className="prospect-row-info">
                    <div className="prospect-row-name">{c.libelle}</div>
                    <div className="prospect-row-sub">
                      <span>{c.commercial?.nom_complet || '—'}</span>
                      <span>{TYPES[c.type]}</span>
                      <span>Générée le {formatDate(c.date_generation)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 5, minWidth: 230 }}>
                    <div className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <UserRound size={14} />
                      <strong>Commercial : {euro(c.montant_commercial)}</strong>
                      {c.date_paiement_commercial ? (
                        <span className="badge badge-success">Payé</span>
                      ) : (
                        <span className="badge badge-warning">À payer</span>
                      )}
                    </div>
                    <div className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <CalendarDays size={13} />
                      {c.date_paiement_commercial
                        ? `Payé le ${formatDate(c.date_paiement_commercial)}`
                        : 'Aucune date de paiement'}
                    </div>
                    {admin && (
                      <div className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Building2 size={14} />
                        <strong>Société : {euro(c.montant_societe)}</strong>
                        {c.date_paiement_societe ? (
                          <span className="badge badge-success">Payée</span>
                        ) : (
                          <span className="badge badge-warning">À payer</span>
                        )}
                      </div>
                    )}
                    {admin && (
                      <div className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <CalendarDays size={13} />
                        {c.date_paiement_societe
                          ? `Société payée le ${formatDate(c.date_paiement_societe)}`
                          : 'Société : aucune date de paiement'}
                      </div>
                    )}
                  </div>

                  <div className="prospect-row-tags">
                    <span className={`badge ${c.statut === 'payee' ? 'badge-success' : c.statut === 'validee' ? 'badge-info' : c.statut === 'annulee' ? 'badge-danger' : 'badge-warning'}`}>
                      {c.statut === 'payee' ? 'Payée' : c.statut === 'validee' ? 'Validée' : c.statut === 'annulee' ? 'Annulée' : 'En attente'}
                    </span>
                  </div>

                  {admin && c.statut !== 'annulee' && (
                    <div className="flex items-center gap-1" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {c.statut === 'en_attente' && (
                        <Button variant="ghost" size="sm" onClick={() => status(c, 'validee')}>Valider</Button>
                      )}
                      {!c.date_paiement_commercial && (
                        <Button variant="ghost" size="sm" onClick={() => openPayment(c, 'commercial')}>Payer commercial</Button>
                      )}
                      {c.date_paiement_commercial && (
                        <Button variant="ghost" size="sm" onClick={() => openPayment(c, 'commercial')}>Modifier commercial</Button>
                      )}
                      {!c.date_paiement_societe && (
                        <Button variant="ghost" size="sm" onClick={() => openPayment(c, 'societe')}>Payer société</Button>
                      )}
                      {c.date_paiement_societe && (
                        <Button variant="ghost" size="sm" onClick={() => openPayment(c, 'societe')}>Modifier société</Button>
                      )}
                      {c.date_paiement_commercial && (
                        <Button variant="ghost" size="sm" onClick={() => clearPayment(c, 'commercial')}>
                          Annuler paiement commercial
                        </Button>
                      )}
                      {c.date_paiement_societe && (
                        <Button variant="ghost" size="sm" onClick={() => clearPayment(c, 'societe')}>
                          Annuler paiement société
                        </Button>
                      )}
                      {!c.date_paiement_commercial && !c.date_paiement_societe && c.statut !== 'payee' && (
                        <Button variant="ghost" size="sm" onClick={() => status(c, 'annulee')}><XCircle size={14} /></Button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {admin && tab === 'bareme' && (
        <div className="card">
          <div className="card-pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 140px', gap: 0 }} className="commission-table-head">
              <b>Règle</b><b>Commercial</b><b>Produit</b><b>Rémunération</b><b>Priorité</b>
            </div>
            {rules.length === 0 ? (
              <div className="empty-state">
                <Settings2 size={40} /><h3>Aucune règle</h3><p>Créez votre première règle de rémunération.</p>
              </div>
            ) : rules.map((r: any) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 140px', alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--c-border)' }}>
                <div><strong>{r.libelle}</strong><div className="text-sm text-muted">{TYPES[r.type as CommissionType]} · {r.actif ? 'Actif' : 'Inactif'}</div></div>
                <span>{commerciaux.find(c => c.id === r.commercial_id)?.nom_complet || 'Tous les commerciaux'}</span>
                <span>{produits.find(p => p.id === r.produit_id)?.nom || 'Tous les produits'}</span>
                <span>{euro(r.montant_commercial)}{r.pourcentage_commercial ? ` + ${r.pourcentage_commercial}%` : ''}<div className="text-sm text-muted">Société : {euro(r.montant_societe)}</div></span>
                <span className="flex items-center gap-1"><b>{r.priorite}</b><Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil size={14} /></Button><Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 size={14} /></Button></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Modifier la règle' : 'Nouvelle règle de rémunération'}
        footer={<><Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></>}
      >
        <FloatSelect label="Événement" value={form.type} onChange={v => setForm((f: any) => ({ ...f, type: v }))} options={Object.entries(TYPES).map(([value, label]) => ({ value, label }))} />
        <div className="mt-4"><FloatInput label="Libellé" value={form.libelle} onChange={v => setForm((f: any) => ({ ...f, libelle: v }))} placeholder="Ex : PAC Air/Eau — Jean" /></div>
        <div className="grid grid-2 gap-3 mt-4"><FloatSelect label="Commercial" value={form.commercial_id} onChange={v => setForm((f: any) => ({ ...f, commercial_id: v }))} options={[{ value: '', label: 'Tous les commerciaux' }, ...commerciaux.map(c => ({ value: c.id, label: c.nom_complet || c.email }))]} /><FloatSelect label="Produit" value={form.produit_id} onChange={v => setForm((f: any) => ({ ...f, produit_id: v }))} options={[{ value: '', label: 'Tous les produits' }, ...produits.map(p => ({ value: p.id, label: p.nom }))]} /></div>
        <div className="grid grid-2 gap-3 mt-4"><FloatInput label="Montant commercial (€)" type="number" value={form.montant_commercial} onChange={v => setForm((f: any) => ({ ...f, montant_commercial: v }))} /><FloatInput label="Montant société (€)" type="number" value={form.montant_societe} onChange={v => setForm((f: any) => ({ ...f, montant_societe: v }))} /></div>
        <div className="grid grid-2 gap-3 mt-4"><FloatInput label="% commercial (optionnel)" type="number" value={form.pourcentage_commercial} onChange={v => setForm((f: any) => ({ ...f, pourcentage_commercial: v }))} /><FloatSelect label="Mode" value={form.mode} onChange={v => setForm((f: any) => ({ ...f, mode: v }))} options={[{ value: 'fixe', label: 'Montant fixe' }, { value: 'pourcentage', label: 'Pourcentage' }, { value: 'fixe_plus_pourcentage', label: 'Fixe + pourcentage' }]} /></div>
        <div className="grid grid-2 gap-3 mt-4"><FloatInput label="Priorité" type="number" value={form.priorite} onChange={v => setForm((f: any) => ({ ...f, priorite: v }))} /><FloatSelect label="Base du pourcentage" value={form.base_pourcentage} onChange={v => setForm((f: any) => ({ ...f, base_pourcentage: v }))} options={[{ value: 'montant_ht', label: 'Montant HT' }, { value: 'montant_ttc', label: 'Montant TTC' }]} /></div>
      </Modal>

      <Modal
        open={paymentModal}
        onClose={() => setPaymentModal(false)}
        title={`Paiement — ${paymentTarget === 'commercial' ? 'Commercial' : 'Société'}`}
        footer={<><Button variant="ghost" onClick={() => setPaymentModal(false)}>Annuler</Button><Button variant="primary" onClick={savePayment} disabled={paymentSaving || !paymentDate}>{paymentSaving ? 'Enregistrement…' : 'Enregistrer le paiement'}</Button></>}
      >
        <div style={{ marginBottom: 18 }}>
          <strong>{paymentCommission?.libelle}</strong>
          <div className="text-sm text-muted" style={{ marginTop: 5 }}>
            {paymentTarget === 'commercial'
              ? `Commission commercial : ${euro(paymentCommission?.montant_commercial || 0)}`
              : `Part société : ${euro(paymentCommission?.montant_societe || 0)}`}
          </div>
        </div>
        <FloatInput label="Date de paiement" type="date" value={paymentDate} onChange={setPaymentDate} />
      </Modal>
    </div>
  )
}
