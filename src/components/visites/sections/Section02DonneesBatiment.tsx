import { useCallback } from 'react'
import { Lightbulb, Camera } from 'lucide-react'
import { FloatInput, FloatSelect, OptionCardGrid } from '../../ui/FloatInput'
import type { DonneesBatimentData } from '../../../types'
import {
  TYPES_BATIMENT, MITOYENNETE, ORIENTATIONS,
} from '../../../lib/constants'

const ETAT_GENERAL = [
  { value: 'bon', label: 'Bon', badge: 'B', desc: 'Entretien régulier, pas de défauts majeurs' },
  { value: 'moyen', label: 'Moyen', badge: 'M', desc: 'Quelques défauts, entretien à prévoir' },
  { value: 'degrade', label: 'Dégradé', badge: 'D', desc: 'Défauts visibles, travaux nécessaires' },
  { value: 'tres_degrade', label: 'Très dégradé', badge: 'T', desc: 'Défauts importants, travaux urgents' },
]

interface Props {
  data: DonneesBatimentData | undefined
  onChange: (data: DonneesBatimentData) => void
  currentEtape: number
  onNext: () => void
  onPrev: () => void
}

export function Section02DonneesBatiment({ data, onChange, currentEtape, onNext, onPrev }: Props) {
  const d: DonneesBatimentData = data || {
    photo_facade: '', type_batiment: '', mitoyennete: '',
    surface_habitable: null, nombre_niveaux: null, orientation_principale: '',
    etat_general: '', annee_construction: null, hsp: null, photos_facade: [],
  }

  const update = useCallback((patch: Partial<DonneesBatimentData>) => {
    onChange({ ...d, ...patch })
  }, [d, onChange])

  // Étape 0: Photo de façade
  if (currentEtape === 0) {
    return (
      <div>
        <div className="tutorial-banner">
          <Lightbulb />
          <div className="tutorial-banner-content">
            <div className="tutorial-banner-title">Données bâtiment</div>
            <div className="tutorial-banner-text">La photo de façade est essentielle pour évaluer l'enveloppe du bâtiment et sa exposition.</div>
          </div>
        </div>

        <div className="audit-step-card">
          <div className="audit-step-subtitle">Étape 1 / 3</div>
          <h2 className="audit-step-heading">Photo de façade</h2>

          <div className="photo-grid">
            {(d.photos_facade || []).map((photo, i) => (
              <div key={i} className="photo-slot has-photo">
                <img src={photo} alt={`Façade ${i + 1}`} />
              </div>
            ))}
            <label className="photo-slot">
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = () => update({ photos_facade: [...(d.photos_facade || []), reader.result as string] })
                  reader.readAsDataURL(file)
                }
              }} />
              <Camera />
              <span>Photo façade principale</span>
            </label>
            <label className="photo-slot">
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = () => update({ photos_facade: [...(d.photos_facade || []), reader.result as string] })
                  reader.readAsDataURL(file)
                }
              }} />
              <Camera />
              <span>Photo façade arrière</span>
            </label>
            <label className="photo-slot">
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = () => update({ photos_facade: [...(d.photos_facade || []), reader.result as string] })
                  reader.readAsDataURL(file)
                }
              }} />
              <Camera />
              <span>Vue d'ensemble</span>
            </label>
          </div>

          <div className="flex justify-between mt-8">
            <button className="btn btn-ghost" onClick={onPrev}>Précédent</button>
            <button className="btn btn-primary" onClick={onNext}>Continuer</button>
          </div>
        </div>
      </div>
    )
  }

  // Étape 1: Le bâtiment
  if (currentEtape === 1) {
    return (
      <div>
        <div className="audit-step-card">
          <div className="audit-step-subtitle">Étape 2 / 3</div>
          <h2 className="audit-step-heading">Le bâtiment</h2>

          <div className="audit-form-section">
            <div className="audit-form-section-title">Type de bâtiment</div>
            <FloatSelect
              label="Type de bâtiment"
              value={d.type_batiment}
              onChange={v => update({ type_batiment: v })}
              options={TYPES_BATIMENT}
            />
          </div>

          <div className="audit-form-section">
            <div className="audit-form-section-title">Mitoyenneté</div>
            <OptionCardGrid
              options={MITOYENNETE}
              value={d.mitoyennete}
              onChange={v => update({ mitoyennete: v })}
              cols={4}
            />
          </div>

          <div className="audit-form-section">
            <div className="audit-form-section-title">Dimensions</div>
            <div className="audit-form-grid">
              <FloatInput label="Surface habitable (m²)" type="number" value={d.surface_habitable} onChange={v => update({ surface_habitable: v ? +v : null })} />
              <FloatInput label="Nombre de niveaux" type="number" value={d.nombre_niveaux} onChange={v => update({ nombre_niveaux: v ? +v : null })} />
            </div>
          </div>

          <div className="audit-form-section">
            <div className="audit-form-section-title">Orientation principale de la façade</div>
            <FloatSelect
              label="Orientation"
              value={d.orientation_principale}
              onChange={v => update({ orientation_principale: v })}
              options={ORIENTATIONS.map(o => ({ value: o.code, label: o.label }))}
            />
          </div>

          <div className="audit-form-section">
            <div className="audit-form-section-title">État général du bâtiment</div>
            <OptionCardGrid
              options={ETAT_GENERAL}
              value={d.etat_general}
              onChange={v => update({ etat_general: v })}
              cols={4}
            />
          </div>

          <div className="flex justify-between mt-8">
            <button className="btn btn-ghost" onClick={onPrev}>Précédent</button>
            <button className="btn btn-primary" onClick={onNext}>Continuer</button>
          </div>
        </div>
      </div>
    )
  }

  // Étape 2: Année & HSP
  return (
    <div>
      <div className="audit-step-card">
        <div className="audit-step-subtitle">Étape 3 / 3</div>
        <h2 className="audit-step-heading">Année de construction & HSP</h2>

        <div className="audit-form-section">
          <div className="audit-form-section-title">Données temporelles</div>
          <div className="audit-form-grid">
            <FloatInput label="Année de construction" type="number" value={d.annee_construction} onChange={v => update({ annee_construction: v ? +v : null })} />
            <FloatInput label="Hauteur sous plafond (m)" type="number" value={d.hsp} onChange={v => update({ hsp: v ? +v : null })} />
          </div>
        </div>

        <div className="recap-card">
          <div className="recap-card-title">Récapitulatif — Données bâtiment</div>
          <div className="recap-row"><span className="key">Type</span><span className="val">{TYPES_BATIMENT.find(t => t.value === d.type_batiment)?.label || '—'}</span></div>
          <div className="recap-row"><span className="key">Mitoyenneté</span><span className="val">{MITOYENNETE.find(m => m.value === d.mitoyennete)?.label || '—'}</span></div>
          <div className="recap-row"><span className="key">Surface</span><span className="val">{d.surface_habitable ? `${d.surface_habitable} m²` : '—'}</span></div>
          <div className="recap-row"><span className="key">Niveaux</span><span className="val">{d.nombre_niveaux || '—'}</span></div>
          <div className="recap-row"><span className="key">Année</span><span className="val">{d.annee_construction || '—'}</span></div>
          <div className="recap-row"><span className="key">HSP</span><span className="val">{d.hsp ? `${d.hsp} m` : '—'}</span></div>
        </div>

        <div className="flex justify-between mt-8">
          <button className="btn btn-ghost" onClick={onPrev}>Précédent</button>
          <button className="btn btn-primary" onClick={onNext}>Terminer la section</button>
        </div>
      </div>
    </div>
  )
}
