import {
  LayoutDashboard, Users, ClipboardCheck, Calculator,
  FolderOpen, Calendar, FileText, Settings, ChevronLeft,
  Package, FileSignature, History, Wallet,
} from 'lucide-react'
import type { PageKey } from '../types'

interface SidebarProps {
  current: PageKey
  onNavigate: (page: PageKey) => void
  collapsed: boolean
  onToggleCollapse: () => void
  tasksBadge?: number
}

const NAV_GROUPS: (tasksBadge?: number) => { label: string; items: { key: PageKey; label: string; icon: any; badge?: number }[] }[] = (tasksBadge) => [
  {
    label: 'Pilotage',
    items: [
      { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { key: 'prospects', label: 'Prospects', icon: Users, badge: tasksBadge },
      { key: 'visites', label: 'Visites techniques', icon: ClipboardCheck },
      { key: 'activite', label: 'Historique & activité', icon: History },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { key: 'simulations', label: 'Simulations 3CL', icon: Calculator },
      { key: 'devis', label: 'Devis', icon: FileSignature },
      { key: 'dossiers', label: 'Dossiers', icon: FolderOpen },
      { key: 'planning', label: 'Planning', icon: Calendar },
      { key: 'documents', label: 'Documents', icon: FileText },
      { key: 'commissions', label: 'Commissions', icon: Wallet },
    ],
  },
  {
    label: 'Système',
    items: [
      { key: 'catalogue', label: 'Catalogue produits', icon: Package },
      { key: 'parametres', label: 'Paramètres', icon: Settings },
    ],
  },
]

export function Sidebar({ current, onNavigate, collapsed, onToggleCollapse, tasksBadge }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">R</div>
        {!collapsed && (
          <div className="sidebar-brand-text">
            RENOVA OS
            <span>Rénovation Énergétique</span>
          </div>
        )}
      </div>

      <button
        onClick={onToggleCollapse}
        style={{
          padding: '8px 12px', margin: '8px 8px 0', borderRadius: 6,
          color: 'rgba(216,243,220,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color .15s', width: collapsed ? 'auto' : 'auto',
        }}
      >
        <ChevronLeft size={18} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
      </button>

      <nav className="sidebar-nav">
        {NAV_GROUPS(tasksBadge).map(group => (
          <div key={group.label}>
            {!collapsed && <div className="sidebar-section-label">{group.label}</div>}
            {group.items.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  className={`sidebar-item ${current === item.key ? 'active' : ''}`}
                  onClick={() => onNavigate(item.key)}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon />
                  {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                  {!collapsed && item.badge && <span className="sidebar-item-badge">{item.badge}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">CL</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <b>Cédric Lopez</b>
              <span>Conseiller RGE</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
