import { CHAMPS_FICHE, ecrireChamp, verifierFiche, valeursFiche, valeursLigne } from '../../lib/devis/conformite'
import { REGLES_FICHES } from '../../lib/devis/reglesFichesCEE'
import './rv.css'

interface Props {
  fiche: string | null
  caracteristiques: Record<string, any> | null | undefined
  disabled?: boolean
  /** false = fiche produit du catalogue (masque les justificatifs propres au devis) */
  surLigne?: boolean
  ouvert?: boolean
  /** infos de la ligne pour déduire les valeurs (partie isolée, R, surface) */
  contexte?: { categorie?: string | null; description?: string | null; quantite?: number | null }
  onChange: (next: Record<string, any>) => void
}

/** Données de la fiche CEE à renseigner (stockées dans `caracteristiques`, clé = libellé du champ). */
export function LigneFicheFields({ fiche, caracteristiques, disabled, surLigne = true, ouvert, contexte, onChange }: Props) {
  if (!fiche) return null
  const champs = CHAMPS_FICHE[fiche]?.filter(c => surLigne || c.type !== 'case')
  const regle = REGLES_FICHES[fiche]
  if (!champs || !regle?.verifiee) {
    return <div className="note" style={{ padding: '6px 0' }}><span className="pill n">Fiche {fiche} · règles non intégrées</span></div>
  }
  const valeurs = contexte ? valeursLigne(fiche, caracteristiques, contexte) : valeursFiche(fiche, caracteristiques)
  const points = verifierFiche(fiche, valeurs, surLigne)
  const blocs = points.filter(p => p.gravite === 'bloc')
  const mauvais = (k: string) => blocs.some(p => p.champ === k)

  return (
    <details open={ouvert || blocs.length > 0} style={{ margin: '8px 0 2px' }}>
      <summary className="note" style={{ padding: '4px 0' }}>
        Données de la fiche {fiche} · {blocs.length ? <span className="pill w">{blocs.length} à compléter</span> : <span className="pill g">Conforme</span>}
      </summary>
      <div className="grid g3" style={{ marginTop: 6 }}>
        {champs.map(c => {
          const val = valeurs[c.k] || ''
          if (c.type === 'case') {
            return (
              <label key={c.k} className={`check ${mauvais(c.k) ? 'bad' : ''}`} style={{ alignSelf: 'end' }}>
                <input type="checkbox" disabled={disabled} checked={/oui|true/i.test(val)}
                  onChange={e => onChange(ecrireChamp(caracteristiques, c, e.target.checked ? 'Oui' : ''))} /> {c.l}
              </label>
            )
          }
          return (
            <label key={c.k} className={`lab ${mauvais(c.k) ? 'bad' : ''}`}>
              {c.l}{c.u ? ` (${c.u})` : ''}
              {c.type === 'choix' ? (
                <select disabled={disabled} value={val} onChange={e => onChange(ecrireChamp(caracteristiques, c, e.target.value))}>
                  <option value="">À renseigner</option>
                  {c.options!.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input disabled={disabled} value={val} inputMode={c.type === 'nombre' ? 'decimal' : undefined}
                  placeholder="À renseigner" onChange={e => onChange(ecrireChamp(caracteristiques, c, e.target.value))} />
              )}
            </label>
          )
        })}
      </div>
    </details>
  )
}
