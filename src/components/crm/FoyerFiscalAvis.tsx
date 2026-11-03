import { Plus, Trash2, MapPin, Flame, Home, Landmark } from 'lucide-react'
import { FloatInput, FloatSelect } from '../ui/FloatInput'
import {
  agregerAvis, nouvelAvis, numeroFiscalValide, referenceAvisValide, syntheseFoyer,
  type AvisImposition,
} from '../../lib/crm/foyerFiscal'

interface FormFoyer {
  code_postal: string
  rfr: string | number
  nombre_personnes_foyer: number
  avis_imposition: AvisImposition[]
}

const COULEURS: Record<string, string> = { bleu: '#2563eb', jaune: '#d9a400', violet: '#7c3aed', rose: '#db2777' }

/**
 * Foyer fiscal : avis d'imposition (un ou plusieurs). Le revenu fiscal global et le nombre de personnes sont
 * additionnés automatiquement et alimentent le département, la zone, la précarité et la couleur MaPrimeRénov'.
 */
export function FoyerFiscalAvis({ form, set }: { form: FormFoyer; set: (cle: string, valeur: any) => void }) {
  const avis = form.avis_imposition || []
  const rfrManuel = parseFloat(String(form.rfr)) || 0
  const agrege = agregerAvis(avis)
  const rfr = avis.length > 0 ? agrege.rfrGlobal : rfrManuel
  const personnes = avis.length > 0 ? agrege.nbPersonnes : form.nombre_personnes_foyer
  const synthese = syntheseFoyer(rfr, personnes, form.code_postal)

  const majAvis = (liste: AvisImposition[]) => {
    set('avis_imposition', liste)
    if (liste.length > 0) {
      const a = agregerAvis(liste)
      set('rfr', String(a.rfrGlobal))
      set('nombre_personnes_foyer', a.nbPersonnes)
    }
  }
  const modifier = (i: number, champ: keyof AvisImposition, valeur: string | number) =>
    majAvis(avis.map((a, k) => (k === i ? { ...a, [champ]: valeur } : a)))

  const tuiles = [
    { icone: <MapPin size={15} />, label: 'Département', valeur: synthese.departement || '—' },
    { icone: <Home size={15} />, label: 'Zone', valeur: synthese.zone || '—' },
    { icone: <Flame size={15} />, label: 'Précarité', valeur: synthese.precarite || '—' },
    { icone: <Landmark size={15} />, label: 'MaPrimeRénov\'', valeur: synthese.couleur || '—', pastille: synthese.profil ? COULEURS[synthese.profil] : '' },
  ]

  return (
    <div className="foyer-fiscal">
      <div className="foyer-fiscal-titre">Foyer fiscal — MaPrimeRénov'</div>

      <div className="foyer-fiscal-tuiles" aria-live="polite">
        {tuiles.map(t => (
          <div className="foyer-fiscal-tuile" key={t.label}>
            <span className="foyer-fiscal-tuile-label">{t.icone}{t.label}</span>
            <strong>{t.pastille ? <i className="foyer-fiscal-pastille" style={{ background: t.pastille }} /> : null}{t.valeur}</strong>
          </div>
        ))}
      </div>

      {avis.map((a, i) => (
        <div className="foyer-fiscal-avis" key={i}>
          <div className="foyer-fiscal-avis-entete">
            <b>Avis d'imposition {avis.length > 1 ? i + 1 : ''}</b>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => majAvis(avis.filter((_, k) => k !== i))} aria-label={`Supprimer l'avis ${i + 1}`}>
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
          <div className="grid grid-2 gap-3">
            <FloatInput label="Numéro fiscal" value={a.numero_fiscal} onChange={v => modifier(i, 'numero_fiscal', v)} inputMode="numeric" />
            <FloatInput label="Référence de l'avis" value={a.reference_avis} onChange={v => modifier(i, 'reference_avis', v)} />
          </div>
          {(a.numero_fiscal && !numeroFiscalValide(a.numero_fiscal)) && <p className="foyer-fiscal-alerte">Le numéro fiscal compte 13 chiffres.</p>}
          {(a.reference_avis && !referenceAvisValide(a.reference_avis)) && <p className="foyer-fiscal-alerte">La référence de l'avis compte 13 caractères.</p>}
          <div className="grid grid-3 gap-3 mt-3">
            <FloatInput label="Revenu fiscal de référence (€)" type="number" value={String(a.rfr ?? '')} onChange={v => modifier(i, 'rfr', v)} />
            <FloatInput label="Date de naissance" type="date" value={a.date_naissance} onChange={v => modifier(i, 'date_naissance', v)} />
            <FloatSelect
              label="Personnes du foyer (dans l'avis)"
              value={String(a.nb_personnes || 1)}
              onChange={v => modifier(i, 'nb_personnes', parseInt(v))}
              options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: String(n) }))}
            />
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-secondary btn-sm foyer-fiscal-ajout" onClick={() => majAvis([...avis, nouvelAvis()])}>
        <Plus size={14} /> {avis.length === 0 ? 'Saisir un avis d\'imposition' : 'Ajouter un avis'}
      </button>

      {avis.length > 0 ? (
        <p className="foyer-fiscal-total">
          {agrege.nbAvis} avis · revenu fiscal de référence global <b>{agrege.rfrGlobal.toLocaleString('fr-FR')} €</b> · <b>{agrege.nbPersonnes}</b> personne{agrege.nbPersonnes > 1 ? 's' : ''} dans le foyer
        </p>
      ) : (
        <div className="grid grid-2 gap-3 mt-4">
          <FloatInput label="…ou revenu fiscal de référence (€)" type="number" value={String(form.rfr ?? '')} onChange={v => set('rfr', v)} placeholder="ex : 28000" />
          <FloatSelect
            label="Nombre de personnes au foyer"
            value={String(form.nombre_personnes_foyer)}
            onChange={v => set('nombre_personnes_foyer', parseInt(v))}
            options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: String(n) }))}
          />
        </div>
      )}
    </div>
  )
}
