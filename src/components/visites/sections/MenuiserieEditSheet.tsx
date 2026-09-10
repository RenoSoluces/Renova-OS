import { useState, useCallback } from 'react'
import { X, Compass, ChevronDown, ChevronUp } from 'lucide-react'
import { FloatInput } from '../../ui/FloatInput'
import { PhotoGrid } from '../../shared/PhotoGrid'
import type { MenuiserieMur } from '../../../types'
import {
  TYPES_MENUISERIE, TYPES_VITRAGE, MATERIAUX_MENUISERIE, ORIENTATIONS,
  labelFromValue,
} from '../../../lib/constants'

const MENUISERIE_ICONS: Record<string, string> = {
  fenetre: '🪟',
  porte_fenetre: '🚪',
  baie_vitree: 'LTRB',
  porte: '🚪',
  vasistas: '▭',
  chassis: '□',
}

interface Props {
  menuiserie: MenuiserieMur | null
  wallOrientation: string
  onClose: () => void
  onSave: (menu: MenuiserieMur) => void
  onDelete?: () => void
}

export function MenuiserieEditSheet({ menuiserie, wallOrientation, onClose, onSave, onDelete }: Props) {
  const [type, setType] = useState(menuiserie?.type_menuiserie || '')
  const [vitrage, setVitrage] = useState(menuiserie?.vitrage || '')
  const [materiau, setMateriau] = useState((menuiserie as any)?.materiau || '')
  const [largeur, setLargeur] = useState(menuiserie?.largeur_m?.toString() || '')
  const [hauteur, setHauteur] = useState(menuiserie?.hauteur_m?.toString() || '')
  const [orientation, setOrientation] = useState(menuiserie && (menuiserie as any).orientation ? (menuiserie as any).orientation : wallOrientation || '')
  const [nombre, setNombre] = useState((menuiserie as any)?.nombre?.toString() || '1')
  const [murRattache, setMurRattache] = useState((menuiserie as any)?.mur_rattache || '')
  const [notes, setNotes] = useState((menuiserie as any)?.notes || '')
  const [photos, setPhotos] = useState<string[]>((menuiserie as any)?.photos || [])
  const [showExpert, setShowExpert] = useState(false)

  const surface = useCallback(() => {
    const l = parseFloat(largeur)
    const h = parseFloat(hauteur)
    if (isNaN(l) || isNaN(h)) return null
    return Math.round(l * h * 100) / 100
  }, [largeur, hauteur])

  const handleSave = useCallback(() => {
    onSave({
      id: menuiserie?.id || `menu_${Date.now()}`,
      type_menuiserie: type,
      largeur_m: largeur ? parseFloat(largeur) : null,
      hauteur_m: hauteur ? parseFloat(hauteur) : null,
      vitrage,
      ...({ materiau, orientation, nombre: parseInt(nombre) || 1, mur_rattache: murRattache, notes, photos } as any),
    } as MenuiserieMur)
  }, [type, vitrage, materiau, largeur, hauteur, orientation, nombre, murRattache, notes, photos, menuiserie, onSave])

  return (
    <div className="menu-sheet-overlay" onClick={onClose}>
      <div className="menu-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="menu-sheet-head">
          <div>
            <div className="menu-sheet-eyebrow">{menuiserie ? 'Modifier' : 'Ajouter'} une menuiserie</div>
            <div className="menu-sheet-title">
              {type ? labelFromValue(TYPES_MENUISERIE, type) : 'Nouvelle menuiserie'}
            </div>
            <div className="menu-sheet-subtitle">
              {vitrage ? labelFromValue(TYPES_VITRAGE, vitrage) : 'Vitrage non sélectionné'}
              {surface() !== null && ` · ${surface()} m²`}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="menu-sheet-body">
          {/* Façade compass strip */}
          <div className="facade-compass-row">
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: 'var(--c-primary-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-primary-600)', flexShrink: 0,
            }}>
              <Compass size={20} />
            </div>
            <div className="facade-compass-info">
              <div className="facade-compass-label">FAÇADE</div>
              <div className="facade-compass-name">
                {orientation ? labelFromValue(ORIENTATIONS.map(o => ({ value: o.code, label: o.label })), orientation) : '—'}
              </div>
              <div className="facade-compass-hint">Héritée du mur parent</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 200 }}>
              {ORIENTATIONS.slice(0, 8).map(o => (
                <button
                  key={o.code}
                  onClick={() => setOrientation(o.code)}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                    border: orientation === o.code ? '1.5px solid var(--c-primary-400)' : '1px solid var(--c-border)',
                    background: orientation === o.code ? 'var(--c-primary-50)' : 'var(--c-bg-alt)',
                    color: orientation === o.code ? 'var(--c-primary-600)' : 'var(--c-text-muted)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {o.code}
                </button>
              ))}
            </div>
          </div>

          {/* Type de menuiserie */}
          <div className="section-label" style={{ marginBottom: 12 }}>Type de menuiserie</div>
          <div className="menuiserie-type-grid" style={{ marginBottom: 24 }}>
            {TYPES_MENUISERIE.map(t => (
              <button
                key={t.value}
                className={`menuiserie-type-card ${type === t.value ? 'selected' : ''}`}
                onClick={() => setType(t.value)}
              >
                <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, color: type === t.value ? 'var(--c-primary-400)' : 'var(--c-text-muted)' }}>
                  {t.label[0]}
                </div>
                <div className="name">{t.label}</div>
              </button>
            ))}
          </div>

          {/* Vitrage */}
          <div className="section-label" style={{ marginBottom: 12 }}>Vitrage</div>
          <div className="vitrage-grid" style={{ marginBottom: 24 }}>
            {TYPES_VITRAGE.map(v => (
              <button
                key={v.value}
                className={`vitrage-card ${vitrage === v.value ? 'selected' : ''}`}
                onClick={() => setVitrage(v.value)}
              >
                <div className="badge-letter">{v.label[0]}</div>
                <div className="name">{v.label}</div>
              </button>
            ))}
          </div>

          {/* Matériau */}
          <div className="section-label" style={{ marginBottom: 12 }}>Matériau</div>
          <div className="doublage-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {MATERIAUX_MENUISERIE.map(m => (
              <button
                key={m.value}
                className={`doublage-card ${materiau === m.value ? 'sel' : ''}`}
                onClick={() => setMateriau(m.value)}
                style={{ flexDirection: 'column', alignItems: 'center', gap: 6 }}
              >
                <div className="doublage-badge">{m.label[0]}</div>
                <div className="doublage-card-label" style={{ textAlign: 'center' }}>{m.label}</div>
              </button>
            ))}
          </div>

          {/* Dimensions */}
          <div className="section-label" style={{ marginBottom: 12 }}>Dimensions</div>
          <div className="dimension-row" style={{ marginBottom: 24 }}>
            <FloatInput label="Largeur (m)" type="number" value={largeur} onChange={setLargeur} />
            <div className="dimension-times">×</div>
            <FloatInput label="Hauteur (m)" type="number" value={hauteur} onChange={setHauteur} />
          </div>

          {surface() !== null && (
            <div className="computed-row" style={{ marginBottom: 24 }}>
              <div className="computed-row-left">
                <div className="computed-row-icon"><Compass size={18} /></div>
                <div className="computed-row-body">
                  <div className="lbl">Surface de la menuiserie</div>
                  <div className="formula">{largeur} × {hauteur}</div>
                </div>
              </div>
              <div className="computed-row-value">{surface()} m²</div>
            </div>
          )}

          {/* Expert expand */}
          <button className="expert-toggle" onClick={() => setShowExpert(!showExpert)}>
            {showExpert ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Mode expert (orientation, nombre, mur rattaché, notes)
          </button>

          {showExpert && (
            <div className="audit-form-grid" style={{ marginBottom: 16 }}>
              <FloatInput label="Nombre d'ouvrants" type="number" value={nombre} onChange={setNombre} />
              <FloatInput label="Mur rattaché (libre)" value={murRattache} onChange={setMurRattache} />
            </div>
          )}

          {showExpert && (
            <FloatInput
              label="Notes sur cette menuiserie"
              value={notes}
              onChange={setNotes}
            />
          )}

          {showExpert && (
            <div style={{ marginTop: 16 }}>
              <PhotoGrid photos={photos} onChange={setPhotos} label="Photo de la menuiserie" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="menu-sheet-footer">
          {onDelete && (
            <button className="btn-sheet-supprimer" onClick={onDelete}>Supprimer</button>
          )}
          <button className="btn-sheet-terminer" onClick={handleSave}>
            {menuiserie ? 'Modifier cette menuiserie' : 'Ajouter cette menuiserie'}
          </button>
        </div>
      </div>
    </div>
  )
}
