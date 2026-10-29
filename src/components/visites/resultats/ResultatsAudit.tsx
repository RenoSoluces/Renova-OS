import {
  AlertTriangle, ArrowRight, Check, Droplets, FileDown, FileSignature, Flame, Home, Layers,
  RefreshCw, Save, Sun, ThermometerSnowflake, TrendingDown, Wind, Wrench, Zap, PanelTop, Square,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { ResultatDPE } from '../../../lib/3cl/calculDPE'
import type { ResultatDeperditions } from '../../../lib/3cl/calcul/deperditions/calculDeperditions'
import type { PropositionBouquet, PropositionTravaux } from '../../../lib/3cl/analyse/proposerTravaux'
import type { ResultatSimulationPV } from '../../../lib/photovoltaique/calculProduction'
import type { EstimationFinancement } from '../../../lib/financement/estimerFinancement'
import type { AlerteCoherence } from '../../../lib/visite/verifierCoherenceAudit'
import type { DispositifAide } from '../../../types'
import { dpeColor } from '../../../lib/3cl/moteur3CL'
import '../../../styles/resultats-audit.css'

const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
const SEUILS_ENERGIE = ['≤ 70', '71 à 110', '111 à 180', '181 à 250', '251 à 330', '331 à 420', '> 420']
const SEUILS_GES = ['≤ 6', '7 à 11', '12 à 30', '31 à 50', '51 à 70', '71 à 100', '> 100']
const COULEURS_GES = ['#F6EDFD', '#E4C7FA', '#D5AAF6', '#CB95F3', '#BA72EF', '#A74DEB', '#8A19DF']

const nf = (n: number, d = 0) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })
const euros = (n: number) => `${nf(Math.round(n))} €`
const texteSur = (lettre: string) => (lettre >= 'E' ? '#fff' : '#1f2937')

export interface FinancementBouquet {
  montantTravauxHT: number
  totalAides: number
  resteACharge: number
  profilConnu: boolean
  sourceIndicative: boolean
}

export interface ResultatsAuditProps {
  dpe: ResultatDPE | null
  deperditions: ResultatDeperditions | null
  travaux: PropositionTravaux[] | null
  bouquets: PropositionBouquet[] | null
  simulationPV: ResultatSimulationPV | null
  financementParGeste: Record<string, EstimationFinancement>
  financementBouquet: (gestes: string[]) => FinancementBouquet | null
  dispositifsAides: DispositifAide[]
  alertes: AlerteCoherence[]
  surface: number
  zoneClimatique: string
  produitLabel?: string | null
  admin: boolean
  prixCataloguePV: number | null

  selectedTravaux: string[]
  onToggleTravaux: (id: string) => void
  onSelectionnerBouquet: (gestes: string[]) => void

  onCalculer: () => void
  onTelecharger: () => void
  onEnregistrer: () => void
  savingSimulation: boolean
  simulationSaved: boolean
  onCreerDevis: () => void
  creatingDevis: boolean
  onCreerDevisPV: () => void
  creatingDevisPV: boolean
}

export function ResultatsAudit(p: ResultatsAuditProps) {
  if (!p.dpe) {
    return (
      <div className="ra">
        {p.alertes.length > 0 && <Alertes alertes={p.alertes} />}
        <div className="ra-card ra-empty">
          <span className="ra-empty-icon"><Zap size={24} /></span>
          <h2>{p.produitLabel ? `Visite « ${p.produitLabel} » terminée` : 'Audit terminé'}</h2>
          <p>Lancez le calcul pour obtenir la note du logement, les déperditions et les travaux recommandés.</p>
          <button className="btn btn-primary btn-lg" onClick={p.onCalculer}><Zap size={18} /> Calculer la note du logement</button>
        </div>
      </div>
    )
  }

  const dpe = p.dpe
  const nbSel = p.selectedTravaux.length

  return (
    <div className="ra">
      <Hero dpe={dpe} surface={p.surface} zone={p.zoneClimatique} />

      {p.alertes.length > 0 && <Alertes alertes={p.alertes} />}

      <div className="ra-grid-2">
        {p.deperditions && p.deperditions.total > 0 && <Deperditions d={p.deperditions} />}
        <Usages dpe={dpe} />
      </div>

      {p.bouquets && p.bouquets.length > 0 && (
        <Bloc
          icone={<Layers size={18} />}
          titre="Scénarios de rénovation"
          sousTitre="Plusieurs gestes simulés ensemble sur ce logement : la présentation la plus parlante pour le client."
        >
          <div className="ra-bouquets">
            {p.bouquets.map((b, i) => {
              const f = p.financementBouquet(b.gestes)
              const cible = b.gestes.filter(g => (p.travaux ?? []).some(t => t.id === g))
              const actif = cible.length > 0 && cible.length === nbSel && cible.every(g => p.selectedTravaux.includes(g))
              return (
                <div key={b.id} className={`ra-bouquet ${actif ? 'is-active' : ''}`}>
                  {i === 0 && <span className="ra-ribbon">Recommandé</span>}
                  <div className="ra-bouquet-head">
                    <TransitionLettres avant={b.etiquetteAvant} apres={b.etiquetteApres} />
                    <div className="ra-gain"><TrendingDown size={15} /> −{nf(b.gainPourcentage)} %</div>
                  </div>
                  <h4>{b.titre}</h4>
                  <p>{b.description}</p>
                  <div className="ra-chips">{b.gestesLabels.map(l => <span key={l}>{l}</span>)}</div>
                  <div className="ra-bouquet-chiffres">
                    <span>−{nf(b.gainCEP)} kWhEP/an</span>
                    <span>−{nf(b.gainGES)} kg CO₂/an</span>
                    {b.sautsEtiquette > 0 && <span className="is-good">+{b.sautsEtiquette} classe{b.sautsEtiquette > 1 ? 's' : ''}</span>}
                  </div>
                  {f && <Financement montant={f.montantTravauxHT} aides={f.totalAides} reste={f.resteACharge}
                    note={[f.sourceIndicative ? 'prix indicatifs' : '', !f.profilConnu ? 'profil du foyer inconnu' : ''].filter(Boolean).join(' · ')} />}
                  <button className={`btn ${actif ? 'btn-primary' : 'btn-secondary'} btn-block`} onClick={() => p.onSelectionnerBouquet(b.gestes)}>
                    {actif ? <><Check size={16} /> Scénario sélectionné</> : 'Choisir ce scénario'}
                  </button>
                </div>
              )
            })}
          </div>
        </Bloc>
      )}

      {p.travaux && p.travaux.length > 0 && (
        <Bloc
          icone={<Wrench size={18} />}
          titre="Travaux un par un"
          sousTitre="Chaque geste simulé seul, classé par impact. Cochez ce que vous mettez au devis."
        >
          <div className="ra-gestes">
            {p.travaux.map(t => {
              const f = p.financementParGeste[t.id]
              const coche = p.selectedTravaux.includes(t.id)
              return (
                <label key={t.id} className={`ra-geste ${coche ? 'is-checked' : ''}`}>
                  <input type="checkbox" checked={coche} onChange={() => p.onToggleTravaux(t.id)} />
                  <span className="ra-check" aria-hidden>{coche && <Check size={14} />}</span>
                  <div className="ra-geste-txt">
                    <strong>{t.titre}</strong>
                    <span>{t.description}</span>
                  </div>
                  <TransitionLettres avant={t.etiquetteAvant} apres={t.etiquetteApres} petit />
                  <div className="ra-geste-gain">
                    <strong><TrendingDown size={14} /> −{nf(t.gainPourcentage)} %</strong>
                    <span>−{nf(t.gainCEP)} kWhEP/an</span>
                  </div>
                  {f && (
                    <div className="ra-geste-fin">
                      <strong>{euros(f.resteACharge)}</strong>
                      <span>reste à charge</span>
                      <small>{euros(f.montantTravauxHT)} HT − {euros(f.totalAides)} d’aides</small>
                      {f.avertissement && <small className="ra-warn">{f.avertissement}</small>}
                    </div>
                  )}
                </label>
              )
            })}
          </div>
        </Bloc>
      )}

      {p.simulationPV && <Photovoltaique pv={p.simulationPV} admin={p.admin} prixCatalogue={p.prixCataloguePV} onDevis={p.onCreerDevisPV} creating={p.creatingDevisPV} />}

      {p.travaux && p.travaux.length > 0 && p.dispositifsAides.length > 0 && (
        <Bloc icone={<Check size={18} />} titre="Aides mobilisables" sousTitre="Fiches CEE et MaPrimeRénov’ en vigueur pour ces travaux, à confirmer selon le profil du bénéficiaire.">
          <div className="ra-aides">
            {p.dispositifsAides.map(d => (
              <div key={d.id} className="ra-aide">
                <span className={`badge ${d.dispositif === 'cee' ? 'badge-info' : 'badge-success'}`}>{d.dispositif === 'cee' ? 'CEE' : 'MaPrimeRénov’'}</span>
                <strong>{d.code}</strong>
                <span className="ra-aide-lib">{d.libelle}</span>
                <span className="ra-aide-public">
                  {d.public_cible === 'professionnel' ? 'Professionnel' : d.public_cible === 'tous' ? 'Particulier & pro' : 'Particulier'} · {d.secteur === 'tertiaire' ? 'Tertiaire' : 'Résidentiel'}
                </span>
              </div>
            ))}
          </div>
        </Bloc>
      )}

      <p className="ra-methode">
        Estimation selon la méthode 3CL-DPE (arrêté du 31 mars 2021), zone climatique {p.zoneClimatique} déduite du code postal.
        Elle sert à conseiller le client et ne remplace pas un DPE réglementaire réalisé par un diagnostiqueur certifié.
      </p>

      <div className="ra-actions">
        <button className="btn btn-ghost" onClick={p.onCalculer}><RefreshCw size={16} /> Recalculer</button>
        <button className="btn btn-secondary" onClick={p.onTelecharger}><FileDown size={16} /> Rapport PDF</button>
        <button className="btn btn-secondary" onClick={p.onEnregistrer} disabled={p.savingSimulation || p.simulationSaved}>
          {p.simulationSaved ? <><Check size={16} /> Simulation enregistrée</> : <><Save size={16} /> {p.savingSimulation ? 'Enregistrement…' : 'Enregistrer la simulation'}</>}
        </button>
        <div className="ra-actions-spacer" />
        {p.travaux && p.travaux.length > 0 && (
          <button className="btn btn-primary" onClick={p.onCreerDevis} disabled={p.creatingDevis || nbSel === 0}
            title={nbSel === 0 ? 'Choisissez un scénario ou cochez des travaux' : undefined}>
            <FileSignature size={16} />
            {p.creatingDevis ? 'Création du devis…' : nbSel === 0 ? 'Créer un devis' : `Créer le devis (${nbSel} poste${nbSel > 1 ? 's' : ''})`}
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------- Note du logement ---------- */

function Hero({ dpe, surface, zone }: { dpe: ResultatDPE; surface: number; zone: string }) {
  const conso = Math.round(dpe.consommationM2)
  const ges = Math.round(dpe.emissionsM2)
  const gesLimite = dpe.etiquette !== dpe.etiquetteEnergie
  return (
    <div className="ra-card ra-hero">
      <div className="ra-hero-note">
        <span className="ra-kicker">Note du logement</span>
        <div className="ra-hero-lettre" style={{ background: dpeColor(dpe.etiquette), color: texteSur(dpe.etiquette) }}>{dpe.etiquette}</div>
        <div className="ra-hero-chiffres">
          <div><strong>{nf(conso)}</strong><span>kWh/m²·an<br />énergie primaire</span></div>
          <div><strong>{nf(ges)}</strong><span>kg CO₂/m²·an<br />émissions</span></div>
        </div>
        {gesLimite && (
          <p className="ra-hero-note-txt">
            Classé {dpe.etiquette} à cause des émissions de CO₂ (énergie seule : {dpe.etiquetteEnergie}). La note retient le moins bon des deux critères.
          </p>
        )}
        <dl className="ra-hero-infos">
          <div><dt><Home size={14} /> Surface</dt><dd>{nf(surface)} m²</dd></div>
          <div><dt><ThermometerSnowflake size={14} /> Zone</dt><dd>{zone}</dd></div>
          <div><dt><Zap size={14} /> Énergie finale</dt><dd>{nf(dpe.consommationFinale)} kWh/an</dd></div>
        </dl>
      </div>
      <div className="ra-hero-echelles">
        <Echelle titre="Consommation d’énergie" unite="kWh/m²·an" valeur={conso} active={dpe.etiquetteEnergie} seuils={SEUILS_ENERGIE} couleur={l => dpeColor(l)} />
        <Echelle titre="Émissions de gaz à effet de serre" unite="kg CO₂/m²·an" valeur={ges} active={dpe.etiquetteGES} seuils={SEUILS_GES} couleur={l => COULEURS_GES[LETTRES.indexOf(l as typeof LETTRES[number])]} gaz />
      </div>
    </div>
  )
}

function Echelle({ titre, unite, valeur, active, seuils, couleur, gaz }: {
  titre: string; unite: string; valeur: number; active: string; seuils: string[]; couleur: (l: string) => string; gaz?: boolean
}) {
  return (
    <div className="ra-echelle">
      <div className="ra-echelle-titre">{titre}</div>
      {LETTRES.map((l, i) => {
        const estActive = l === active
        return (
          <div key={l} className={`ra-echelle-ligne ${estActive ? 'is-active' : ''}`}>
            <div className="ra-echelle-barre" style={{ width: `${34 + i * 9}%`, background: couleur(l), color: gaz ? (i >= 4 ? '#fff' : '#3b1d5a') : texteSur(l) }}>
              <span className="ra-echelle-seuil">{seuils[i]}</span>
              <span className="ra-echelle-lettre">{l}</span>
            </div>
            {estActive && (
              <div className="ra-echelle-marqueur">
                <strong>{nf(valeur)}</strong><span>{unite}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Où part la chaleur ---------- */

function Deperditions({ d }: { d: ResultatDeperditions }) {
  const postes = [
    { id: 'murs', label: 'Murs', valeur: d.murs, icone: <Square size={15} /> },
    { id: 'toit', label: 'Toiture / combles', valeur: d.toitures, icone: <PanelTop size={15} /> },
    { id: 'air', label: 'Air (ventilation, fuites)', valeur: d.renouvellementAir, icone: <Wind size={15} /> },
    { id: 'menuiseries', label: 'Fenêtres et portes', valeur: d.menuiseries, icone: <Layers size={15} /> },
    { id: 'ponts', label: 'Ponts thermiques', valeur: d.pontsThermiques, icone: <ArrowRight size={15} /> },
    { id: 'planchers', label: 'Planchers bas', valeur: d.planchers, icone: <Layers size={15} /> },
  ].filter(x => x.valeur > 0).sort((a, b) => b.valeur - a.valeur)
  const max = postes[0]?.valeur || 1
  return (
    <Bloc icone={<Flame size={18} />} titre="Où part la chaleur" sousTitre={`Pertes du logement : ${nf(Math.round(d.total))} W/K au total.`} carte>
      <div className="ra-barres">
        {postes.map((x, i) => {
          const pct = (x.valeur / d.total) * 100
          return (
            <div key={x.id} className={`ra-barre ${i === 0 ? 'is-top' : ''}`}>
              <div className="ra-barre-head">
                <span className="ra-barre-label">{x.icone}{x.label}</span>
                <span className="ra-barre-pct">{nf(pct)} %</span>
              </div>
              <div className="ra-barre-piste"><div style={{ width: `${(x.valeur / max) * 100}%` }} /></div>
            </div>
          )
        })}
      </div>
    </Bloc>
  )
}

/* ---------- Consommation par usage ---------- */

function Usages({ dpe }: { dpe: ResultatDPE }) {
  const aux = Math.max(0, dpe.consommationEP - dpe.chauffage.consommationEP - dpe.ecs.consommationEP)
  const usages = [
    { label: 'Chauffage', ep: dpe.chauffage.consommationEP, co2: dpe.chauffage.emissionsCO2, icone: <Flame size={15} />, cls: 'u-ch' },
    { label: 'Eau chaude', ep: dpe.ecs.consommationEP, co2: dpe.ecs.emissionsCO2, icone: <Droplets size={15} />, cls: 'u-ecs' },
    { label: 'Auxiliaires', ep: aux, co2: null as number | null, icone: <Zap size={15} />, cls: 'u-aux' },
  ].filter(u => u.ep > 0)
  const total = usages.reduce((s, u) => s + u.ep, 0) || 1
  return (
    <Bloc icone={<Zap size={18} />} titre="Consommation par usage" sousTitre={`${nf(dpe.consommationEP)} kWh d’énergie primaire par an.`} carte>
      <div className="ra-stack">
        {usages.map(u => <div key={u.label} className={u.cls} style={{ width: `${(u.ep / total) * 100}%` }} />)}
      </div>
      <div className="ra-usages">
        {usages.map(u => (
          <div key={u.label} className="ra-usage">
            <span className={`ra-dot ${u.cls}`} />
            <span className="ra-usage-label">{u.icone}{u.label}</span>
            <span className="ra-usage-val">
              <strong>{nf(Math.round(u.ep))}</strong> kWhEP/an
              {u.co2 != null && <small>{nf(Math.round(u.co2))} kg CO₂</small>}
            </span>
            <span className="ra-usage-pct">{nf((u.ep / total) * 100)} %</span>
          </div>
        ))}
      </div>
    </Bloc>
  )
}

/* ---------- Photovoltaïque ---------- */

function Photovoltaique({ pv, admin, prixCatalogue, onDevis, creating }: {
  pv: ResultatSimulationPV; admin: boolean; prixCatalogue: number | null; onDevis: () => void; creating: boolean
}) {
  const kpis: [string, string][] = [
    ['Puissance', `${nf(pv.puissanceInstallee, 1)} kWc`],
    ['Surface', `${nf(pv.surfaceNecessaire)} m²`],
    ['Production', `${nf(pv.productionAnnuelle)} kWh/an`],
    ['Autoconsommation', `${Math.round(pv.tauxAutoconsommation * 100)} %`],
    ['Économie facture', `+${euros(pv.economieAutoconsommation)}/an`],
    ['Revente surplus', `+${euros(pv.revenuRevente)}/an`],
    ['Investissement', `${euros(pv.investissementEstime)} TTC`],
    ['Prime autoconso.', `−${euros(pv.primeAutoconsommation)}`],
    ['Retour sur invest.', pv.dureeAmortissementAnnees ? `${pv.dureeAmortissementAnnees} ans` : '—'],
  ]
  return (
    <Bloc icone={<Sun size={18} />} titre="Photovoltaïque" sousTitre="Estimation commerciale à partir de l’orientation, de l’inclinaison et des masques relevés. Ne remplace pas une étude PVGIS." carte classe="ra-pv">
      <div className="ra-kpis">
        {kpis.map(([l, v]) => <div key={l}><span>{l}</span><strong>{v}</strong></div>)}
      </div>
      {(pv.alerteSurfaceInsuffisante || pv.alerteMasquesImportants) && (
        <div className="ra-pv-alertes">
          {pv.alerteSurfaceInsuffisante && <span><AlertTriangle size={14} /> Surface de toiture probablement insuffisante pour cette puissance</span>}
          {pv.alerteMasquesImportants && <span><AlertTriangle size={14} /> Masques importants : la production réelle pourrait être nettement inférieure</span>}
        </div>
      )}
      <div className="ra-pv-pied">
        {admin && <small>Coût retenu : {nf(pv.coutParKwcUtilise)} €/kWc {prixCatalogue ? '(produit catalogue)' : '(tarif par défaut)'}</small>}
        <button className="btn btn-primary" onClick={onDevis} disabled={creating}>
          <FileSignature size={16} /> {creating ? 'Création du devis…' : 'Devis photovoltaïque'}
        </button>
      </div>
    </Bloc>
  )
}

/* ---------- Petits éléments ---------- */

function Alertes({ alertes }: { alertes: AlerteCoherence[] }) {
  const [ouvert, setOuvert] = useState(alertes.some(a => a.niveau === 'erreur'))
  const erreurs = alertes.filter(a => a.niveau === 'erreur').length
  return (
    <div className={`ra-alertes ${erreurs ? 'has-error' : ''}`}>
      <button type="button" className="ra-alertes-head" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}>
        <AlertTriangle size={17} />
        <span><strong>{alertes.length} point{alertes.length > 1 ? 's' : ''} à vérifier</strong> — des données manquantes ou inhabituelles peuvent fausser la note.</span>
        <span className="ra-alertes-toggle">{ouvert ? 'Masquer' : 'Voir'}</span>
      </button>
      {ouvert && (
        <ul>
          {alertes.map((a, i) => (
            <li key={i}>
              <span className={`badge ${a.niveau === 'erreur' ? 'badge-error' : 'badge-warning'}`}>{a.section}</span>
              <span>{a.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Bloc({ icone, titre, sousTitre, children, carte, classe }: {
  icone: ReactNode; titre: string; sousTitre?: string; children: ReactNode; carte?: boolean; classe?: string
}) {
  return (
    <section className={`ra-bloc ${carte ? 'ra-card' : ''} ${classe ?? ''}`}>
      <header className="ra-bloc-head">
        <span className="ra-bloc-icone">{icone}</span>
        <div>
          <h3>{titre}</h3>
          {sousTitre && <p>{sousTitre}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

function TransitionLettres({ avant, apres, petit }: { avant: string; apres: string; petit?: boolean }) {
  return (
    <span className={`ra-trans ${petit ? 'is-small' : ''}`}>
      <span style={{ background: dpeColor(avant), color: texteSur(avant) }}>{avant}</span>
      <ArrowRight size={petit ? 13 : 15} />
      <span style={{ background: dpeColor(apres), color: texteSur(apres) }}>{apres}</span>
    </span>
  )
}

function Financement({ montant, aides, reste, note }: { montant: number; aides: number; reste: number; note?: string }) {
  return (
    <div className="ra-fin">
      <div><span>Travaux</span><span>{euros(montant)} HT</span></div>
      <div><span>Aides estimées</span><span className="is-good">−{euros(aides)}</span></div>
      <div className="ra-fin-total"><span>Reste à charge</span><strong>{euros(reste)}</strong></div>
      {note && <small>Estimation : {note}</small>}
    </div>
  )
}
