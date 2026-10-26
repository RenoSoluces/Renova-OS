import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Calendar, MapPin, Clock, ChevronLeft, ChevronRight, Users, User as UserIcon, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import type { PlanningEvent, CommissionBareme } from '../types'
import { FloatInput, FloatSelect, FloatTextarea } from '../components/ui/FloatInput'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { euro } from '../lib/crm/constants'
import { AbonnementAgenda } from '../components/agenda/AbonnementAgenda'
import { ConnexionGoogleAgenda } from '../components/agenda/ConnexionGoogleAgenda'

const TYPES = [
  { value: 'visite', label: 'Visite technique (VT)' },
  { value: 'rdv', label: 'Rendez-vous' },
  { value: 'formation', label: 'Formation' },
]

const TYPE_BADGE: Record<string, string> = {
  visite: 'badge-accent', rdv: 'badge-info', formation: 'badge-warning',
}

interface CommercialProfile {
  id: string
  nom_complet: string
  couleur: string
  role: string
}

function startOfWeek(d = new Date()) {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

const EMPTY = {
  titre: '', date: '', heure: '09:00', type: 'visite', adresse: '', notes: '', user_id: '',
  commission_commercial: '', commission_societe: '',
}

export function PlanningPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  const [events, setEvents] = useState<PlanningEvent[]>([])
  const [commerciaux, setCommerciaux] = useState<CommercialProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  // Vue admin/manager : 'all' = agenda de toute l'équipe, sinon l'id du commercial filtré.
  const [filtreCommercial, setFiltreCommercial] = useState<string>('all')
  // Barème VT actif, pour préremplir les montants de commission par défaut.
  const [baremeVt, setBaremeVt] = useState<CommissionBareme | null>(null)

  const start = useMemo(() => {
    const s = startOfWeek()
    s.setDate(s.getDate() + weekOffset * 7)
    return s
  }, [weekOffset])

  const fetchCommerciaux = useCallback(async () => {
    if (!isAdmin) return
    const { data } = await supabase.from('profiles').select('id, nom_complet, couleur, role').order('nom_complet')
    setCommerciaux((data || []) as CommercialProfile[])
  }, [isAdmin])

  const fetchEvents = useCallback(async () => {
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    let query = supabase
      .from('planning_events')
      .select('*')
      .gte('date', start.toISOString().slice(0, 10))
      .lte('date', end.toISOString().slice(0, 10))
      .order('date', { ascending: true })
      .order('heure', { ascending: true })

    // Un commercial ne voit que son propre agenda (la RLS l'impose déjà côté base,
    // ce filtre côté client évite en plus d'afficher les événements non attribués d'autrui).
    if (!isAdmin && profile?.id) {
      query = query.or(`user_id.eq.${profile.id},user_id.is.null`)
    } else if (isAdmin && filtreCommercial !== 'all') {
      query = query.eq('user_id', filtreCommercial)
    }

    const { data, error } = await query
    if (error) { setEvents([]); return }
    setEvents((data || []) as PlanningEvent[])
  }, [start, isAdmin, profile?.id, filtreCommercial])

  useEffect(() => { fetchCommerciaux() }, [fetchCommerciaux])
  useEffect(() => { setLoading(true); fetchEvents().finally(() => setLoading(false)) }, [fetchEvents])

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('commission_bareme')
      .select('*')
      .eq('type', 'vt')
      .eq('actif', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setBaremeVt((data as CommissionBareme) || null))
  }, [isAdmin])

  const commercialById = useCallback(
    (id: string | null) => commerciaux.find(c => c.id === id) || null,
    [commerciaux]
  )

  async function save() {
    if (!form.titre || !form.date) return
    setSaving(true)
    const assigneA = isAdmin ? (form.user_id || profile?.id || null) : (profile?.id || null)
    const estVt = isAdmin && form.type === 'visite' && !!assigneA
    const { error } = await supabase.from('planning_events').insert({
      titre: form.titre, date: form.date, heure: form.heure,
      type: form.type, adresse: form.adresse, notes: form.notes,
      user_id: assigneA,
      commission_montant_commercial: estVt ? (parseFloat(form.commission_commercial) || 0) : null,
      commission_montant_societe: estVt ? (parseFloat(form.commission_societe) || 0) : null,
    })
    setSaving(false)
    if (error) { alert(`Échec de l'enregistrement : ${error.message}`); return }
    setModalOpen(false)
    setForm({ ...EMPTY })
    fetchEvents()
  }

  const days: { date: Date; events: PlanningEvent[] }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    days.push({ date: d, events: events.filter(e => (e.date || '').slice(0, 10) === key) })
  }

  const todayKey = new Date().toISOString().slice(0, 10)
  const fmtDay = (d: Date) =>
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })

  function openNewEventModal(dateKey: string) {
    setForm({
      ...EMPTY,
      date: dateKey,
      user_id: isAdmin ? (profile?.id || '') : '',
      commission_commercial: isAdmin && baremeVt ? String(baremeVt.montant_commercial) : '',
      commission_societe: isAdmin && baremeVt ? String(baremeVt.montant_societe) : '',
    })
    setModalOpen(true)
  }

  function onTypeChange(v: string) {
    setForm(f => ({
      ...f,
      type: v,
      // Préremplissage depuis le barème VT actif dès qu'on bascule sur une VT.
      commission_commercial: v === 'visite' && isAdmin && baremeVt ? String(baremeVt.montant_commercial) : f.commission_commercial,
      commission_societe: v === 'visite' && isAdmin && baremeVt ? String(baremeVt.montant_societe) : f.commission_societe,
    }))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? 'Agenda de l\'équipe' : 'Mon agenda'}</h1>
          <p className="page-subtitle">
            Semaine du {start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            {isAdmin && filtreCommercial !== 'all' && commercialById(filtreCommercial)
              ? ` · ${commercialById(filtreCommercial)!.nom_complet}` : ''}
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={() => setWeekOffset(o => o - 1)} aria-label="Semaine précédente">
              <ChevronLeft size={18} />
            </Button>
            <Button variant="ghost" onClick={() => setWeekOffset(0)}>Aujourd'hui</Button>
            <Button variant="ghost" onClick={() => setWeekOffset(o => o + 1)} aria-label="Semaine suivante">
              <ChevronRight size={18} />
            </Button>
          </div>
          {isAdmin && (
            <div style={{ minWidth: 220 }}>
              <FloatSelect
                label="Commercial"
                value={filtreCommercial}
                onChange={setFiltreCommercial}
                options={[
                  { value: 'all', label: `Toute l'équipe (${commerciaux.length})` },
                  ...commerciaux.map(c => ({ value: c.id, label: c.nom_complet || c.role })),
                ]}
              />
            </div>
          )}
          <Button variant="primary" onClick={() => openNewEventModal(todayKey)}>
            <Plus size={18} /> Nouvel événement
          </Button>
        </div>
      </div>

      <ConnexionGoogleAgenda onSynchronise={() => { void fetchEvents() }} />
      <AbonnementAgenda />

      {isAdmin && commerciaux.length > 0 && (
        <div className="flex items-center gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
          <Users size={14} className="text-muted" />
          <span className="text-sm text-muted">Légende :</span>
          {commerciaux.map(c => (
            <span key={c.id} className="flex items-center gap-1 text-sm" style={{ marginRight: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: c.couleur || '#3A86C8', display: 'inline-block' }} />
              {c.nom_complet || c.role}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card"><div className="card-pad text-muted">Chargement…</div></div>
      ) : days.every(d => d.events.length === 0) ? (
        <div className="card">
          <div className="empty-state">
            <Calendar size={40} />
            <h3>Aucun événement cette semaine</h3>
            <p>{isAdmin ? 'Planifiez les visites, rendez-vous et formations de votre équipe.' : 'Planifiez vos visites, rendez-vous et formations.'}</p>
            <Button variant="primary" onClick={() => openNewEventModal(todayKey)}>
              <Plus size={18} /> Nouvel événement
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-2 gap-4">
          {days.map(d => {
            const dateKey = d.date.toISOString().slice(0, 10)
            return (
              <div className="card" key={d.date.toISOString()}>
                <div className="card-header">
                  <div className="card-title flex items-center gap-2">
                    <span>{fmtDay(d.date)}</span>
                    {dateKey === todayKey && (
                      <span className="badge badge-accent">Aujourd'hui</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openNewEventModal(dateKey)}>
                    <Plus size={14} />
                  </Button>
                </div>
                <div className="card-body">
                  {d.events.length === 0 ? (
                    <p className="text-muted text-sm">Aucun événement</p>
                  ) : (
                    d.events.map(e => {
                      const commercial = commercialById(e.user_id)
                      const couleur = isAdmin ? (commercial?.couleur || 'var(--c-primary)') : 'var(--c-primary)'
                      return (
                        <div key={e.id} className="flex gap-3 mb-4" style={{ borderLeft: `3px solid ${couleur}`, paddingLeft: 12 }}>
                          <div className="flex items-center gap-2 text-sm font-semibold" style={{ minWidth: 52 }}>
                            <Clock size={14} /> {e.heure}
                          </div>
                          <div className="flex-col gap-2">
                            <div className="font-semibold">{e.titre}</div>
                            <div className="flex items-center gap-2 text-sm text-muted">
                              <MapPin size={14} /> {e.adresse || '—'}
                            </div>
                            <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                              <span className={`badge ${TYPE_BADGE[e.type] || 'badge-neutral'}`}>{e.type === 'google' ? 'Google' : e.type}</span>
                              {isAdmin && (
                                <span className="badge badge-neutral flex items-center gap-1">
                                  <UserIcon size={11} /> {commercial?.nom_complet || 'Non attribué'}
                                </span>
                              )}
                              {e.type === 'visite' && e.user_id && (e.commission_montant_commercial || 0) > 0 && (
                                <span className="badge badge-success flex items-center gap-1" title="Commission générée pour cette VT">
                                  <Wallet size={11} /> {euro(e.commission_montant_commercial)}
                                  {isAdmin && <> / {euro(e.commission_montant_societe)} société</>}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvel événement"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Ajouter'}
            </Button>
          </>
        }
      >
        <FloatInput label="Titre" value={form.titre} onChange={v => setForm({ ...form, titre: v })} />
        <div className="grid grid-2 gap-3 mt-4">
          <FloatInput label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
          <FloatInput label="Heure" type="time" value={form.heure} onChange={v => setForm({ ...form, heure: v })} />
        </div>
        <div className="mt-4">
          <FloatSelect label="Type" value={form.type} onChange={onTypeChange} options={TYPES} />
        </div>
        {isAdmin && (
          <div className="mt-4">
            <FloatSelect
              label="Attribué à (commercial ou technicien)"
              value={form.user_id}
              onChange={v => setForm({ ...form, user_id: v })}
              options={commerciaux.map(c => ({ value: c.id, label: c.nom_complet || c.role }))}
            />
          </div>
        )}
        {isAdmin && form.type === 'visite' && (
          <div className="card" style={{ marginTop: 16, padding: 12, background: 'var(--c-bg-soft, #F5F7F5)' }}>
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ marginBottom: 8 }}>
              <Wallet size={14} /> Commission de cette VT
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 10 }}>
              Montant reversé au commercial/technicien et coût réel côté société. Préremplis depuis le
              barème par défaut (page Commissions), modifiables au cas par cas.
            </p>
            <div className="grid grid-2 gap-3">
              <FloatInput
                label="Montant commercial (€)"
                type="number"
                value={form.commission_commercial}
                onChange={v => setForm({ ...form, commission_commercial: v })}
              />
              <FloatInput
                label="Montant société (€)"
                type="number"
                value={form.commission_societe}
                onChange={v => setForm({ ...form, commission_societe: v })}
              />
            </div>
          </div>
        )}
        <div className="mt-4">
          <FloatInput label="Adresse" value={form.adresse} onChange={v => setForm({ ...form, adresse: v })} />
        </div>
        <div className="mt-4">
          <FloatTextarea label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} rows={3} />
        </div>
      </Modal>
    </div>
  )
}
