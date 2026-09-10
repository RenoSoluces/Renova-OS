import { useState, useCallback } from 'react'
import { Compass, Plus, ChevronRight, Trash2 } from 'lucide-react'
import type { MenuiserieFiche, MurFiche } from '../../../types'
import { TYPES_MENUISERIE, TYPES_VITRAGE, MATERIAUX_MENUISERIE, ORIENTATIONS, labelFromValue } from '../../../lib/constants'
import { MenuiserieEditSheet } from './MenuiserieEditSheet'

interface Props {
  menuiseries: MenuiserieFiche[] | undefined
  murs: MurFiche[] | undefined
  onChange: (menuiseries: MenuiserieFiche[]) => void
  currentEtape: number
  onNext: () => void
  onPrev: () => void
}

export function Section04Menuiseries({ menuiseries, murs, onChange, currentEtape, onNext, onPrev }: Props) {
  const list = menuiseries || []
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const addMenuiserie = useCallback((menu: any) => {
    if (editingId) {
      onChange(list.map(m => m.id === editingId ? { ...m, ...menu } : m))
    } else {
      onChange([...list, menu as MenuiserieFiche])
    }
    setSheetOpen(false)
    setEditingId(null)
  }, [list, onChange, editingId])

  const deleteMenuiserie = useCallback((id: string) => {
    onChange(list.filter(m => m.id !== id))
  }, [list, onChange])

  const groupByOrientation = useCallback(() => {
    const groups: Record<string, MenuiserieFiche[]> = {}
    for (const m of list) {
      const key = m.orientation || 'inconnu'
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    }
    return groups
  }, [list])

  const groups = groupByOrientation()

  return (
    <div>
      <div className="audit-section-title">Section 4 — Menuiseries</div>
      <div className="audit-section-desc">Liste consolidée de toutes les menuiseries du logement, regroupées par orientation.</div>

      <div className="info-banner info-banner-green">
        <Compass />
        <div><b>{list.length} menuiserie{list.length > 1 ? 's' : ''}</b> au total. Les menuiseries ajoutées depuis la section Murs sont automatiquement reprises ici.</div>
      </div>

      {list.length === 0 && (
        <div className="empty-state">
          <Compass />
          <h3>Aucune menuiserie</h3>
          <p>Ajoutez une menuiserie pour ce logement, ou renseignez-les directement depuis la section Murs.</p>
        </div>
      )}

      {Object.entries(groups).map(([orient, menus]) => (
        <div key={orient} className="menu-group-card">
          <div className="menu-section-header">
            <div className="menu-section-icon blue"><Compass size={18} /></div>
            <div className="menu-section-title">
              {orient !== 'inconnu' ? labelFromValue(ORIENTATIONS.map(o => ({ value: o.code, label: o.label })), orient) : 'Orientation non renseignée'}
            </div>
            <div className="menu-section-count">{menus.length} menuiserie{menus.length > 1 ? 's' : ''}</div>
          </div>

          {menus.map(m => {
            const surf = m.largeur_m && m.hauteur_m ? Math.round(m.largeur_m * m.hauteur_m * 100) / 100 : null
            return (
              <div key={m.id} className="menu-item-row">
                <div className="menu-item-info">
                  <div className="menu-item-name">{labelFromValue(TYPES_MENUISERIE, m.type_menuiserie)}</div>
                  <div className="menu-item-details">
                    {labelFromValue(TYPES_VITRAGE, m.vitrage)}
                    {(m as any).materiau && ` · ${labelFromValue(MATERIAUX_MENUISERIE, (m as any).materiau)}`}
                    {m.largeur_m && m.hauteur_m && ` · ${m.largeur_m} × ${m.hauteur_m} m`}
                    {surf && ` · ${surf} m²`}
                  </div>
                </div>
                <div className="menu-item-actions">
                  <button className="menu-dup-btn" onClick={() => {
                    const dup = { ...m, id: `menu_${Date.now()}_dup` }
                    onChange([...list, dup])
                  }}>Dupliquer</button>
                  <button className="menu-arrow-btn" onClick={() => { setEditingId(m.id); setSheetOpen(true) }}>
                    <ChevronRight size={20} />
                  </button>
                  <button className="menu-arrow-btn" onClick={() => deleteMenuiserie(m.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <button className="menu-add-dark" onClick={() => { setEditingId(null); setSheetOpen(true) }}>
        <Plus size={18} /> Ajouter une menuiserie
      </button>

      <div className="wall-nav-row" style={{ marginTop: 32 }}>
        <button className="btn-wall-nav btn-wall-prev" onClick={onPrev}>Précédent</button>
        <button className="btn-wall-nav btn-wall-next" onClick={onNext}>Continuer vers Planchers</button>
      </div>

      {sheetOpen && (
        <MenuiserieEditSheet
          menuiserie={editingId ? (list.find(m => m.id === editingId) as any || null) : null}
          wallOrientation=""
          onClose={() => { setSheetOpen(false); setEditingId(null) }}
          onSave={addMenuiserie}
          onDelete={editingId ? () => { deleteMenuiserie(editingId); setSheetOpen(false); setEditingId(null) } : undefined}
        />
      )}
    </div>
  )
}
