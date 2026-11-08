import { ClipboardList, Flame, Minus, Snowflake } from 'lucide-react'
import { LIBELLE_TEMPERATURE_PRO, QUESTIONS_PRO, qualifierPro, type ReponsesPro, type TemperaturePro } from '../../lib/prospection/questionnairePro'

const COULEUR: Record<TemperaturePro, string> = { chaud: '#e5484d', tiede: '#e8a317', froid: '#3b82f6' }

/** Questionnaire de qualification à remplir pendant l'appel, dans la fiche d'un prospect professionnel. */
export function QuestionnairePro({ reponses, onChange, lectureSeule, temperatureActuelle, onAppliquerTemperature }: {
  reponses: ReponsesPro | null | undefined
  onChange: (r: ReponsesPro) => void
  lectureSeule?: boolean
  temperatureActuelle?: string | null
  onAppliquerTemperature?: (t: TemperaturePro) => void
}): JSX.Element {
  const r = reponses || {}
  const q = qualifierPro(r)
  const Icone = q.temperature === 'chaud' ? Flame : q.temperature === 'froid' ? Snowflake : Minus

  return (
    <div className="right-mini-card">
      <div className="right-mini-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} /> Questionnaire pro</div>

      {q.repondues > 0 && (
        <div className="right-mini-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
            <strong style={{ color: COULEUR[q.temperature], display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icone size={14} /> {LIBELLE_TEMPERATURE_PRO[q.temperature]}
            </strong>
            <span className="text-muted">{q.repondues}/{q.total} réponses · score {q.score}</span>
            {!lectureSeule && onAppliquerTemperature && (temperatureActuelle || 'tiede') !== q.temperature && (
              <button type="button" className="btn btn-outline" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => onAppliquerTemperature(q.temperature)}>
                Appliquer à la fiche
              </button>
            )}
          </div>
          {q.bloquants.length > 0 && <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: '#b45309' }}>{q.bloquants.map(b => <li key={b}>{b}</li>)}</ul>}
          {q.produits.length > 0 && <p style={{ margin: '6px 0 0', fontSize: 12 }}><strong>À proposer :</strong> {q.produits.join(' · ')}</p>}
        </div>
      )}

      {QUESTIONS_PRO.map(question => (
        <div className="right-mini-section" key={question.id}>
          <div className="right-mini-section-label">{question.label}</div>
          {question.aide && <p className="text-xs text-muted" style={{ margin: '0 0 4px' }}>{question.aide}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {question.options.map(o => {
              const actif = r[question.id] === o.valeur
              return (
                <button key={o.valeur} type="button" disabled={lectureSeule}
                  className={`btn ${actif ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '3px 10px', fontSize: 12 }}
                  aria-pressed={actif}
                  onClick={() => onChange({ ...r, [question.id]: actif ? '' : o.valeur })}>
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
