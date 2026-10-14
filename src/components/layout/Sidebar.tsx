import { LayoutDashboard, Users, ClipboardList, Calculator, FolderKanban, Calendar, FileText, Settings, BookOpen } from 'lucide-react'

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'prospects', label: 'Prospects', icon: Users },
  { id: 'visites', label: 'Visites', icon: ClipboardList },
  { id: 'simulations', label: 'Simulations', icon: Calculator },
  { id: 'dossiers', label: 'Dossiers', icon: FolderKanban },
  { id: 'planning', label: 'Planning', icon: Calendar },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'fiches_techniques', label: 'Fiches techniques', icon: BookOpen },
  { id: 'parametres', label: 'Paramètres', icon: Settings },
]

export function Sidebar({ currentPage, onNavigate }: { currentPage: string; onNavigate: (page: string) => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><div className="sidebar-logo-mark">R</div><div className="sidebar-logo-text">RENOVA<span> OS</span></div></div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => { const Icon = item.icon; return <button key={item.id} className={`sidebar-nav-item ${currentPage === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)}><Icon />{item.label}</button> })}
      </nav>
      <div className="sidebar-footer"><div className="sidebar-user"><div className="avatar" style={{ width: 32, height: 32, background: 'var(--primary-300)' }}>AD</div><div><div className="sidebar-user-name">Antoine Dubois</div><div className="sidebar-user-role">Conseiller énergie</div></div></div></div>
    </aside>
  )
}
