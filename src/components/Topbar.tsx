import { Search, Bell, HelpCircle, LogOut, Clock, FileWarning, Info, Check, ClipboardCheck, Download, Users, FolderOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth/AuthContext'
import { supabase } from '../lib/supabase'
import type { Notification, PageKey } from '../types'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  onNavigate?: (page: PageKey) => void
  /** Change à chaque nouvelle vérification de relances (voir App.tsx) pour recharger la liste */
  refreshKey?: number
}

const ICONS: Record<string, any> = {
  relance_devis: FileWarning,
  tache_retard: Clock,
  vt_a_qualifier: ClipboardCheck,
  nouveau_prospect: Users,
  evolution_dossier: FolderOpen,
  info: Info,
}

function tempsEcoule(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.floor(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.floor(heures / 24)
  return `il y a ${jours} j`
}

export function Topbar({ title, subtitle, actions, onNavigate, refreshKey }: TopbarProps) {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<{type:'prospect'|'devis'|'dossier';id:string;label:string;sub:string}[]>([])

  function loadNotifs() {
    supabase.from('notifications').select('*').or(`recipient_id.eq.${profile?.id},recipient_id.is.null`).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setNotifs((data || []) as Notification[]))
  }

  useEffect(() => {
    if (profile?.id) loadNotifs()
  }, [refreshKey, profile?.id])

  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) { setSearchResults([]); return }
    const timer = window.setTimeout(async () => {
      const like = `%${q.replace(/[%_]/g, '')}%`
      const [{ data: prospects }, { data: devis }, { data: dossiers }] = await Promise.all([
        supabase.from('prospects').select('id, prenom, nom, ville, commercial_id').or(`nom.ilike.${like},prenom.ilike.${like},email.ilike.${like},telephone.ilike.${like}`).limit(6),
        supabase.from('devis').select('id, numero, statut, prospect:prospects(prenom,nom)').ilike('numero', like).limit(5),
        supabase.from('dossiers').select('id, reference, statut, prospect:prospects(prenom,nom)').ilike('reference', like).limit(5),
      ])
      const next = [
        ...(prospects || []).map((p:any) => ({type:'prospect' as const,id:p.id,label:`${p.prenom || ''} ${p.nom || ''}`.trim(),sub:p.ville || 'Prospect'})),
        ...(devis || []).map((d:any) => ({type:'devis' as const,id:d.id,label:d.numero,sub:`Devis · ${d.prospect ? `${d.prospect.prenom || ''} ${d.prospect.nom || ''}`.trim() : '—'}`})),
        ...(dossiers || []).map((d:any) => ({type:'dossier' as const,id:d.id,label:d.reference,sub:`Dossier · ${d.prospect ? `${d.prospect.prenom || ''} ${d.prospect.nom || ''}`.trim() : '—'}`})),
      ]
      setSearchResults(next)
      setSearchOpen(true)
    }, 220)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  async function installerApplication() {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const nonLues = notifs.filter(n => !n.lue).length

  async function marquerLue(n: Notification) {
    if (n.type === 'vt_a_qualifier' && n.visite_id) localStorage.setItem('renova_pending_vt_id', n.visite_id)
    if (!n.lue) {
      await supabase.from('notifications').update({ lue: true }).eq('id', n.id)
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, lue: true } : x))
    }
    if (n.type === 'vt_a_qualifier' && n.visite_id) onNavigate?.('visites')
    else if (n.dossier_id) onNavigate?.('dossiers')
    else if (n.devis_id) onNavigate?.('devis')
    else if (n.prospect_id) onNavigate?.('prospects')
    setNotifOpen(false)
  }

  async function toutMarquerLu() {
    const idsNonLus = notifs.filter(n => !n.lue).map(n => n.id)
    if (idsNonLus.length === 0) return
    await supabase.from('notifications').update({ lue: true }).in('id', idsNonLus)
    setNotifs(prev => prev.map(n => ({ ...n, lue: true })))
  }

  const initials = (profile?.nom_complet || profile?.email || '?')
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>
      <div className="topbar-spacer" />
      {actions}
      {installPrompt && (
        <button className="btn btn-sm btn-secondary" onClick={installerApplication} title="Installer Renova OS comme application">
          <Download size={15} /> Installer l'application
        </button>
      )}
      <div className="topbar-search">
        <Search />
        <input placeholder="Rechercher un prospect, dossier..." value={search} onChange={e => setSearch(e.target.value)} onFocus={() => search.trim().length >= 2 && setSearchOpen(true)} />
        {searchOpen && search.trim().length >= 2 && (
          <>
            <div className="topbar-search-backdrop" onClick={() => setSearchOpen(false)} />
            <div className="topbar-search-results">
              {searchResults.length === 0 ? <div className="topbar-search-empty">Aucun résultat</div> : searchResults.map(r => (
                <button key={`${r.type}-${r.id}`} onClick={() => { setSearchOpen(false); setSearch(''); onNavigate?.(r.type === 'prospect' ? 'prospects' : r.type === 'devis' ? 'devis' : 'dossiers') }}>
                  <strong>{r.label || 'Sans nom'}</strong><span>{r.sub}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button className="topbar-icon-btn" title="Aide">
        <HelpCircle size={20} />
      </button>
      <div className="topbar-user-menu">
        <button className="topbar-icon-btn" title="Notifications" onClick={() => setNotifOpen(o => !o)}>
          <Bell size={20} />
          {nonLues > 0 && <span className="dot" />}
        </button>
        {notifOpen && (
          <>
            <div className="topbar-menu-backdrop" onClick={() => setNotifOpen(false)} />
            <div className="topbar-menu" style={{ width: 340, maxHeight: 420, overflowY: 'auto', right: 0 }}>
              <div className="flex items-center justify-between" style={{ padding: '4px 4px 10px' }}>
                <span className="font-semibold">Notifications</span>
                {nonLues > 0 && (
                  <button className="text-sm" style={{ color: 'var(--c-primary)', cursor: 'pointer' }} onClick={toutMarquerLu}>
                    <Check size={12} style={{ display: 'inline', marginRight: 4 }} />Tout marquer lu
                  </button>
                )}
              </div>
              {notifs.length === 0 ? (
                <div className="text-sm text-muted" style={{ padding: '12px 4px' }}>Aucune notification pour le moment.</div>
              ) : (
                notifs.map(n => {
                  const Icon = ICONS[n.type] || Info
                  return (
                    <button
                      key={n.id}
                      onClick={() => marquerLue(n)}
                      style={{
                        display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '10px 4px',
                        border: 'none', borderBottom: '1px solid var(--c-border)', background: n.lue ? 'transparent' : 'var(--neutral-50)',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={16} style={{ marginTop: 2, flexShrink: 0, color: n.lue ? 'var(--c-text-muted)' : 'var(--c-primary)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="text-sm font-semibold" style={{ whiteSpace: 'normal' }}>{n.titre}</div>
                        <div className="text-sm text-muted" style={{ whiteSpace: 'normal' }}>{n.message}</div>
                        <div className="text-sm text-muted" style={{ marginTop: 2 }}>{tempsEcoule(n.created_at)}</div>
                      </div>
                      {!n.lue && <span className="dot" style={{ position: 'static', flexShrink: 0, marginTop: 4 }} />}
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
      <div className="topbar-user-menu">
        <button className="topbar-avatar" onClick={() => setMenuOpen(o => !o)} title={profile?.nom_complet || profile?.email}>
          {initials}
        </button>
        {menuOpen && (
          <>
            <div className="topbar-menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="topbar-menu">
              <div className="topbar-menu-name">{profile?.nom_complet || 'Utilisateur'}</div>
              <div className="topbar-menu-email">{profile?.email}</div>
              <button className="topbar-menu-item" onClick={signOut}>
                <LogOut size={14} /> Se déconnecter
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
