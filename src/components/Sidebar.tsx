import {
  LayoutDashboard, Users, Trophy, ClipboardCheck, Calculator,
  FolderOpen, Calendar, FileText, Settings, ChevronLeft,
  Package, FileSignature, History, Wallet, HardHat, Building2, BarChart3, ShieldCheck, BookOpen, Mail, PhoneCall, Receipt, Network, Sun, MapPinned,
  Gauge, ChevronDown,
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

type NavItem = { key: PageKey; label: string; icon: any; badge?: number }
type NavGroup = { id: string; label: string; items: NavItem[]; collapsible?: boolean }

// Organisation par usage : les rubriques du quotidien sont toujours visibles,
// la gestion (catalogue, réglages, historique…) est repliée par défaut.
const NAV_GROUPS: (prospectCount?: number) => NavGroup[] = (prospectCount) => [
  { id: 'aujourdhui', label: 'Aujourd’hui', items: [
    { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { key: 'a_traiter', label: 'Ma journée', icon: ClipboardCheck },
    { key: 'planning', label: 'Agenda', icon: Calendar },
  ] },
  { id: 'ventes', label: 'Ventes', items: [
    { key: 'prospects', label: 'Prospects', icon: Users, badge: prospectCount },
    { key: 'dossiers', label: 'Dossiers', icon: FolderOpen },
    { key: 'pipeline', label: 'Pipeline', icon: BarChart3 },
    { key: 'devis', label: 'Devis', icon: FileSignature },
    { key: 'facturation', label: 'Facturation', icon: Receipt },
    { key: 'prospection', label: 'Prospection téléphone', icon: PhoneCall },
    { key: 'prospection_terrain', label: 'Prospection terrain', icon: MapPinned },
  ] },
  { id: 'chantiers', label: 'Chantiers', items: [
    { key: 'visites', label: 'Visites techniques', icon: ClipboardCheck },
    { key: 'suivi_chantier', label: 'Suivi chantier', icon: HardHat },
    { key: 'simulations', label: 'Simulation des aides', icon: Calculator },
    { key: 'solaire', label: 'Simulateur solaire', icon: Sun },
    { key: 'resultats_3cl', label: 'Résultats 3CL', icon: Calculator },
  ] },
  { id: 'equipe', label: 'Équipe et performance', items: [
    { key: 'commissions', label: 'Commissions', icon: Wallet },
    { key: 'partenaires', label: 'Mon réseau', icon: Users },
    { key: 'pilotage', label: 'Pilotage équipe', icon: Gauge },
    { key: 'performance', label: 'Performances et CA', icon: BarChart3 },
    { key: 'challenges', label: 'Challenges et classements', icon: Trophy },
  ] },
  { id: 'gestion', label: 'Gestion', collapsible: true, items: [
    { key: 'installateurs', label: 'Installateurs', icon: Building2 },
    { key: 'catalogue', label: 'Catalogue produits', icon: Package },
    { key: 'fiches_techniques', label: 'Fiches techniques', icon: BookOpen },
    { key: 'documents', label: 'Documents et archives', icon: FileText },
    { key: 'activite', label: 'Historique et activités', icon: History },
    { key: 'organisation', label: 'Organigramme', icon: Network },
    { key: 'sante_systeme', label: 'Santé du système', icon: ShieldCheck },
  ] },
]

const NAV_APPORTEUR: NavGroup[] = [
  { id: 'mon_espace', label: 'Mon espace', items: [
    { key: 'espace_apporteur', label: 'Tableau de bord', icon: LayoutDashboard },
    { key: 'prospects', label: 'Mes prospects', icon: Users },
    { key: 'commissions', label: 'Mes commissions', icon: Wallet },
  ] },
]

export function Sidebar({ current, onNavigate, collapsed, onToggleCollapse, tasksBadge, prospectsBadge }: SidebarProps) {
  const { profile } = useAuth()
  const [prospectCount, setProspectCount] = useState(prospectsBadge ?? 0)
  const [hasDirectReports, setHasDirectReports] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('renova.sidebar.groups') || '{}') } catch { return {} }
  })
  const toggleGroup = (id: string) => setOpenGroups(prev => {
    const next = { ...prev, [id]: !prev[id] }
    try { localStorage.setItem('renova.sidebar.groups', JSON.stringify(next)) } catch { /* stockage indisponible */ }
    return next
  })
  const adminRoles = ['admin', 'manager', 'partner_admin', 'company_admin']
  const canSee = (item: NavItem) => {
    const role = profile?.role || ''
    if (['performance', 'sante_systeme', 'pilotage'].includes(item.key) && !adminRoles.includes(role)) return false
    if (item.key === 'pilotage' && !['admin', 'manager'].includes(role)) return false
    if (item.key === 'installateurs' && !adminRoles.includes(role)) return false
    if (item.key === 'organisation' && !adminRoles.includes(role) && !hasDirectReports) return false
    return true
  }

  useEffect(() => {
    let cancelled = false
    supabase.from('prospects').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (!cancelled) setProspectCount(count || 0)
    })
    if (profile?.id) {
      supabase.from('profiles').select('id').eq('manager_id', profile.id).limit(1).then(({ data }) => {
        if (!cancelled) setHasDirectReports(Boolean(data?.length))
      })
    }
    return () => { cancelled = true }
  }, [prospectsBadge, profile?.id, profile?.role])

  const nom = profile?.nom_complet?.trim() || profile?.email || 'Utilisateur'
  const initials = nom.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U'
  const roleLabel = ({ admin: 'Grand Admin', manager: 'Manager', commercial_manager: 'Responsable commercial', partner_admin: 'Dirigeant', company_admin: 'Direction', commercial: 'Commercial', apporteur: "Apporteur d'affaires", teleconseiller: 'Téléconseiller' } as Record<string, string>)[profile?.role || ''] || (hasDirectReports ? 'Responsable d’équipe' : 'Utilisateur')
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
          color: 'rgba(227,239,238,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color .15s', width: collapsed ? 'auto' : 'auto',
        }}
      >
        <ChevronLeft size={18} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
      </button>

      <nav className="sidebar-nav">
        {(profile?.role === 'apporteur' ? NAV_APPORTEUR : NAV_GROUPS(prospectCount)).map(group => {
          const items = group.items.filter(canSee)
          if (!items.length) return null
          const containsCurrent = items.some(item => item.key === current)
          const open = !group.collapsible || collapsed || containsCurrent || Boolean(openGroups[group.id])
          return (
            <div key={group.id}>
              {!collapsed && (group.collapsible ? (
                <button
                  className="sidebar-section-label"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={open}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer', background: 'none', border: 0, textAlign: 'left' }}
                >
                  <span>{group.label}</span>
                  <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
              ) : <div className="sidebar-section-label">{group.label}</div>)}
              {open && items.map(item => {
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
                    {!collapsed && !!item.badge && <span className="sidebar-item-badge">{item.badge}</span>}
                  </button>
                )
              })}
              {!open && !collapsed && (
                <div style={{ padding: '2px 14px 0', fontSize: 12, lineHeight: 1.5, color: 'rgba(227,239,238,.45)' }}>
                  {items.slice(0, 3).map(item => item.label).join(', ')}…
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        {profile?.role !== 'apporteur' && (
          <button
            className={`sidebar-item ${current === 'parametres' ? 'active' : ''}`}
            onClick={() => onNavigate('parametres')}
            title={collapsed ? 'Paramètres' : undefined}
          >
            <Settings />
            {!collapsed && <span className="sidebar-item-label">Paramètres</span>}
          </button>
        )}
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
