import { useState, useCallback, useMemo } from 'react'
import { Plus, ChevronRight, Trash2, Copy, Camera, Lightbulb, Compass, Home, Layers, FileText, X, Check } from 'lucide-react'
import { FloatInput, FloatSelect, FloatTextarea } from '../../ui/FloatInput'
import type { MurFiche, MenuiserieMur } from '../../../types'
import {
  ORIENTATIONS, TYPES_MUR_COMPOSITION, TYPES_DOUBLAGE, TYPES_ISOLANT, TYPES_MENUISERIE, TYPES_VITRAGE,
  labelFromValue,
} from '../../../lib/constants'
import { calculerUValue } from '../../../lib/3cl/moteur3CL'
import { MenuiserieEditSheet } from './MenuiserieEditSheet'

const WALL_STEPS = [
  { id: 1, label: 'FAÇADE & PHOTO' },
  { id: 2, label: 'LE MUR' },
  { id: 3, label: 'DÉTAILS' },
  { id: 4, label: 'MENUISERIES' },
  { id: 5, label: 'NOTES' },
]

const HAUTEUR_TYPES = [
  { value: 'plat', label: 'Plat', desc: 'Plafond horizontal standard' },
  { value: 'pointe', label: 'En pointe', desc: 'Sous combles / toiture en pente' },
]

function makeEmptyWall(index: number): MurFiche {
  return {
    id: `wall_${Date.now()}_${index}`,
    orientation: '',
    position: '',
    type_doublage: '',
    composition: '',
    epaisseur_cm: null,
    longueur_m: null,
    hauteur_type: null,
    hauteur_m: null,
    isole: '',
    isolant_type: '',
    epaisseur_isolant_cm: null,
    mur_lourd: '',
    paroi_ancienne: '',
    retour_iso_menuiseries: '',
    menuiseries: [],
    notes: '',
    etape_active: 1,
    u_value: null,
    photos: [],
  }
}

interface Props {
  murs: MurFiche[] | undefined
  onChange: (murs: MurFiche[]) => void
  currentEtape: number
  onNext: () => void
  onPrev: () => void
}

export function Section03Murs({ murs, onChange, currentEtape, onNext, onPrev }: Props) {
  const list = murs || []
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingStep, setEditingStep] = useState(1)
  const [menuSheetOpen, setMenuSheetOpen] = useState(false)
  const [editingMenuiserieId, setEditingMenuiserieId] = useState<string | null>(null)

  const updateWall = useCallback((id: string, patch: Partial<MurFiche>) => {
    onChange(list.map(w => w.id === id ? { ...w, ...patch } : w))
  }, [list, onChange])

  const addWall = useCallback(() => {
    const newWall = makeEmptyWall(list.length + 1)
    onChange([...list, newWall])
    setEditingId(newWall.id)
    setEditingStep(1)
  }, [list, onChange])

  const duplicateWall = useCallback((id: string) => {
    const wall = list.find(w => w.id === id)
    if (!wall) return
    const dup = { ...wall, id: `wall_${Date.now()}_dup`, menuiseries: wall.menuiseries.map(m => ({ ...m, id: `menu_${Date.now()}_${Math.random()}` })) }
    onChange([...list, dup])
  }, [list, onChange])

  const deleteWall = useCallback((id: string) => {
    onChange(list.filter(w => w.id !== id))
    if (editingId === id) setEditingId(null)
  }, [list, onChange, editingId])

  const editingWall = useMemo(() => list.find(w => w.id === editingId) || null, [list, editingId])

  const surfaceMur = useMemo(() => {
    if (!editingWall?.longueur_m || !editingWall?.hauteur_m) return null
    return Math.round(editingWall.longueur_m * editingWall.hauteur_m * 10) / 10
  }, [editingWall])

  const uMurBrut = useMemo(() => {
    if (!editingWall?.composition) return null
    return calculerUValue(editingWall.composition, 'non', null)
  }, [editingWall?.composition])

  const uMurFinal = useMemo(() => {
    if (!editingWall?.composition) return null
    return calculerUValue(editingWall.composition, editingWall.isole, editingWall.epaisseur_isolant_cm, editingWall.isolant_type)
  }, [editingWall])

  const updateMenuiserie = useCallback((menuId: string, patch: Partial<MenuiserieMur>) => {
    if (!editingWall) return
    const updated = editingWall.menuiseries.map(m => m.id === menuId ? { ...m, ...patch } : m)
    updateWall(editingWall.id, { menuiseries: updated })
  }, [editingWall, updateWall])

  const addMenuiserie = useCallback((menu: MenuiserieMur) => {
    if (!editingWall) return
    updateWall(editingWall.id, { menuiseries: [...editingWall.menuiseries, menu] })
  }, [editingWall, updateWall])

  const deleteMenuiserie = useCallback((menuId: string) => {
    if (!editingWall) return
    updateWall(editingWall.id, { menuiseries: editingWall.menuiseries.filter(m => m.id !== menuId) })
  }, [editingWall, updateWall])

  const handleSaveMenuSheet = useCallback((menu: MenuiserieMur) => {
    if (editingMenuiserieId) {
      updateMenuiserie(editingMenuiserieId, menu)
    } else {
      addMenuiserie(menu)
    }
    setMenuSheetOpen(false)
    setEditingMenuiserieId(null)
  }, [editingMenuiserieId, updateMenuiserie, addMenuiserie])

  const menuiserieSurface = (m: MenuiserieMur) => {
    if (!m.largeur_m || !m.hauteur_m) return null
    return Math.round(m.largeur_m * m.hauteur_m * 100) / 100
  }

  // ===== Wall list page =====
  if (currentEtape === 0) {
    return (
      <div>
        <div className="audit-section-title">Section 3 — Murs</div>
        <div className="audit-section-desc">Ajoutez chaque mur du logement. Pour chaque mur, renseignez la façade, la composition, l'isolation et les menuiseries associées.</div>

        <div className="info-banner info-banner-green">
          <Compass />
          <div><b>Astuce :</b> Cliquez sur un mur pour le détailler. L'U-valeur est calculée automatiquement à partir de la composition et de l'isolation.</div>
        </div>

        <div className="wall-accordion">
          {list.map((wall, idx) => {
            const uVal = wall.composition ? calculerUValue(wall.composition, wall.isole, wall.epaisseur_isolant_cm, wall.isolant_type) : null
            const surface = wall.longueur_m && wall.hauteur_m ? Math.round(wall.longueur_m * wall.hauteur_m * 10) / 10 : null
            const isOpen = editingId === wall.id
            return (
              <div key={wall.id} className="wall-accordion-item">
                <div className="wall-accordion-header" onClick={() => { setEditingId(isOpen ? null : wall.id); setEditingStep(1) }}>
                  <div className="wall-num-badge">MUR #{idx + 1}</div>
                  <div className="wall-accordion-info">
                    <div className="wall-accordion-title">
                      {wall.orientation ? labelFromValue(ORIENTATIONS.map(o => ({ value: o.code, label: o.label })), wall.orientation) : 'Non défini'}
                    </div>
                    <div className="wall-accordion-meta">
                      {wall.composition ? labelFromValue(TYPES_MUR_COMPOSITION, wall.composition) : 'Composition non renseignée'}
                      {surface && ` · ${surface} m²`}
                      {uVal !== null && ` · U = ${uVal} W/m².K`}
                      {wall.menuiseries.length > 0 && ` · ${wall.menuiseries.length} menuiserie${wall.menuiseries.length > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <div className="wall-accordion-actions" onClick={e => e.stopPropagation()}>
                    <button className="wall-dup-btn" onClick={() => duplicateWall(wall.id)}>Dupliquer</button>
                    <button className="wall-del-btn" onClick={() => deleteWall(wall.id)}>Supprimer</button>
                    <ChevronRight className={`wall-accordion-arrow ${isOpen ? 'open' : ''}`} size={18} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button className="wall-add-btn" onClick={addWall}>
          <Plus size={20} /> Ajouter un mur
        </button>

        <div className="wall-nav-row" style={{ marginTop: 32 }}>
          <button className="btn-wall-nav btn-wall-prev" onClick={onPrev}>Précédent</button>
          <button className="btn-wall-nav btn-wall-next" onClick={onNext} disabled={list.length === 0}>
            Continuer vers Menuiseries
          </button>
        </div>
      </div>
    )
  }

  // ===== Wall editing pages (étapes 1-5) =====
  if (!editingWall) {
    return (
      <div className="section-stub">
        <Home />
        <h3>Aucun mur sélectionné</h3>
        <p>Revenez à la liste des murs et cliquez sur un mur pour le détailler, ou ajoutez un nouveau mur.</p>
        <button className="btn btn-primary mt-6" onClick={onPrev}>← Retour à la liste</button>
      </div>
    )
  }

  const wallIndex = list.findIndex(w => w.id === editingWall.id) + 1

  // ---- ÉTAPE 1: Façade & photo ----
  if (editingStep === 1) {
    return (
      <WallStepLayout
        wallIndex={wallIndex}
        stepNum={1}
        stepLabel="FAÇADE & PHOTO"
        step={editingStep}
        setStep={setEditingStep}
        onPrev={onPrev}
        onClose={() => { setEditingId(null); onPrev() }}
      >
        <div className="info-banner info-banner-green">
          <Compass />
          <div>Sélectionnez l'orientation de la façade avec la boussole, puis ajoutez une photo du mur.</div>
        </div>

        <div className="flex gap-6 items-center" style={{ marginBottom: 24 }}>
          <div className="compact-compass">
            <div className="compact-compass-circle" />
            <div className="compact-compass-cross" />
            <div className="compact-compass-center">FACE</div>
            {ORIENTATIONS.map(o => (
              <button
                key={o.code}
                className={`compact-compass-btn ${o.code} ${editingWall.orientation === o.code ? 'sel' : ''}`}
                onClick={() => updateWall(editingWall.id, { orientation: o.code })}
              >
                {o.code}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <FloatInput
              label="Position du mur (description)"
              value={editingWall.position}
              onChange={v => updateWall(editingWall.id, { position: v })}
            />
            <div className="text-xs text-muted mt-4">
              Orientation sélectionnée : <b style={{ color: 'var(--c-primary-600)' }}>
                {editingWall.orientation ? labelFromValue(ORIENTATIONS.map(o => ({ value: o.code, label: o.label })), editingWall.orientation) : '—'}
              </b>
            </div>
          </div>
        </div>

        <div className="section-label">Photo du mur</div>
        <div className="photo-grid" style={{ maxWidth: 400 }}>
          {(editingWall.photos || []).map((photo, i) => (
            <div key={i} className="photo-slot has-photo">
              <img src={photo} alt={`Mur ${i + 1}`} />
              <button
                type="button"
                className="photo-slot-remove"
                onClick={() => updateWall(editingWall.id, { photos: (editingWall.photos || []).filter((_, idx) => idx !== i) })}
                title="Supprimer cette photo"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <label className="photo-slot">
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => {
              const file = e.target.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = () => updateWall(editingWall.id, { photos: [...(editingWall.photos || []), reader.result as string] })
                reader.readAsDataURL(file)
              }
            }} />
            <Camera /><span>Ajouter une photo</span>
          </label>
        </div>
      </WallStepLayout>
    )
  }

  // ---- ÉTAPE 2: Le mur ----
  if (editingStep === 2) {
    return (
      <WallStepLayout
        wallIndex={wallIndex}
        stepNum={2}
        stepLabel="LE MUR"
        step={editingStep}
        setStep={setEditingStep}
        onPrev={onPrev}
        onClose={() => { setEditingId(null); onPrev() }}
      >
        <div className="audit-form-section">
          <div className="audit-form-section-title">Position & doublage</div>
          <FloatInput label="Position du mur (ex: façade avant, pignon...)" value={editingWall.position} onChange={v => updateWall(editingWall.id, { position: v })} />
          <div className="doublage-grid mt-4">
            {TYPES_DOUBLAGE.map(t => (
              <button
                key={t.value}
                className={`doublage-card ${editingWall.type_doublage === t.value ? 'sel' : ''}`}
                onClick={() => updateWall(editingWall.id, { type_doublage: t.value })}
              >
                <div className="doublage-badge">{t.label[0]}</div>
                <div className="doublage-card-label">{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="audit-form-section">
          <div className="audit-form-section-title">Composition & épaisseur</div>
          <div className="audit-form-grid">
            <FloatSelect
              label="Composition"
              value={editingWall.composition}
              onChange={v => updateWall(editingWall.id, { composition: v })}
              options={TYPES_MUR_COMPOSITION}
            />
            <FloatInput
              label="Épaisseur mur (cm)"
              type="number"
              value={editingWall.epaisseur_cm}
              onChange={v => updateWall(editingWall.id, { epaisseur_cm: v ? +v : null })}
            />
          </div>
        </div>

        <div className="audit-form-section">
          <div className="audit-form-section-title">Dimensions</div>
          <div className="audit-form-grid cols-3">
            <FloatInput label="Longueur (m)" type="number" value={editingWall.longueur_m} onChange={v => updateWall(editingWall.id, { longueur_m: v ? +v : null })} />
            <FloatInput label="Hauteur (m)" type="number" value={editingWall.hauteur_m} onChange={v => updateWall(editingWall.id, { hauteur_m: v ? +v : null })} />
            <div />
          </div>

          <div className="section-label mt-4" style={{ marginBottom: 12 }}>Le haut de ce mur ?</div>
          <div className="hauteur-grid">
            {HAUTEUR_TYPES.map(h => (
              <button
                key={h.value}
                className={`hauteur-card ${editingWall.hauteur_type === h.value ? 'sel' : ''}`}
                onClick={() => updateWall(editingWall.id, { hauteur_type: h.value as 'plat' | 'pointe' })}
              >
                {h.value === 'plat' ? <Home /> : <Layers />}
                <div className="hauteur-card-label">{h.label}</div>
                <div className="hauteur-card-desc">{h.desc}</div>
              </button>
            ))}
          </div>

          {surfaceMur !== null && (
            <div className="computed-row">
              <div className="computed-row-left">
                <div className="computed-row-icon"><Compass size={18} /></div>
                <div className="computed-row-body">
                  <div className="lbl">Surface du mur</div>
                  <div className="formula">{editingWall.longueur_m} × {editingWall.hauteur_m}</div>
                </div>
              </div>
              <div className="computed-row-value">{surfaceMur} m²</div>
            </div>
          )}
        </div>

        <div className="audit-form-section">
          <div className="audit-form-section-title">Isolation</div>
          <div className="section-label" style={{ marginBottom: 12 }}>Le mur est-il isolé ?</div>
          <div className="doublage-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button className={`doublage-card ${editingWall.isole === 'oui' ? 'sel' : ''}`} onClick={() => updateWall(editingWall.id, { isole: 'oui' })}>
              <div className="doublage-badge">O</div><div className="doublage-card-label">Oui, isolé</div>
            </button>
            <button className={`doublage-card ${editingWall.isole === 'non' ? 'sel' : ''}`} onClick={() => updateWall(editingWall.id, { isole: 'non' })}>
              <div className="doublage-badge">N</div><div className="doublage-card-label">Non, non isolé</div>
            </button>
          </div>

          {editingWall.isole === 'oui' && (
            <div className="audit-form-grid mt-4">
              <FloatSelect
                label="Type d'isolant"
                value={editingWall.isolant_type}
                onChange={v => updateWall(editingWall.id, { isolant_type: v })}
                options={TYPES_ISOLANT}
              />
              <FloatInput
                label="Épaisseur isolant (cm)"
                type="number"
                value={editingWall.epaisseur_isolant_cm}
                onChange={v => updateWall(editingWall.id, { epaisseur_isolant_cm: v ? +v : null })}
              />
            </div>
          )}
        </div>

        {uMurBrut !== null && (
          <div className="computed-row">
            <div className="computed-row-left">
              <div className="computed-row-icon"><Layers size={18} /></div>
              <div className="computed-row-body">
                <div className="lbl">U mur brut (sans isolation)</div>
                <div className="formula">Composition: {labelFromValue(TYPES_MUR_COMPOSITION, editingWall.composition)}</div>
              </div>
            </div>
            <div className="computed-row-value">{uMurBrut} W/m².K</div>
          </div>
        )}

        {uMurFinal !== null && (
          <div className="computed-row">
            <div className="computed-row-left">
              <div className="computed-row-icon"><Check size={18} /></div>
              <div className="computed-row-body">
                <div className="lbl">U mur final (avec isolation)</div>
                <div className="formula">{editingWall.isole === 'oui' ? `${labelFromValue(TYPES_ISOLANT, editingWall.isolant_type)} ${editingWall.epaisseur_isolant_cm}cm` : 'Non isolé'}</div>
              </div>
            </div>
            <div className="computed-row-value">{uMurFinal} W/m².K</div>
          </div>
        )}
      </WallStepLayout>
    )
  }

  // ---- ÉTAPE 3: Détails ----
  if (editingStep === 3) {
    const ynFields = [
      { key: 'mur_lourd', label: 'Mur lourd (inertie)', value: editingWall.mur_lourd },
      { key: 'paroi_ancienne', label: 'Paroi ancienne (avant 1948)', value: editingWall.paroi_ancienne },
      { key: 'retour_iso_menuiseries', label: 'Retour d\'isolation au niveau des menuiseries', value: editingWall.retour_iso_menuiseries },
    ] as const

    return (
      <WallStepLayout
        wallIndex={wallIndex}
        stepNum={3}
        stepLabel="DÉTAILS"
        step={editingStep}
        setStep={setEditingStep}
        onPrev={onPrev}
        onClose={() => { setEditingId(null); onPrev() }}
      >
        <div className="info-banner">
          <Lightbulb />
          <div>Renseignez les caractéristiques techniques avancées du mur pour affiner le calcul 3CL.</div>
        </div>

        {ynFields.map(f => (
          <div key={f.key}>
            <div className="section-label" style={{ marginBottom: 8 }}>{f.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <button
                className={`yn-field ${f.value === 'oui' ? 'sel' : ''}`}
                onClick={() => updateWall(editingWall.id, { [f.key]: 'oui' } as any)}
              >
                <div className="yn-field-body">
                  <div className="yn-label">Oui</div>
                  <div className="yn-value">OUI</div>
                </div>
                <Check className="yn-check" size={20} />
              </button>
              <button
                className={`yn-field ${f.value === 'non' ? 'sel' : ''}`}
                onClick={() => updateWall(editingWall.id, { [f.key]: 'non' } as any)}
              >
                <div className="yn-field-body">
                  <div className="yn-label">Non</div>
                  <div className="yn-value">NON</div>
                </div>
                <Check className="yn-check" size={20} />
              </button>
            </div>
          </div>
        ))}
      </WallStepLayout>
    )
  }

  // ---- ÉTAPE 4: Menuiseries ----
  if (editingStep === 4) {
    return (
      <WallStepLayout
        wallIndex={wallIndex}
        stepNum={4}
        stepLabel="MENUISERIES"
        step={editingStep}
        setStep={setEditingStep}
        onPrev={onPrev}
        onClose={() => { setEditingId(null); onPrev() }}
      >
        <div className="menu-section-header">
          <div className="menu-section-icon blue"><Compass size={18} /></div>
          <div className="menu-section-title">Menuiseries du mur</div>
          <div className="menu-section-count">{editingWall.menuiseries.length} menuiserie{editingWall.menuiseries.length > 1 ? 's' : ''}</div>
        </div>

        {editingWall.menuiseries.length === 0 && (
          <div className="text-muted text-sm mb-4">Aucune menuiserie sur ce mur. Cliquez sur « Ajouter une menuiserie » pour en créer une.</div>
        )}

        {editingWall.menuiseries.map(m => {
          const surf = menuiserieSurface(m)
          return (
            <div key={m.id} className="menu-item-row">
              <div className="menu-item-info">
                <div className="menu-item-name">{labelFromValue(TYPES_MENUISERIE, m.type_menuiserie)}</div>
                <div className="menu-item-details">
                  {labelFromValue(TYPES_VITRAGE, m.vitrage)}
                  {m.largeur_m && m.hauteur_m && ` · ${m.largeur_m} × ${m.hauteur_m} m`}
                  {surf && ` · ${surf} m²`}
                </div>
              </div>
              <div className="menu-item-actions">
                <button className="menu-dup-btn" onClick={() => {
                  const dup = { ...m, id: `menu_${Date.now()}_dup` }
                  updateWall(editingWall.id, { menuiseries: [...editingWall.menuiseries, dup] })
                }}>Dupliquer</button>
                <button className="menu-arrow-btn" onClick={() => { setEditingMenuiserieId(m.id); setMenuSheetOpen(true) }}>
                  <ChevronRight size={20} />
                </button>
                <button className="menu-arrow-btn" onClick={() => deleteMenuiserie(m.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        })}

        <button className="menu-add-dark" onClick={() => { setEditingMenuiserieId(null); setMenuSheetOpen(true) }}>
          <Plus size={18} /> Ajouter une menuiserie
        </button>

        {menuSheetOpen && (
          <MenuiserieEditSheet
            menuiserie={editingMenuiserieId ? editingWall.menuiseries.find(m => m.id === editingMenuiserieId) || null : null}
            wallOrientation={editingWall.orientation}
            onClose={() => { setMenuSheetOpen(false); setEditingMenuiserieId(null) }}
            onSave={handleSaveMenuSheet}
            onDelete={editingMenuiserieId ? () => { deleteMenuiserie(editingMenuiserieId); setMenuSheetOpen(false); setEditingMenuiserieId(null) } : undefined}
          />
        )}
      </WallStepLayout>
    )
  }

  // ---- ÉTAPE 5: Notes ----
  return (
    <WallStepLayout
      wallIndex={wallIndex}
      stepNum={5}
      stepLabel="NOTES"
      step={editingStep}
      setStep={setEditingStep}
      onPrev={onPrev}
      onClose={() => { setEditingId(null); onPrev() }}
    >
      <div className="audit-form-section">
        <div className="audit-form-section-title">Notes et observations</div>
        <FloatTextarea
          label="Notes spécifiques à ce mur (pathologies, particularités...)"
          value={editingWall.notes}
          onChange={v => updateWall(editingWall.id, { notes: v })}
        />
      </div>

      <div className="recap-card">
        <div className="recap-card-title">
          <FileText size={16} /> Récapitulatif — MUR #{wallIndex}
        </div>
        <div className="recap-row"><span className="key">Orientation</span><span className="val">{editingWall.orientation ? labelFromValue(ORIENTATIONS.map(o => ({ value: o.code, label: o.label })), editingWall.orientation) : '—'}</span></div>
        <div className="recap-row"><span className="key">Position</span><span className="val">{editingWall.position || '—'}</span></div>
        <div className="recap-row"><span className="key">Composition</span><span className="val">{editingWall.composition ? labelFromValue(TYPES_MUR_COMPOSITION, editingWall.composition) : '—'}</span></div>
        <div className="recap-row"><span className="key">Épaisseur</span><span className="val">{editingWall.epaisseur_cm ? `${editingWall.epaisseur_cm} cm` : '—'}</span></div>
        <div className="recap-row"><span className="key">Surface</span><span className="val">{surfaceMur ? `${surfaceMur} m²` : '—'}</span></div>
        <div className="recap-row"><span className="key">Isolé</span><span className="val">{editingWall.isole === 'oui' ? 'Oui' : editingWall.isole === 'non' ? 'Non' : '—'}</span></div>
        {editingWall.isole === 'oui' && (
          <>
            <div className="recap-row"><span className="key">Isolant</span><span className="val">{editingWall.isolant_type ? labelFromValue(TYPES_ISOLANT, editingWall.isolant_type) : '—'}</span></div>
            <div className="recap-row"><span className="key">Épaisseur isolant</span><span className="val">{editingWall.epaisseur_isolant_cm ? `${editingWall.epaisseur_isolant_cm} cm` : '—'}</span></div>
          </>
        )}
        <div className="recap-row"><span className="key">U mur final</span><span className="val">{uMurFinal !== null ? `${uMurFinal} W/m².K` : '—'}</span></div>
        <div className="recap-row"><span className="key">Menuiseries</span><span className="val">{editingWall.menuiseries.length}</span></div>
        <div className="recap-row"><span className="key">Mur lourd</span><span className="val">{editingWall.mur_lourd === 'oui' ? 'Oui' : editingWall.mur_lourd === 'non' ? 'Non' : '—'}</span></div>
        <div className="recap-row"><span className="key">Paroi ancienne</span><span className="val">{editingWall.paroi_ancienne === 'oui' ? 'Oui' : editingWall.paroi_ancienne === 'non' ? 'Non' : '—'}</span></div>
      </div>

      <div className="flex gap-3 mt-6">
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setEditingId(null); onPrev() }}>
          <Check size={18} /> Valider ce mur
        </button>
        <button className="btn btn-secondary" onClick={addWall}>
          <Plus size={18} /> Ajouter un autre mur
        </button>
      </div>
    </WallStepLayout>
  )
}

// ===== Wall step layout wrapper =====
function WallStepLayout({
  wallIndex, stepNum, stepLabel, step, setStep, onPrev, onClose, children,
}: {
  wallIndex: number
  stepNum: number
  stepLabel: string
  step: number
  setStep: (s: number) => void
  onPrev: () => void
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mode-badge">MUR #{wallIndex} · Édition en cours</div>

      <div className="wall-step-strip">
        <span>SECTION 3 SUR 9 · L'ENVELOPPE · ÉTAPE {stepNum} SUR 5</span>
        <span className="wall-step-tab-label">{stepLabel}</span>
      </div>
      <div className="wall-step-bar">
        {WALL_STEPS.map(s => (
          <div key={s.id} className={`wall-step-seg ${s.id < step ? 'done' : s.id === step ? 'cur' : ''}`} />
        ))}
      </div>

      <div className="wall-step-content">
        {children}

        <div className="wall-nav-row">
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-wall-nav btn-wall-prev" onClick={onClose}>← Retour à la liste</button>
            {step > 1 && (
              <button className="btn-wall-nav btn-wall-prev" onClick={() => setStep(step - 1)}>Précédent</button>
            )}
          </div>
          {step < 5 && (
            <button className="btn-wall-nav btn-wall-next" onClick={() => setStep(step + 1)}>
              Continuer →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
