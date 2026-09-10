import { Search, Bell, Plus } from 'lucide-react'

export function Topbar({ title, subtitle, onNewProspect }: { title: string; subtitle: string; onNewProspect?: () => void }) {
  return (
    <header className="topbar">
      <div className="topbar-title"><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="topbar-actions">
        <div className="topbar-search"><Search /><input placeholder="Rechercher un prospect, dossier…" /></div>
        <button className="topbar-icon-btn"><Bell size={18} /><span className="badge-dot" /></button>
        {onNewProspect && <button className="btn btn-primary" onClick={onNewProspect}><Plus size={16} />Nouveau prospect</button>}
      </div>
    </header>
  )
}
