import { useMemo } from 'react'
import type { PointConformite } from '../../lib/devis/conformite'
import { DATE_REGLES } from '../../lib/devis/conformite'
import './rv.css'

interface Props {
  points: PointConformite[]
  /** true : le devis est signé, le contrôle devient purement informatif */
  verrouille?: boolean
}

/** Panneau « Contrôle de conformité » : points bloquants et informations, regroupés par thème. */
export function ConformitePanel({ points, verrouille }: Props) {
  const { blocs, groupes } = useMemo(() => {
    const g = new Map<string, PointConformite[]>()
    for (const p of points) g.set(p.groupe, [...(g.get(p.groupe) || []), p])
    return { blocs: points.filter(p => p.gravite === 'bloc').length, groupes: [...g.entries()] }
  }, [points])

  return (
    <section className="panel" aria-live="polite">
      <h2 className="rv-h">Contrôle de conformité <span className={`pill ${blocs ? 'w' : 'g'}`} style={{ marginLeft: 6 }}>{blocs ? `${blocs} point${blocs > 1 ? 's' : ''} à corriger` : 'Aucun blocage'}</span></h2>
      <div className={`status ${blocs ? 'no' : 'ok'}`}>
        {blocs
          ? (verrouille ? 'Ce devis signé présente des points non conformes aux règles intégrées.' : 'La signature et l’envoi sont bloqués tant que ces points ne sont pas corrigés.')
          : 'Les règles intégrées sont respectées. Le devis peut être signé ou envoyé.'}
      </div>
      {groupes.map(([groupe, items]) => (
        <div key={groupe} className="grp">
          <b>{groupe}</b>
          {items.map((p, i) => (
            <div key={i} className="check">
              <span className={`dot ${p.gravite === 'bloc' ? 'no' : 'inf'}`} aria-hidden>{p.gravite === 'bloc' ? '!' : 'i'}</span>
              <div>{p.message}</div>
            </div>
          ))}
        </div>
      ))}
      <p className="note" style={{ margin: '10px 0 0' }}>
        Règles relevées le {DATE_REGLES}. Cet outil applique les règles qui y sont intégrées : l’instruction finale reste faite par le délégataire CEE et par l’Anah.
      </p>
    </section>
  )
}
