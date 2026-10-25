import { ArrowLeft, Lightbulb, Check } from 'lucide-react'
import type { AuditData, Prospect } from '../../types'

export interface SectionDef {
  id: number
  label: string
  short: string
  etapes: { id: number; label: string }[]
}

export const SECTIONS: SectionDef[] = [
  {
    id: 1, label: 'Identification du logement', short: 'Identification',
    etapes: [
      { id: 0, label: 'Le client' },
      { id: 1, label: 'Adresse' },
      { id: 2, label: 'Notes & photos' },
    ],
  },
  {
    id: 2, label: 'Données bâtiment', short: 'Bâtiment',
    etapes: [
      { id: 0, label: 'Photo de façade' },
      { id: 1, label: 'Le bâtiment' },
      { id: 2, label: 'Année & HSP' },
    ],
  },
  {
    id: 3, label: 'Murs', short: 'Murs',
    etapes: [
      { id: 0, label: 'Liste des murs' },
      { id: 1, label: 'Façade & photo' },
      { id: 2, label: 'Le mur' },
      { id: 3, label: 'Détails' },
      { id: 4, label: 'Menuiseries' },
      { id: 5, label: 'Notes' },
    ],
  },
  {
    id: 4, label: 'Menuiseries', short: 'Menuiseries',
    etapes: [
      { id: 0, label: 'Liste des menuiseries' },
      { id: 1, label: 'Ajouter' },
    ],
  },
  {
    id: 5, label: 'Planchers', short: 'Planchers',
    etapes: [
      { id: 0, label: 'Liste' },
    ],
  },
  {
    id: 6, label: 'Plafonds', short: 'Plafonds',
    etapes: [
      { id: 0, label: 'Liste' },
    ],
  },
  {
    id: 7, label: 'Ventilation', short: 'Ventilation',
    etapes: [
      { id: 0, label: 'Système' },
    ],
  },
  {
    id: 8, label: 'Chauffage', short: 'Chauffage',
    etapes: [
      { id: 0, label: 'Système principal' },
    ],
  },
  {
    id: 9, label: 'ECS', short: 'ECS',
    etapes: [
      { id: 0, label: 'Système ECS' },
    ],
  },
  {
    id: 10, label: 'Photovoltaïque', short: 'Photovoltaïque',
    etapes: [
      { id: 0, label: 'Toiture & production' },
    ],
  },
]

const NAV_GROUPS = [
  { label: 'Le logement', sections: [1, 2] },
  { label: 'L\'enveloppe', sections: [3, 4, 5, 6] },
  { label: 'Les systèmes', sections: [7, 8, 9] },
  { label: 'Production d\'énergie', sections: [10] },
]

interface WizardShellProps {
  prospect: Prospect
  currentSection: number
  currentEtape: number
  completedSections: number[]
  auditData: AuditData
  onSelectSection: (sectionId: number) => void
  tutorialText?: string
  /** Sections effectivement à parcourir (visite ciblée produit) — toutes par défaut (audit complet) */
  activeSections?: number[]
  /** Badge de statut de synchronisation hors-ligne, affiché dans la barre du haut */
  syncBadge?: React.ReactNode
  /** Retour à la liste des visites (la saisie est enregistrée au fil de l'eau) */
  onBack?: () => void
  children: React.ReactNode
}

export function VisiteTechniqueWizard({
  prospect, currentSection, currentEtape, completedSections, auditData,
  onSelectSection, tutorialText, activeSections, syncBadge, onBack, children,
}: WizardShellProps) {
  const active = activeSections && activeSections.length > 0 ? activeSections : SECTIONS.map(s => s.id)
  const activeSectionDefs = SECTIONS.filter(s => active.includes(s.id))
  const navGroups = NAV_GROUPS
    .map(g => ({ ...g, sections: g.sections.filter(sid => active.includes(sid)) }))
    .filter(g => g.sections.length > 0)

  const section = SECTIONS.find(s => s.id === currentSection)!
  const etapes = section.etapes
  const totalSteps = activeSectionDefs.reduce((sum, s) => sum + s.etapes.length, 0)
  const completedSteps = activeSectionDefs.reduce((sum, s) => {
    if (completedSections.includes(s.id)) return sum + s.etapes.length
    if (active.indexOf(s.id) < active.indexOf(currentSection)) return sum + s.etapes.length
    if (s.id === currentSection) return sum + currentEtape
    return sum
  }, 0)
  const progressPct = Math.round((completedSteps / totalSteps) * 100)

  const initials = (prospect.prenom?.[0] || '') + (prospect.nom?.[0] || '')

  return (
    <div className="visite-wizard">
      {/* Audit sidebar */}
      <aside className="audit-sidebar">
        <div className="audit-sidebar-header">
          <button type="button" className="audit-back" onClick={onBack} disabled={!onBack}>
            <ArrowLeft size={16} /> Retour
          </button>
          <div className="audit-prospect">
            <div className="audit-prospect-avatar">{initials || '?'}</div>
            <div className="audit-prospect-info">
              <div className="audit-prospect-name">{prospect.prenom} {prospect.nom}</div>
              <div className="audit-prospect-addr">{prospect.ville || 'Adresse non renseignée'}</div>
            </div>
          </div>
        </div>

        <div className="audit-progress">
          <div className="audit-progress-label">Progression</div>
          <div className="audit-progress-bar">
            <div className="audit-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="audit-progress-text">
            <span>{completedSteps} / {totalSteps} étapes</span>
            <span>{progressPct}%</span>
          </div>
        </div>

        <nav className="audit-nav">
          {navGroups.map(group => (
            <div key={group.label} className="audit-nav-group">
              <div className="audit-nav-group-label">{group.label}</div>
              {group.sections.map(sid => {
                const s = SECTIONS.find(sec => sec.id === sid)!
                const isActive = sid === currentSection
                const isCompleted = completedSections.includes(sid)
                return (
                  <button
                    key={sid}
                    className={`audit-nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => onSelectSection(sid)}
                  >
                    <span className="num">{isCompleted ? <Check size={12} /> : sid}</span>
                    <span className="label">{s.short}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="audit-main">
        {/* Barre mobile / tablette : remplace le menu latéral */}
        <div className="audit-mobilebar">
          <button type="button" className="audit-mobilebar-back" onClick={onBack} disabled={!onBack} aria-label="Retour à la liste des visites">
            <ArrowLeft size={18} />
          </button>
          <div className="audit-mobilebar-who">
            <b>{prospect.prenom} {prospect.nom}</b>
            <span>{completedSteps} / {totalSteps} étapes · {progressPct}%</span>
          </div>
          {syncBadge}
        </div>
        <nav className="audit-chips" aria-label="Sections de la visite">
          {activeSectionDefs.map(s => (
            <button
              key={s.id}
              type="button"
              className={`audit-chip ${s.id === currentSection ? 'active' : ''} ${completedSections.includes(s.id) ? 'completed' : ''}`}
              onClick={() => onSelectSection(s.id)}
              ref={el => { if (el && s.id === currentSection) el.scrollIntoView?.({ inline: 'center', block: 'nearest' }) }}
            >
              <span className="num">{completedSections.includes(s.id) ? <Check size={11} /> : s.id}</span>
              {s.short}
            </button>
          ))}
        </nav>

        <div className="audit-topbar">
          <div className="audit-breadcrumb">
            <b>{section.label}</b>
            <span className="sep">/</span>
            <span>{etapes[currentEtape]?.label}</span>
          </div>
          <div className="audit-topbar-spacer" />
          {syncBadge}
          {tutorialText && (
            <div className="audit-tutorial">
              <Lightbulb size={14} /> {tutorialText}
            </div>
          )}
        </div>

        {/* Segmented progress bar */}
        <div className="audit-segmented">
          {activeSectionDefs.map(s => (
            <div
              key={s.id}
              className={`audit-segment ${
                completedSections.includes(s.id) ? 'completed' : s.id === currentSection ? 'current' : ''
              }`}
            />
          ))}
        </div>

        {/* Step bar */}
        <div className="audit-stepbar">
          <div className="audit-stepbar-title">{section.label}</div>
          <div className="audit-stepbar-steps">
            {etapes.map((etape, i) => (
              <div key={etape.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {i > 0 && <div className={`audit-step-line ${i <= currentEtape ? 'completed' : ''}`} />}
                <div className={`audit-step-dot ${
                  i < currentEtape ? 'completed' : i === currentEtape ? 'current' : ''
                }`} title={etape.label}>
                  {i < currentEtape ? <Check size={12} /> : i + 1}
                </div>
                {i === currentEtape && <span className="audit-step-name">{etape.label}</span>}
              </div>
            ))}
          </div>
          <div className="audit-stepbar-spacer" />
          <div className="audit-stepbar-actions">{children && (children as any).props?.actions}</div>
        </div>

        {/* Content */}
        <div className="audit-content">
          <div className="audit-content-inner">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
