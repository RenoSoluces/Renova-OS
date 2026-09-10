import { ArrowLeft, Check } from 'lucide-react'
import { SECTIONS } from './VisiteTechniqueWizard'
import type { Visite, AuditData } from '../../types'

const GROUPS: { key: string; label: string; sections: number[] }[] = [
  { key: 'logement', label: 'Le logement', sections: [1, 2] },
  { key: 'enveloppe', label: 'L\'enveloppe', sections: [3, 4, 5, 6] },
  { key: 'systemes', label: 'Les systèmes', sections: [7, 8, 9] },
]

export function VisiteOverview({ visite, prospectNom, auditData, onBack, onGoToSection }: {
  visite: Visite; prospectNom: string; auditData: AuditData
  onBack: () => void; onGoToSection: (section: number) => void
}) {
  const completed = auditData.completed_sections || []

  return (
    <div>
      <div className="overview-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost" onClick={onBack}><ArrowLeft size={16} />Retour</button>
          <div>
            <h1 style={{ fontSize: 22 }}>{prospectNom}</h1>
            <p style={{ color: 'var(--neutral-500)', fontSize: 13 }}>
              Dossier {visite.id.slice(0, 8).toUpperCase()} · Visite du {new Date(visite.date_visite).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="audit-progress-bar" style={{ width: 200 }}>
            <div className="audit-progress-fill" style={{ width: `${(completed.length / SECTIONS.length) * 100}%` }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-600)' }}>{completed.length}/{SECTIONS.length}</span>
        </div>
      </div>

      {GROUPS.map(group => {
        const sectionList = SECTIONS.filter(s => group.sections.includes(s.id))
        const doneCount = sectionList.filter(s => completed.includes(s.id)).length
        return (
          <div key={group.key} className="overview-group">
            <div className="overview-group-header">
              <span className="overview-group-title">{group.label}</span>
              <span className="overview-group-count">{doneCount}/{sectionList.length}</span>
            </div>
            <div className="overview-sections">
              {sectionList.map(s => {
                const done = completed.includes(s.id)
                return (
                  <div key={s.id} className={`overview-card ${done ? 'done' : ''}`} onClick={() => onGoToSection(s.id)}>
                    <div className="overview-card-icon"><span style={{ fontWeight: 700 }}>{s.id}</span></div>
                    <div className="overview-card-text">
                      <div className="overview-card-title">{s.short}</div>
                      <div className="overview-card-sub">{s.label}</div>
                    </div>
                    <div className={`overview-card-status ${done ? 'done' : 'todo'}`}>{done ? <><Check size={12} /> OK</> : 'À faire'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
