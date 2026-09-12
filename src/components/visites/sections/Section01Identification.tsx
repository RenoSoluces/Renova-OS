import { useState, useCallback } from 'react'
import { Lightbulb, Camera, MapPin, User, Phone, Mail, FileText } from 'lucide-react'
import { FloatInput, FloatTextarea, OptionCardGrid } from '../../ui/FloatInput'
import type { IdentificationData, Prospect } from '../../../types'
import { OUI_NON } from '../../../lib/constants'

const OCCUPATION_OPTIONS = [
  { value: 'proprietaire_occupant', label: 'Propriétaire occupant', badge: 'P', desc: 'Le client vit dans le logement et en est propriétaire' },
  { value: 'proprietaire_bailleur', label: 'Propriétaire bailleur', badge: 'B', desc: 'Le client loue le logement' },
  { value: 'locataire', label: 'Locataire', badge: 'L', desc: 'Le client occite le logement en location' },
  { value: 'syndic', label: 'Syndic / Copropriété', badge: 'S', desc: 'Représentant d\'une copropriété' },
]

interface Props {
  data: IdentificationData | undefined
  prospect: Prospect
  onChange: (data: IdentificationData) => void
  currentEtape: number
  onNext: () => void
  onPrev: () => void
}

export function Section01Identification({ data, prospect, onChange, currentEtape, onNext, onPrev }: Props) {
  const d: IdentificationData = data || {
    date_visite: new Date().toISOString().split('T')[0],
    occupation: '', nom_occupant: prospect.nom || '', prenom_occupant: prospect.prenom || '',
    telephone: prospect.telephone || '', email: prospect.email || '',
    adresse: prospect.adresse || '', code_postal: prospect.code_postal || '', ville: prospect.ville || '',
    notes: '', photos: [],
  }

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const update = useCallback((patch: Partial<IdentificationData>) => {
    onChange({ ...d, ...patch })
  }, [d, onChange])

  const search = useCallback((q: string) => {
    setQuery(q)
    if (q.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`)
      .then(r => r.json())
      .then(data => {
        setSuggestions(data.features || [])
        setShowSuggestions(true)
      })
      .catch(() => setSuggestions([]))
  }, [])

  const selectAddr = useCallback((feat: any) => {
    const props = feat.properties
    update({
      adresse: props.name,
      code_postal: props.postcode,
      ville: props.city,
      latitude: feat.geometry.coordinates[1],
      longitude: feat.geometry.coordinates[0],
    })
    setQuery(`${props.name}, ${props.postcode} ${props.city}`)
    setShowSuggestions(false)
  }, [update])

  // Étape 0: Le client
  if (currentEtape === 0) {
    return (
      <div>
        <div className="tutorial-banner">
          <Lightbulb />
          <div className="tutorial-banner-content">
            <div className="tutorial-banner-title">Identification du logement</div>
            <div className="tutorial-banner-text">Renseignez les informations sur le client et l'occupant du logement. Ces données seront utilisées pour générer le rapport d'audit.</div>
          </div>
        </div>

        <div className="audit-step-card">
          <div className="audit-step-subtitle">Étape 1 / 3</div>
          <h2 className="audit-step-heading">Le client</h2>

          <div className="audit-form-section">
            <div className="audit-form-section-title">Date de la visite</div>
            <div className="audit-form-grid">
              <FloatInput label="Date de la visite" type="date" value={d.date_visite} onChange={v => update({ date_visite: v })} />
              <div />
            </div>
          </div>

          <div className="audit-form-section">
            <div className="audit-form-section-title">Occupation du logement</div>
            <OptionCardGrid
              options={OCCUPATION_OPTIONS}
              value={d.occupation}
              onChange={v => update({ occupation: v })}
              cols={2}
            />
          </div>

          <div className="audit-form-section">
            <div className="audit-form-section-title">Identité de l'occupant</div>
            <div className="audit-form-grid">
              <FloatInput label="Prénom" value={d.prenom_occupant} onChange={v => update({ prenom_occupant: v })} />
              <FloatInput label="Nom" value={d.nom_occupant} onChange={v => update({ nom_occupant: v })} />
              <FloatInput label="Téléphone" value={d.telephone} onChange={v => update({ telephone: v })} />
              <FloatInput label="Email" type="email" value={d.email} onChange={v => update({ email: v })} />
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button className="btn btn-ghost" onClick={onPrev} disabled>Précédent</button>
            <button className="btn btn-primary" onClick={onNext}>Continuer</button>
          </div>
        </div>
      </div>
    )
  }

  // Étape 1: Adresse (BAN autocomplete)
  if (currentEtape === 1) {
    return (
      <div>
        <div className="audit-step-card">
          <div className="audit-step-subtitle">Étape 2 / 3</div>
          <h2 className="audit-step-heading">Adresse du logement</h2>
          <p className="text-muted text-sm mb-6">Recherchez l'adresse via la Base Adresse Nationale (BAN) pour un géocoding précis.</p>

          <div style={{ position: 'relative', marginBottom: 20 }}>
            <FloatInput
              label="Rechercher une adresse"
              value={query || (d.adresse ? `${d.adresse}, ${d.code_postal} ${d.ville}` : '')}
              onChange={search}
              onFocus={() => d.adresse && setShowSuggestions(true)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="address-suggestions">
                {suggestions.map((s, i) => (
                  <div key={i} className="address-suggestion" onClick={() => selectAddr(s)}>
                    <div className="label">{s.properties.name}</div>
                    <div className="context">{s.properties.postcode} {s.properties.city}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="audit-form-grid">
            <FloatInput label="Adresse" value={d.adresse} onChange={v => update({ adresse: v })} />
            <FloatInput label="Code postal" value={d.code_postal} onChange={v => update({ code_postal: v })} />
            <FloatInput label="Ville" value={d.ville} onChange={v => update({ ville: v })} />
            <div />
          </div>

          <div className="flex justify-between mt-8">
            <button className="btn btn-ghost" onClick={onPrev}>Précédent</button>
            <button className="btn btn-primary" onClick={onNext}>Continuer</button>
          </div>
        </div>
      </div>
    )
  }

  // Étape 2: Notes & photos
  return (
    <div>
      <div className="audit-step-card">
        <div className="audit-step-subtitle">Étape 3 / 3</div>
        <h2 className="audit-step-heading">Notes & photos</h2>

        <div className="audit-form-section">
          <div className="audit-form-section-title">Notes complémentaires</div>
          <FloatTextarea
            label="Observations sur le logement, accès, particularités..."
            value={d.notes}
            onChange={v => update({ notes: v })}
          />
        </div>

        <div className="audit-form-section">
          <div className="audit-form-section-title">Photos du logement</div>
          <div className="photo-grid">
            {(d.photos || []).map((photo, i) => (
              <div key={i} className="photo-slot has-photo">
                <img src={photo} alt={`Photo ${i + 1}`} />
              </div>
            ))}
            <label className="photo-slot">
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = () => update({ photos: [...(d.photos || []), reader.result as string] })
                  reader.readAsDataURL(file)
                }
              }} />
              <Camera />
              <span>Ajouter une photo</span>
            </label>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button className="btn btn-ghost" onClick={onPrev}>Précédent</button>
          <button className="btn btn-primary" onClick={onNext}>Terminer la section</button>
        </div>
      </div>
    </div>
  )
}
