import { useEffect, type ReactNode } from 'react'
import './rv.css'

interface Props {
  open: boolean
  onClose: () => void
  eyebrow?: string
  title: string
  badges?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

/** Tiroir latéral « fiche produit » (remplace la fenêtre modale pour les fiches). */
export function Drawer({ open, onClose, eyebrow, title, badges, footer, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="rv rv-drawer" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rv-dw" role="dialog" aria-label={title}>
        <div className="head">
          <div>
            {eyebrow && <div className="note">{eyebrow}</div>}
            <h1>{title}</h1>
            {badges && <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>{badges}</div>}
          </div>
          <button className="rbtn" onClick={onClose}>Fermer</button>
        </div>
        {children}
        {footer && <div className="foot">{footer}</div>}
      </div>
    </div>
  )
}
