import { Camera, X } from 'lucide-react'

interface Props {
  photos: string[]
  onChange: (photos: string[]) => void
  label?: string
  maxPhotos?: number
}

/**
 * Galerie photo réutilisable pour les fiches d'audit (mur, menuiserie, plancher, plafond).
 * Les photos sont stockées en base64 directement dans le JSON de la fiche (comme le fait
 * déjà la section Murs) : simple et suffisant pour l'usage terrain, sans dépendance réseau
 * au moment de la prise de vue (compatible avec le mode hors-ligne de la visite).
 */
export function PhotoGrid({ photos, onChange, label = 'Photos', maxPhotos = 6 }: Props) {
  function addPhoto(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange([...(photos || []), reader.result as string])
    reader.readAsDataURL(file)
  }

  function removePhoto(index: number) {
    onChange((photos || []).filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="section-label">{label}</div>
      <div className="photo-grid" style={{ maxWidth: 400 }}>
        {(photos || []).map((photo, i) => (
          <div key={i} className="photo-slot has-photo">
            <img src={photo} alt={`${label} ${i + 1}`} />
            <button
              type="button"
              className="photo-slot-remove"
              onClick={() => removePhoto(i)}
              title="Supprimer cette photo"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {(photos || []).length < maxPhotos && (
          <label className="photo-slot">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => addPhoto(e.target.files?.[0])}
            />
            <Camera /><span>Ajouter une photo</span>
          </label>
        )}
      </div>
    </div>
  )
}
