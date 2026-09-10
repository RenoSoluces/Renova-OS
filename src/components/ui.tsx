import type { ReactNode } from 'react'

export function Button({ children, variant = 'primary', onClick, type = 'button', disabled, icon }: {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; icon?: ReactNode
}) {
  return <button type={type} className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>{icon}{children}</button>
}
export function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: 'primary' | 'warning' | 'error' | 'info' | 'neutral' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}
export function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return <div className="avatar">{initials}</div>
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="field"><label className="field-label">{label}</label>{children}</div>
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input className="input" {...props} /> }
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className="select" {...props} /> }
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className="textarea" {...props} /> }
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state">{icon}<h3 style={{ fontSize: 16, marginBottom: 4 }}>{title}</h3>{description && <p style={{ fontSize: 13 }}>{description}</p>}{action && <div style={{ marginTop: 16 }}>{action}</div>}</div>
}
export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null
  return <div className="drawer-overlay" onClick={onClose}><div className="drawer" onClick={e => e.stopPropagation()}><div className="drawer-header"><h2 style={{ fontSize: 18 }}>{title}</h2><button className="btn btn-ghost" onClick={onClose}>✕</button></div><div className="drawer-body">{children}</div>{footer && <div className="drawer-footer">{footer}</div>}</div></div>
}
export function Card({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return <div className="card">{(title || action) && <div className="card-header">{title && <span className="card-title">{title}</span>}{action}</div>}{children}</div>
}
