import {
  LayoutDashboard, Users, ClipboardCheck, Calculator,
  FolderOpen, Calendar, FileText, Settings, ChevronLeft,
  Package, FileSignature, History, Wallet, HardHat, Building2, BarChart3, ShieldCheck, BookOpen, Mail, PhoneCall, Receipt,
} from 'lucide-react'
import type { PageKey } from '../types'
import { useAuth } from '../lib/auth/AuthContext'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

interface SidebarProps {
  current: PageKey
  onNavigate: (page: PageKey) => void
  collapsed: boolean
  onToggleCollapse: () => void
  tasksBadge?: number
  prospectsBadge?: number
}

const NAV_GROUPS: (prospectCount?: number) => { label: string; items: { key: PageKey; label: string; icon: any; badge?: number }[] }[] = (prospectCount) => [
  { label: 'Accueil', items: [{ key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard }] },
  { label: 'Ma Journée', items: [
    { key: 'a_traiter', label: 'À traiter', icon: ClipboardCheck },
    { key: 'planning', label: 'Agenda ', icon: Calendar },
    { key: 'courrier', label: 'Mon courrier', icon: Mail },
  ] },
  { label: 'Ventes', items: [
    { key: 'prospects', label: 'Prospects', icon: Users, badge: prospectCount },
    { key: 'devis', label: 'Devis', icon: FileSignature },
    { key: 'dossiers', label: 'Dossiers CEE', icon: FolderOpen },
    { key: 'simulations', label: 'Simulation des aides', icon: Calculator },
    { key: 'facturation', label: 'Facturation client', icon: Receipt },
    { key: 'pipeline', label: 'Pipeline', icon: BarChart3 },
    { key: 'prospection', label: 'Prospection', icon: PhoneCall },
  ] },
  { label: 'Terrain', items: [
    { key: 'visites', label: 'Visite technique', icon: ClipboardCheck },
    { key: 'suivi_chantier', label: 'Suivi chantier', icon: HardHat },
  ] },
  { label: 'Suivi', items: [
    { key: 'commissions', label: 'Commissions', icon: Wallet },
    { key: 'partenaires', label: 'Mon réseau', icon: Building2 },
    { key: 'performance', label: 'Performances & CA', icon: BarChart3 },
    { key: 'activite', label: 'Historique & activités', icon: History },
    { key: 'resultats_3cl', label: 'Résultats 3CL', icon: Calculator },
  ] },
  { label: 'Système', items: [
    { key: 'catalogue', label: 'Catalogue produits', icon: Package },
    { key: 'fiches_techniques', label: 'Fiches techniques', icon: BookOpen },
    { key: 'documents', label: 'Documents & archives', icon: FileText },
    { key: 'parametres', label: 'Paramètres', icon: Settings },
    { key: 'sante_systeme', label: 'Santé du système', icon: ShieldCheck },
  ] },
]

export function Sidebar({ current, onNavigate, collapsed, onToggleCollapse, tasksBadge, prospectsBadge }: SidebarProps) {
  const { profile } = useAuth()
  const [prospectCount, setProspectCount] = useState(prospectsBadge ?? 0)

  useEffect(() => {
    let cancelled = false
    supabase.from('prospects').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (!cancelled) setProspectCount(count || 0)
    })
    return () => { cancelled = true }
  }, [prospectsBadge, profile?.id, profile?.role])

  const nom = profile?.nom_complet?.trim() || profile?.email || 'Utilisateur'
  const initials = nom.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U'
  const roleLabel = profile?.role === 'admin' ? 'Administrateur' : profile?.role === 'manager' ? 'Direction' : 'Commercial'
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
        {NAV_GROUPS(prospectCount).map(group => (
          <div key={group.label}>
            {!collapsed && <div className="sidebar-section-label">{group.label}</div>}
            {group.items.filter(item => (item.key !== 'partenaires' && item.key !== 'performance' && item.key !== 'sante_systeme') || profile?.role === 'admin' || profile?.role === 'manager').map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  className={`sidebar-item ${current === item.key || (current === 'a_traiter' && item.key === 'a_traiter') ? 'active' : ''}`}
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
          <div className="sidebar-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <b>{nom}</b>
              <span>{roleLabel}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
