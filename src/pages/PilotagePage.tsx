import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Clock3, FileWarning, Flame, Gauge, RefreshCw, Target, TrendingUp, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { lireTout } from '../lib/lireTout'
import { alertesPilotage, bornesPeriode, calculerPilotage, type Alerte, type DonneesPilotage, type Periode } from '../lib/pilotage/pilotage'
import type { PageKey } from '../types'

const euro = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const PERIODES: { valeur: Periode; label: string }[] = [
  { valeur: 'semaine', label: 'Semaine' }, { valeur: 'mois', label: 'Mois' }, { valeur: 'mois_precedent', label: 'Mois précédent' }, { valeur: 'trimestre', label: 'Trimestre' },
]
const ICONE_ALERTE: Record<Alerte['type'], typeof AlertTriangle> = { devis_non_rentable: FileWarning, devis_sans_reponse: Clock3, vt_sans_devis: ArrowUpRight, prospect_chaud_oublie: Flame }
const LIBELLE_ALERTE: Record<Alerte['type'], string> = { devis_non_rentable: 'Rentabilité', devis_sans_reponse: 'Relance', vt_sans_devis: 'Devis à faire', prospect_chaud_oublie: 'À rappeler' }

/** Pilotage de l'équipe commerciale : activité, transformation, CA signé et points d'attention. */
export function PilotagePage({ onNavigate }: { onNavigate?: (p: PageKey) => void }) {
  const [periode, setPeriode] = useState<Periode>('mois')
  const [donnees, setDonnees] = useState<DonneesPilotage | null>(null)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [filtreCommercial, setFiltreCommercial] = useState('')

  async function charger() {
    setChargement(true); setErreur('')
    const depuis = new Date(Date.now() - 200 * 86400000).toISOString()
    const [profils, prospects, devis, visites, evenements, portes] = await Promise.all([
      supabase.from('profiles').select('id,nom_complet,role,objectif_mensuel').in('role', ['commercial', 'manager', 'admin']),
      lireTout(() => supabase.from('prospects').select('id,commercial_id,created_at,statut,temperature,derniere_interaction_at,prenom,nom')),
      supabase.from('devis').select('id,prospect_id,numero,statut,created_at,signature_date,montant_ht,montant_ht_avant_remise,remise_montant_ht,niveau_rentabilite,visite_id').gte('created_at', depuis).limit(5000),
      supabase.from('visites').select('id,prospect_id,statut,date_visite,created_at').gte('created_at', depuis).limit(5000),
      supabase.from('planning_events').select('id,user_id,type,date,source').gte('date', depuis.slice(0, 10)).limit(5000),
      supabase.from('tournee_portes').select('commercial_id,resultat,cree_le').gte('cree_le', depuis).limit(10000),
    ])
    const premiere = [profils, prospects, devis, visites, evenements].find(r => r.error)
    if (premiere?.error) setErreur(`Données incomplètes : ${premiere.error.message}`)
    setDonnees({
      profils: (profils.data || []) as any, prospects: (prospects.data || []) as any, devis: (devis.data || []) as any,
      visites: (visites.data || []) as any, evenements: (evenements.data || []) as any, portes: (portes.data || []) as any,
    })
    setChargement(false)
  }
  useEffect(() => { void charger() }, [])

  const bornes = useMemo(() => bornesPeriode(periode), [periode])
  const pilotage = useMemo(() => (donnees ? calculerPilotage(donnees, bornes.debut, bornes.fin) : null), [donnees, bornes])
  const mois = useMemo(() => (donnees ? calculerPilotage(donnees, bornesPeriode('mois').debut, bornesPeriode('mois').fin) : null), [donnees])
  const alertes = useMemo(() => (donnees ? alertesPilotage(donnees) : []), [donnees])
  const nomCommercial = useMemo(() => new Map((donnees?.profils || []).map(p => [p.id, p.nom_complet || ''])), [donnees])
  const alertesVisibles = alertes.filter(a => !filtreCommercial || a.commercialId === filtreCommercial)

  const t = pilotage?.total
  const objectifEquipe = mois?.total.objectifMensuel || 0
  const caMois = mois?.total.caSigneHT || 0
  const maxEntonnoir = Math.max(1, ...(pilotage?.entonnoir.map(e => e.valeur) || [1]))
  // Avancement attendu du mois à date, pour situer l'équipe par rapport à l'objectif.
  const now = new Date()
  const joursMois = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const attendu = objectifEquipe ? Math.round((now.getDate() / joursMois) * 100) : 0

  return (
    <div className="page pil">
      <header className="pil-tete">
        <div>
          <span className="pil-sur">Pilotage commercial</span>
          <h1>Votre équipe, {bornes.libelle.toLowerCase()}</h1>
        </div>
        <div className="pil-actions">
          <div className="pil-periodes" role="tablist" aria-label="Période">
            {PERIODES.map(p => <button key={p.valeur} role="tab" aria-selected={periode === p.valeur} className={periode === p.valeur ? 'on' : ''} onClick={() => setPeriode(p.valeur)}>{p.label}</button>)}
          </div>
          <button className="pil-rafraichir" onClick={() => void charger()} disabled={chargement} aria-label="Actualiser"><RefreshCw size={16} className={chargement ? 'spin' : ''} /></button>
        </div>
      </header>

      {erreur && <div className="pil-erreur" role="alert"><AlertTriangle size={15} /> {erreur}</div>}

      <section className="pil-kpis">
        <div className="pil-kpi principal">
          <span className="pil-kpi-label"><TrendingUp size={15} /> CA signé HT</span>
          <strong className="pil-kpi-val">{euro(t?.caSigneHT || 0)}</strong>
          <span className="pil-kpi-sous">{t?.devisSignes || 0} devis signés · panier moyen {t?.panierMoyenHT ? euro(t.panierMoyenHT) : '—'}</span>
        </div>
        <div className="pil-kpi">
          <span className="pil-kpi-label"><Target size={15} /> Objectif du mois</span>
          <strong className="pil-kpi-val">{objectifEquipe ? `${Math.round((caMois / objectifEquipe) * 100)} %` : '—'}</strong>
          {objectifEquipe > 0 ? <>
            <div className="pil-jauge" title={`${euro(caMois)} sur ${euro(objectifEquipe)} · attendu à date : ${attendu} %`}>
              <i style={{ width: `${Math.min(100, (caMois / objectifEquipe) * 100)}%` }} />
              <b style={{ left: `${attendu}%` }} aria-hidden="true" />
            </div>
            <span className="pil-kpi-sous">{euro(caMois)} / {euro(objectifEquipe)} · repère : {attendu} % du mois écoulé</span>
          </> : <span className="pil-kpi-sous">Renseignez les objectifs mensuels sur le tableau de bord (bloc « Objectif mensuel »).</span>}
        </div>
        <div className="pil-kpi">
          <span className="pil-kpi-label"><Gauge size={15} /> Transformation</span>
          <strong className="pil-kpi-val">{t?.transformation != null ? `${t.transformation} %` : '—'}</strong>
          <span className="pil-kpi-sous">devis signés / devis émis · remise moyenne {t?.remiseMoyennePct != null ? `${t.remiseMoyennePct.toLocaleString('fr-FR')} %` : '—'}</span>
        </div>
        <div className="pil-kpi">
          <span className="pil-kpi-label"><Users size={15} /> Activité</span>
          <strong className="pil-kpi-val">{t?.rdv || 0} <small>RDV</small></strong>
          <span className="pil-kpi-sous">{t?.vt || 0} VT · {t?.prospects || 0} nouveaux prospects · {t?.portes || 0} portes</span>
        </div>
      </section>

      <div className="pil-grille">
        <section className="pil-carte pil-equipe">
          <div className="pil-carte-tete"><h2>Par commercial</h2><span>{bornes.libelle}</span></div>
          <div className="pil-table-wrap">
            <table className="pil-table">
              <thead><tr>
                <th>Commercial</th><th className="n">Portes</th><th className="n">Prospects</th><th className="n">RDV</th><th className="n">VT</th>
                <th className="n">Devis</th><th className="n">Signés</th><th className="n">Transfo.</th><th className="n">CA signé HT</th><th className="n">Remise</th><th className="n">Objectif mois</th>
              </tr></thead>
              <tbody>
                {(pilotage?.lignes || []).map(l => {
                  const m = mois?.lignes.find(x => x.id === l.id)
                  const pct = l.objectifMensuel ? Math.round(((m?.caSigneHT || 0) / l.objectifMensuel) * 100) : null
                  return (
                    <tr key={l.id} className={filtreCommercial === l.id ? 'on' : ''} onClick={() => setFiltreCommercial(f => (f === l.id ? '' : l.id))} title="Filtrer les points d’attention">
                      <td><span className="pil-avatar">{l.nom.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}</span>{l.nom}</td>
                      <td className="n">{l.portes || '—'}</td><td className="n">{l.prospects || '—'}</td><td className="n">{l.rdv || '—'}</td><td className="n">{l.vt || '—'}</td>
                      <td className="n">{l.devisEmis || '—'}{l.nonRentables > 0 && <span className="pil-badge-alerte" title={`${l.nonRentables} devis sous le plancher`}>{l.nonRentables}</span>}</td>
                      <td className="n">{l.devisSignes || '—'}</td>
                      <td className="n">{l.transformation != null ? `${l.transformation} %` : '—'}</td>
                      <td className="n fort">{l.caSigneHT ? euro(l.caSigneHT) : '—'}</td>
                      <td className="n">{l.remiseMoyennePct != null ? `${l.remiseMoyennePct.toLocaleString('fr-FR')} %` : '—'}</td>
                      <td className="n">{pct != null ? <span className="pil-mini"><span className="pil-mini-piste"><i style={{ width: `${Math.min(100, pct)}%` }} /></span><em>{pct} %</em></span> : '—'}</td>
                    </tr>
                  )
                })}
                {pilotage && pilotage.lignes.length === 0 && <tr><td colSpan={11} className="pil-vide">Aucune activité sur la période.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="pil-carte">
          <div className="pil-carte-tete"><h2>Entonnoir</h2><span>{bornes.libelle}</span></div>
          <ol className="pil-entonnoir">
            {(pilotage?.entonnoir || []).map((e, i, arr) => {
              const prec = i > 0 ? arr[i - 1].valeur : 0
              return (
                <li key={e.etape} title={`${e.etape} : ${e.valeur}`}>
                  <div className="pil-ent-ligne"><span>{e.etape}</span><b>{e.valeur.toLocaleString('fr-FR')}</b></div>
                  <div className="pil-ent-barre"><i style={{ width: `${Math.max(e.valeur ? 2 : 0, (e.valeur / maxEntonnoir) * 100)}%` }} /></div>
                  {i > 0 && prec > 0 && e.valeur <= prec && <small>{Math.round((e.valeur / prec) * 100)} % de l’étape précédente</small>}
                </li>
              )
            })}
          </ol>
        </section>
      </div>

      <section className="pil-carte">
        <div className="pil-carte-tete">
          <h2>Points d’attention <span className="pil-compteur">{alertesVisibles.length}</span></h2>
          {filtreCommercial && <button className="pil-lien" onClick={() => setFiltreCommercial('')}>Toute l’équipe ({nomCommercial.get(filtreCommercial)} sélectionné)</button>}
        </div>
        {alertesVisibles.length === 0
          ? <p className="pil-vide">Rien à signaler : aucun devis oublié, aucun prospect chaud laissé de côté.</p>
          : <ul className="pil-alertes">
            {alertesVisibles.slice(0, 40).map((a, i) => {
              const Icone = ICONE_ALERTE[a.type]
              return (
                <li key={i} className={`pil-alerte a-${a.type}`}>
                  <span className="pil-alerte-icone"><Icone size={16} /></span>
                  <div><strong>{a.titre}</strong><small>{a.detail}{a.commercialId ? ` · ${nomCommercial.get(a.commercialId) || ''}` : ''}</small></div>
                  <span className="pil-alerte-tag">{LIBELLE_ALERTE[a.type]}</span>
                  {onNavigate && <button className="pil-lien" onClick={() => onNavigate(a.type.startsWith('devis') ? 'devis' : 'prospects')}>Ouvrir</button>}
                </li>
              )
            })}
          </ul>}
      </section>
    </div>
  )
}
