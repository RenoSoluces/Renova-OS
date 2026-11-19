import { useMemo, useState } from 'react'
import { ArrowRight, Check, FileSignature, Plus, RefreshCw, Bot, Send, Users, Euro } from 'lucide-react'
import { PIPELINE_STAGES, euro, normalizeStatut, stageOf, timeAgo } from '../../lib/crm/constants'

type Props = {
  prenom: string
  dateDuJour: string
  prospects: any[]
  devis: any[]
  commissions: any[]
  profiles: any[]
  activite: { id: string; at: string; text: string; value?: string }[]
  aFaire: { id: string; title: string; detail: string }[]
  onNavigate: (p: any) => void
  onActualiser: () => void
  onDispatcher: () => void
}

const COULEURS_ETAPES = ['#7FB5AE', '#5AA196', '#3F8F84', '#1F7A70', '#C2703D', '#A85A2E', '#0B3F3B', '#082E2B']

const debutMois = () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d }
const dateSignature = (d: any) => new Date(d.signature_date || d.created_at)
const initiales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]?.toUpperCase()).join('') || '?'

/** Lundi de la semaine de la date donnée (clé de regroupement hebdomadaire). */
function lundi(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }

export function VueEnsemble({ prenom, dateDuJour, prospects, devis, commissions, profiles, activite, aFaire, onNavigate, onActualiser, onDispatcher }: Props) {
  const d = useMemo(() => {
    const m0 = debutMois()
    const signes = devis.filter(x => x.statut === 'signe')
    const signesMois = signes.filter(x => dateSignature(x) >= m0)
    const envoyesMois = devis.filter(x => x.statut !== 'brouillon' && new Date(x.created_at) >= m0)
    const caSigneMois = signesMois.reduce((s, x) => s + (Number(x.montant_ht) || 0), 0)
    const nouveauxMois = prospects.filter(p => new Date(p.created_at) >= m0).length
    const transfo = envoyesMois.length ? Math.round((signesMois.length / envoyesMois.length) * 100) : 0

    // CA signé HT par semaine, 8 dernières semaines
    const l0 = lundi(new Date())
    const semaines = Array.from({ length: 8 }, (_, i) => { const x = new Date(l0); x.setDate(x.getDate() - (7 - i) * 7); return x })
    const parSemaine = semaines.map(s => {
      const fin = new Date(s); fin.setDate(fin.getDate() + 7)
      const liste = signes.filter(x => { const t = dateSignature(x); return t >= s && t < fin })
      return { ca: liste.reduce((a, x) => a + (Number(x.montant_ht) || 0), 0), nb: liste.length }
    })
    const caSemaine = parSemaine.map(x => x.ca)
    const nbSemaine = parSemaine.map(x => x.nb)

    const objectif = profiles.filter(p => !/reno\s*soluces/i.test(p.nom_complet || '')).reduce((s, p) => s + (Number(p.objectif_mensuel ?? 10000) || 0), 0)

    const etapes = PIPELINE_STAGES.map(st => ({ label: st.label, n: prospects.filter(p => normalizeStatut(p.statut) !== 'installe' && stageOf(p.statut).value === st.value).length }))
    etapes.push({ label: 'Installé', n: prospects.filter(p => normalizeStatut(p.statut) === 'installe').length })

    const recuesMois = commissions.filter(c => c.statut !== 'annulee' && c.date_paiement_societe && new Date(c.date_paiement_societe) >= m0)
    const encaisseMois = recuesMois.reduce((s, c) => s + (Number(c.montant_societe) || 0), 0)

    const parCommercial = profiles.filter(p => !/reno\s*soluces/i.test(p.nom_complet || '')).map(p => {
      const ids = new Set(prospects.filter(x => x.commercial_id === p.id).map(x => x.id))
      const ca = signesMois.filter(x => ids.has(x.prospect_id)).reduce((s, x) => s + (Number(x.montant_ht) || 0), 0)
      return { id: p.id, nom: p.nom_complet || 'Commercial', ca }
    }).sort((a, b) => b.ca - a.ca).slice(0, 3)

    return { signesMois, envoyesMois, caSigneMois, nouveauxMois, transfo, semaines, caSemaine, nbSemaine, objectif, etapes, recuesMois, encaisseMois, parCommercial }
  }, [devis, prospects, commissions, profiles])

  const [survol, setSurvol] = useState<number | null>(null)
  const joursRestants = (() => { const f = new Date(); f.setMonth(f.getMonth() + 1, 0); return Math.max(0, f.getDate() - new Date().getDate()) })()
  const pct = d.objectif > 0 ? Math.min(100, Math.round((d.caSigneMois / d.objectif) * 100)) : 0

  // Courbe CA par semaine
  const W = 560, H = 190, P = 28
  const max = Math.max(...d.caSemaine, 1)
  const pts = d.caSemaine.map((v, i) => [P + (i * (W - 2 * P)) / 7, H - P - (v / max) * (H - 2 * P)])
  const ligne = pts.map(p => p.join(',')).join(' ')
  const aire = `${P},${H - P} ${ligne} ${W - P},${H - P}`
  const R = 62, C = 2 * Math.PI * R

  return (
    <>
      <section className="vm-banner">
        <div className="vm-banner-main">
          <div className="vm-kicker">{dateDuJour} · Reno Soluces</div>
          <h1>{prenom ? `Bonjour ${prenom}` : 'Bonjour'}{d.signesMois.length ? `, ${d.signesMois.length} devis signé${d.signesMois.length > 1 ? 's' : ''} ce mois-ci` : ''}</h1>
          <p>{pct}% de l'objectif du mois atteint. Il reste {joursRestants} jour{joursRestants > 1 ? 's' : ''}.</p>
          <div className="vm-banner-actions">
            <button className="vm-btn vm-btn-cuivre" onClick={() => onNavigate('prospects')}><Plus size={16} /> Nouveau prospect</button>
            <button className="vm-btn vm-btn-ghost" onClick={() => onNavigate('pipeline')}>Voir le pipeline</button>
            <button className="vm-btn vm-btn-ghost" onClick={onActualiser}><RefreshCw size={15} /> Actualiser</button>
            <button className="vm-btn vm-btn-ghost" onClick={onDispatcher}><Bot size={15} /> Dispatcher un lead</button>
          </div>
        </div>
        <div className="vm-banner-side">
          <span>Commissions encaissées (ce mois)</span>
          <strong>{euro(d.encaisseMois)}</strong>
          <small>{d.recuesMois.length} commission{d.recuesMois.length > 1 ? 's' : ''} reçue{d.recuesMois.length > 1 ? 's' : ''}</small>
        </div>
      </section>

      <section className="vm-kpis">
        <article className="vm-kpi vm-kpi-cuivre"><span className="vm-kpi-ico"><Euro size={18} /></span><span>CA signé HT (mois)</span><strong>{euro(d.caSigneMois)}</strong></article>
        <article className="vm-kpi vm-kpi-teal"><span className="vm-kpi-ico"><Users size={18} /></span><span>Nouveaux prospects (mois)</span><strong>{d.nouveauxMois}</strong></article>
        <article className="vm-kpi"><span className="vm-kpi-ico"><Send size={18} /></span><span>Devis envoyés (mois)</span><strong>{d.envoyesMois.length}</strong></article>
        <article className="vm-kpi"><span className="vm-kpi-ico"><FileSignature size={18} /></span><span>Devis signés (mois)</span><strong>{d.signesMois.length}</strong><em>{d.transfo} % transfo.</em></article>
      </section>

      <section className="vm-card">
        <div className="vm-card-head"><h2>Pipeline</h2><span>Du premier contact jusqu'à l'installation</span></div>
        <div className="vm-chevrons">
          {d.etapes.map((e, i) => (
            <div key={e.label} className="vm-chev" style={{ background: COULEURS_ETAPES[i % COULEURS_ETAPES.length] }}>
              <span>{e.label}</span><strong>{e.n}</strong>
            </div>
          ))}
          <ArrowRight size={20} className="vm-fleche" />
          <div className="vm-archive"><Check size={15} /> <b>Commission reçue</b><span>Le dossier quitte le pipeline et passe en archives</span></div>
        </div>
      </section>

      <section className="vm-duo">
        <article className="vm-card">
          <div className="vm-card-head"><h2>CA signé par semaine</h2><span>8 dernières semaines · HT</span></div>
          <svg viewBox={`0 0 ${W} ${H}`} className="vm-chart vm-chart-vivant" role="img" aria-label="CA signé HT par semaine" onMouseLeave={() => setSurvol(null)}>
            {[0, 0.5, 1].map(f => <line key={f} x1={P} x2={W - P} y1={H - P - f * (H - 2 * P)} y2={H - P - f * (H - 2 * P)} stroke="#E3ECEA" />)}
            <polygon points={aire} fill="rgba(31,122,112,.12)" className="vm-chart-aire" />
            <polyline points={ligne} fill="none" stroke="#0B6B6B" strokeWidth="3" strokeLinejoin="round" pathLength={1} className="vm-chart-ligne" />
            {survol !== null && <line x1={pts[survol][0]} x2={pts[survol][0]} y1={P / 2} y2={H - P} stroke="#C2703D" strokeDasharray="4 4" />}
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={survol === i ? 7 : 4} fill={survol === i ? '#C2703D' : '#fff'} stroke={survol === i ? '#C2703D' : '#0B6B6B'} strokeWidth="2.5" className="vm-chart-point" style={{ transitionDelay: survol === null ? `${i * 60}ms` : '0ms' }} />)}
            {d.semaines.map((s, i) => <text key={i} x={pts[i][0]} y={H - 6} textAnchor="middle" fontSize="11" fontWeight={survol === i ? 700 : 400} fill={survol === i ? '#0B3F3B' : '#7A8C8F'}>{s.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</text>)}
            {pts.map((p, i) => (
              <rect key={`h${i}`} x={p[0] - (W - 2 * P) / 14} y={0} width={(W - 2 * P) / 7} height={H} fill="transparent" style={{ cursor: 'pointer' }}
                onMouseEnter={() => setSurvol(i)} onFocus={() => setSurvol(i)} onClick={() => setSurvol(i)} />
            ))}
            {survol !== null && (() => {
              const [x, y] = pts[survol]
              const fin = new Date(d.semaines[survol]); fin.setDate(fin.getDate() + 6)
              const w = 150, h = 62
              const bx = Math.min(Math.max(x - w / 2, 4), W - w - 4)
              const by = y - h - 14 < 2 ? y + 16 : y - h - 14
              const nb = d.nbSemaine[survol]
              return (
                <g pointerEvents="none">
                  <rect x={bx} y={by} width={w} height={h} rx="10" fill="#0B3F3B" opacity=".96" />
                  <text x={bx + 12} y={by + 18} fontSize="11" fill="#9FC2BD">{`${d.semaines[survol].toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} – ${fin.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`}</text>
                  <text x={bx + 12} y={by + 38} fontSize="16" fontWeight="700" fill="#fff">{Math.round(d.caSemaine[survol]).toLocaleString('fr-FR')} € HT</text>
                  <text x={bx + 12} y={by + 54} fontSize="11" fill="#E9B98F">{nb} devis signé{nb > 1 ? 's' : ''}</text>
                </g>
              )
            })()}
          </svg>
        </article>
        <article className="vm-card vm-objectif">
          <div className="vm-card-head"><h2>Objectif du mois</h2></div>
          <svg viewBox="0 0 160 160" width="170" height="170" role="img" aria-label={`${pct} % de l'objectif`}>
            <circle cx="80" cy="80" r={R} fill="none" stroke="#E3ECEA" strokeWidth="14" />
            <circle cx="80" cy="80" r={R} fill="none" stroke="#C2703D" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 80 80)" />
            <text x="80" y="88" textAnchor="middle" fontSize="30" fontWeight="700" fill="#0B3F3B" fontFamily="var(--font-display)">{pct} %</text>
          </svg>
          <p>{euro(d.caSigneMois)} signés sur {euro(d.objectif)}</p>
          <b>Il reste {joursRestants} jour{joursRestants > 1 ? 's' : ''}</b>
        </article>
      </section>

      <section className="vm-trio">
        <article className="vm-card">
          <div className="vm-card-head"><h2>Activité récente</h2></div>
          {activite.length === 0 ? <p className="vm-vide">Aucune activité récente.</p> : activite.slice(0, 4).map(a => (
            <div className="vm-ligne" key={a.id}><span className="vm-av">{initiales(a.text)}</span><div><b>{a.text}</b>{a.value ? <small>{a.value}</small> : null}</div><em>{timeAgo(a.at)}</em></div>
          ))}
        </article>
        <article className="vm-card">
          <div className="vm-card-head"><h2>Classement du mois</h2></div>
          {d.parCommercial.every(x => x.ca === 0) ? <p className="vm-vide">Aucun devis signé ce mois-ci.</p> : d.parCommercial.map((x, i) => (
            <div className="vm-rang" key={x.id}>
              <div><span className="vm-av">{initiales(x.nom)}</span><b>{i + 1}. {x.nom}</b><strong>{euro(x.ca)}</strong></div>
              <i><u style={{ width: `${d.parCommercial[0].ca ? Math.round((x.ca / d.parCommercial[0].ca) * 100) : 0}%` }} /></i>
            </div>
          ))}
        </article>
        <article className="vm-card vm-afaire">
          <div className="vm-card-head"><h2>À faire aujourd'hui</h2></div>
          {aFaire.length === 0 ? <p className="vm-vide">Rien d'urgent. Tout est à jour.</p> : aFaire.slice(0, 4).map(a => <div className="vm-todo" key={a.id}><b>{a.title}</b><small>{a.detail}</small></div>)}
        </article>
      </section>
    </>
  )
}
