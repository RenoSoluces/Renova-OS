import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Sun, User, Home, Zap, LineChart, ArrowLeft, ArrowRight, Check, FileDown, FileSignature, Camera,
  AlertTriangle, BatteryCharging, Info, Loader2, Calculator,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { uploadDocument } from '../lib/storage/uploadDocument'
import { creerDevisDepuisPV } from '../lib/devis/creerDevisDepuisPV'
import { genererSimulationSolairePDF } from '../lib/pdf/genererSimulationSolairePDF'
import {
  ENTREE_PAR_DEFAUT, MASQUES, ORIENTATIONS, PROFILS_PRESENCE, PUISSANCE_PANNEAU_KWC, TARIF_RACHAT_SURPLUS,
  consommationRetenue, heuresPourZone, simulerSolaire, versResultatSimulationPV, zoneDepuisCodePostal,
  type EntreeSolaire,
} from '../lib/photovoltaique/simulateurSolaire'
import { CourbeRentabilite, DonutAutoconsommation, GraphiqueMensuel, SchemaToiture, euro, kwh } from '../components/solaire/Visuels'
import type { Entreprise, Prospect } from '../types'

interface Props {
  onCreateDevis?: (devisId: string) => void
  initialProspectId?: string | null
}

const ETAPES = [
  { id: 1, label: 'Client', icone: User },
  { id: 2, label: 'Toiture', icone: Home },
  { id: 3, label: 'Installation', icone: Zap },
  { id: 4, label: 'Résultats', icone: LineChart },
]
const CLE_BROUILLON = 'renova_simulateur_solaire_v1'
const TYPES_TOITURE = [['tuiles', 'Tuiles'], ['ardoises', 'Ardoises'], ['bac_acier', 'Bac acier'], ['toit_terrasse', 'Toit terrasse'], ['autre', 'Autre']]

/** Convertit une image (URL ou data URL) en data URL PNG, ou null si elle est illisible. */
async function versDataUrl(src: string): Promise<string | null> {
  try {
    if (src.startsWith('data:image')) return src
    const blob = await (await fetch(src)).blob()
    return await new Promise<string>((resolve, reject) => {
      const lecteur = new FileReader()
      lecteur.onload = () => resolve(String(lecteur.result))
      lecteur.onerror = reject
      lecteur.readAsDataURL(blob)
    })
  } catch { return null }
}

function lireBrouillon(): { entree: EntreeSolaire; prospectId: string; typeToiture: string } | null {
  try {
    const brut = localStorage.getItem(CLE_BROUILLON)
    return brut ? JSON.parse(brut) : null
  } catch { return null }
}

function Nombre({ value, onChange, ...rest }: { value: number | null; onChange: (v: number | null) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <input {...rest} type="number" inputMode="decimal" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} />
}

export function SimulateurSolairePage({ onCreateDevis, initialProspectId }: Props) {
  const brouillon = useMemo(lireBrouillon, [])
  const [etape, setEtape] = useState(1)
  const [entree, setEntree] = useState<EntreeSolaire>(brouillon?.entree ?? ENTREE_PAR_DEFAUT)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [prospectId, setProspectId] = useState(initialProspectId || brouillon?.prospectId || '')
  const [typeToiture, setTypeToiture] = useState(brouillon?.typeToiture || 'tuiles')
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [photos, setPhotos] = useState<{ nom: string; url: string; envoi: 'en_cours' | 'ok' | 'erreur' }[]>([])
  const [action, setAction] = useState<'pdf' | 'devis' | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null)
  const fichierRef = useRef<HTMLInputElement>(null)

  const maj = (patch: Partial<EntreeSolaire>) => setEntree(e => ({ ...e, ...patch }))
  const prospect = prospects.find(p => p.id === prospectId) || null
  const resultat = useMemo(() => simulerSolaire(entree), [entree])
  const zone = zoneDepuisCodePostal(entree.codePostal)
  const heuresZone = heuresPourZone(zone)

  useEffect(() => {
    supabase.from('prospects').select('*').order('nom').then(({ data }) => setProspects((data || []) as Prospect[]))
    supabase.from('entreprises').select('*').limit(1).maybeSingle().then(({ data }) => { if (data) setEntreprise(data as Entreprise) })
  }, [])

  useEffect(() => {
    try { localStorage.setItem(CLE_BROUILLON, JSON.stringify({ entree, prospectId, typeToiture })) } catch { /* stockage indisponible */ }
  }, [entree, prospectId, typeToiture])

  function choisirProspect(id: string) {
    setProspectId(id)
    const p = prospects.find(x => x.id === id)
    if (p?.code_postal) maj({ codePostal: p.code_postal })
  }

  async function ajouterPhotos(fichiers: FileList | null) {
    if (!fichiers) return
    for (const f of Array.from(fichiers)) {
      const url = URL.createObjectURL(f)
      setPhotos(p => [...p, { nom: f.name, url, envoi: 'en_cours' }])
      if (!prospectId) { setPhotos(p => p.map(x => x.url === url ? { ...x, envoi: 'erreur' } : x)); continue }
      const { error } = await uploadDocument(f, { prospectId, categorie: 'Photo toiture', type: 'image' })
      setPhotos(p => p.map(x => x.url === url ? { ...x, envoi: error ? 'erreur' : 'ok' } : x))
    }
    if (fichierRef.current) fichierRef.current.value = ''
  }

  async function exporterPDF() {
    if (resultat.prixManquant) { setMessage({ type: 'erreur', texte: 'Renseignez le prix du kWh avant d’éditer le PDF.' }); return }
    setAction('pdf'); setMessage(null)
    try {
      // Logo de l'entreprise (Paramètres) ; à défaut, le logo Reno Soluces fourni avec l'application.
      const logo = (entreprise?.logo_url && (await versDataUrl(entreprise.logo_url))) || (await versDataUrl('/Logo RenoSoluces.png'))
      const doc = genererSimulationSolairePDF(resultat, entree, prospect, entreprise, logo)
      const nom = `simulation-solaire-${(prospect?.nom || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
      doc.save(nom)
      if (prospectId) await supabase.from('interactions').insert({ prospect_id: prospectId, type: 'note', contenu: `Simulation solaire éditée : ${resultat.puissanceKwc} kWc, ${resultat.productionAnnuelle} kWh/an, gain estimé ${resultat.gainAnnuel} €/an.` })
      setMessage({ type: 'ok', texte: 'PDF généré.' })
    } catch (e) {
      setMessage({ type: 'erreur', texte: `Impossible de générer le PDF : ${e instanceof Error ? e.message : 'erreur inconnue'}` })
    }
    setAction(null)
  }

  async function creerDevis() {
    if (!prospectId) { setMessage({ type: 'erreur', texte: 'Choisissez un client à l’étape 1 pour créer un devis.' }); return }
    setAction('devis'); setMessage(null)
    const { devisId, error } = await creerDevisDepuisPV({ prospectId, simulation: versResultatSimulationPV(resultat), origine: 'simulation solaire' })
    setAction(null)
    if (error && !devisId) { setMessage({ type: 'erreur', texte: error }); return }
    if (error) setMessage({ type: 'erreur', texte: `Devis créé mais incomplet : ${error}` })
    if (devisId) onCreateDevis?.(devisId)
  }

  const peutAvancer = etape === 1 ? !!entree.prixKwh : true
  const conso = consommationRetenue(entree)

  return (
    <div className="sol">
      <header className="sol-hero">
        <div className="sol-hero-icon"><Sun size={26} /></div>
        <div>
          <div className="sol-kicker">Parcours dédié</div>
          <h1>Simulateur solaire</h1>
          <p>Production, autoconsommation et rentabilité d’une installation photovoltaïque, à montrer au client en direct.</p>
        </div>
      </header>

      <nav className="sol-etapes" aria-label="Étapes du simulateur">
        {ETAPES.map(e => {
          const Icone = e.icone
          return (
            <button key={e.id} type="button" className={`sol-etape ${etape === e.id ? 'active' : ''} ${etape > e.id ? 'done' : ''}`} onClick={() => setEtape(e.id)} aria-current={etape === e.id ? 'step' : undefined}>
              <span className="sol-etape-pastille">{etape > e.id ? <Check size={14} /> : <Icone size={15} />}</span>
              <span className="sol-etape-label">{e.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sol-corps">
        <div className="sol-principal">
          {etape === 1 && (
            <section className="sol-carte">
              <h2>Le client et sa consommation</h2>
              <div className="sol-grille">
                <label className="sol-champ sol-champ-large">
                  <span>Client</span>
                  <select value={prospectId} onChange={e => choisirProspect(e.target.value)}>
                    <option value="">— Simulation sans client enregistré —</option>
                    {prospects.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}{p.ville ? ` — ${p.ville}` : ''}</option>)}
                  </select>
                </label>
                <label className="sol-champ">
                  <span>Code postal du logement</span>
                  <input value={entree.codePostal} inputMode="numeric" maxLength={5} onChange={e => maj({ codePostal: e.target.value })} placeholder="ex. 69003" />
                  <small>{entree.codePostal.length >= 2 ? `Zone climatique ${zone} · ensoleillement indicatif ${heuresZone} h/an` : 'Détermine l’ensoleillement'}</small>
                </label>
                <label className="sol-champ sol-prix">
                  <span>Prix du kWh payé par le client (€ TTC) <b className="req">*</b></span>
                  <div className="sol-prix-saisie"><Nombre value={entree.prixKwh} step={0.001} min={0} onChange={v => maj({ prixKwh: v })} placeholder="0,25" /><em>€ / kWh</em></div>
                  <small>À relever sur sa facture, devant lui.</small>
                </label>
              </div>

              <h3>Consommation électrique</h3>
              <div className="sol-grille">
                <label className="sol-champ">
                  <span>Consommation annuelle (kWh)</span>
                  <Nombre value={entree.consommationAnnuelleKwh} min={0} step={100} onChange={v => maj({ consommationAnnuelleKwh: v })} placeholder="ex. 6000" />
                </label>
                <label className="sol-champ">
                  <span>… ou facture mensuelle moyenne (€)</span>
                  <Nombre value={entree.factureMensuelleEur} min={0} step={5} onChange={v => maj({ factureMensuelleEur: v })} placeholder="ex. 125" />
                  <small>{!entree.consommationAnnuelleKwh && conso ? `≈ ${conso.toLocaleString('fr-FR')} kWh par an` : 'Utilisée si la consommation n’est pas connue'}</small>
                </label>
                <label className="sol-champ">
                  <span>Puissance du compteur (kVA)</span>
                  <select value={entree.puissanceCompteurKva ?? ''} onChange={e => maj({ puissanceCompteurKva: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Non relevée</option>{[3, 6, 9, 12, 15, 18, 24, 30, 36].map(k => <option key={k} value={k}>{k} kVA</option>)}
                  </select>
                </label>
                <label className="sol-champ">
                  <span>Raccordement</span>
                  <select value={entree.typeRaccordement} onChange={e => maj({ typeRaccordement: e.target.value as EntreeSolaire['typeRaccordement'] })}>
                    <option value="monophase">Monophasé</option><option value="triphase">Triphasé</option>
                  </select>
                </label>
              </div>

              <h3>Quand le foyer consomme-t-il ?</h3>
              <div className="sol-choix sol-choix-3">
                {PROFILS_PRESENCE.map(p => (
                  <button key={p.value} type="button" className={`sol-option ${entree.profil === p.value ? 'on' : ''}`} onClick={() => maj({ profil: p.value })}>
                    <strong>{p.label}</strong><small>{p.desc}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {etape === 2 && (
            <section className="sol-carte">
              <h2>La toiture</h2>
              <h3>Orientation du pan équipé</h3>
              <div className="sol-orientations">
                {ORIENTATIONS.map(o => (
                  <button key={o.value} type="button" className={`sol-orient ${entree.orientation === o.value ? 'on' : ''}`} onClick={() => maj({ orientation: o.value })} title={`Coefficient indicatif ${o.coefficient}`}>
                    <strong>{o.court}</strong><small>{o.label}</small>
                  </button>
                ))}
              </div>

              <div className="sol-grille">
                <label className="sol-champ">
                  <span>Inclinaison du toit : <b>{entree.inclinaisonDeg ?? 30}°</b></span>
                  <input type="range" min={0} max={60} step={1} value={entree.inclinaisonDeg ?? 30} onChange={e => maj({ inclinaisonDeg: Number(e.target.value) })} />
                  <small>Optimum autour de 30°</small>
                </label>
                <label className="sol-champ">
                  <span>Surface de toiture disponible (m²)</span>
                  <Nombre value={entree.surfaceDisponibleM2} min={0} onChange={v => maj({ surfaceDisponibleM2: v })} placeholder="ex. 40" />
                </label>
                <label className="sol-champ">
                  <span>Nombre de pans de toiture</span>
                  <Nombre value={entree.nombrePans} min={1} max={8} onChange={v => maj({ nombrePans: v ?? 1 })} />
                </label>
                <label className="sol-champ">
                  <span>Type de couverture</span>
                  <select value={typeToiture} onChange={e => setTypeToiture(e.target.value)}>{TYPES_TOITURE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
              </div>

              <h3>Masques solaires (arbres, bâtiments voisins)</h3>
              <div className="sol-choix sol-choix-4">
                {MASQUES.map(m => (
                  <button key={m.value} type="button" className={`sol-option ${entree.masques === m.value ? 'on' : ''}`} onClick={() => maj({ masques: m.value })}>
                    <strong>{m.label}</strong>
                  </button>
                ))}
              </div>

              <h3>Photos de la toiture</h3>
              <div className="sol-photos">
                {photos.map(p => (
                  <figure key={p.url} className={`sol-photo ${p.envoi}`}>
                    <img src={p.url} alt={p.nom} />
                    <figcaption>{p.envoi === 'en_cours' ? 'Envoi…' : p.envoi === 'ok' ? 'Enregistrée' : 'Non enregistrée (choisir un client)'}</figcaption>
                  </figure>
                ))}
                <button type="button" className="sol-photo-ajout" onClick={() => fichierRef.current?.click()}><Camera size={22} /><span>Ajouter</span></button>
                <input ref={fichierRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={e => void ajouterPhotos(e.target.files)} />
              </div>
            </section>
          )}

          {etape === 3 && (
            <section className="sol-carte">
              <h2>L’installation</h2>
              <div className="sol-puissance">
                <div className="sol-puissance-valeur"><strong>{entree.puissanceKwc.toLocaleString('fr-FR')}</strong><span>kWc</span></div>
                <input type="range" min={1} max={20} step={0.5} value={entree.puissanceKwc} onChange={e => maj({ puissanceKwc: Number(e.target.value) })} aria-label="Puissance de l'installation en kWc" />
                <div className="sol-puissance-info">{resultat.nombrePanneaux} panneaux de {Math.round(PUISSANCE_PANNEAU_KWC * 1000)} Wc · environ {resultat.surfaceNecessaireM2.toLocaleString('fr-FR')} m² de toiture</div>
              </div>

              <button type="button" className={`sol-batterie ${entree.batterie ? 'on' : ''}`} onClick={() => maj({ batterie: !entree.batterie })} aria-pressed={entree.batterie}>
                <BatteryCharging size={24} />
                <span><strong>Ajouter une batterie de stockage</strong><small>Stocke le surplus de la journée pour le soir : plus d’autoconsommation.</small></span>
                <span className="sol-interrupteur" />
              </button>

              <div className="sol-grille">
                <label className="sol-champ">
                  <span>Prix de l’installation posée (€ TTC)</span>
                  <Nombre value={entree.prixInstallationTtc} min={0} step={100} onChange={v => maj({ prixInstallationTtc: v })} placeholder={`≈ ${resultat.investissement.toLocaleString('fr-FR')}`} />
                  <small>{entree.prixInstallationTtc ? 'Prix saisi' : 'Estimation indicative utilisée tant que le prix du devis n’est pas saisi'}</small>
                </label>
              </div>

              <div className="sol-formule">
                <div className="sol-formule-titre"><Calculator size={16} /> Calcul de la production (formule ADEME)</div>
                <div className="sol-formule-ligne">
                  <div><small>Puissance</small><strong>{entree.puissanceKwc.toLocaleString('fr-FR')} kWc</strong></div><i>×</i>
                  <div><small>Coefficient d’orientation</small><strong>{resultat.coefficientOrientation.toLocaleString('fr-FR')}</strong></div><i>×</i>
                  <div><small>Heures d’ensoleillement / an</small><strong>{resultat.heuresEnsoleillement.toLocaleString('fr-FR')} h</strong></div><i>=</i>
                  <div className="res"><small>Production annuelle</small><strong>{kwh(resultat.productionAnnuelle)}</strong></div>
                </div>
                <div className="sol-grille sol-grille-compact">
                  <label className="sol-champ">
                    <span>Coefficient d’orientation (ADEME)</span>
                    <Nombre value={entree.coefficientOrientationManuel} min={0} max={1.1} step={0.01} onChange={v => maj({ coefficientOrientationManuel: v })} placeholder={String(resultat.coefficientOrientation)} />
                    <small>Laisser vide : valeur indicative selon orientation et inclinaison</small>
                  </label>
                  <label className="sol-champ">
                    <span>Heures d’ensoleillement par an (ADEME)</span>
                    <Nombre value={entree.heuresEnsoleillementManuel} min={0} step={10} onChange={v => maj({ heuresEnsoleillementManuel: v })} placeholder={String(heuresZone)} />
                    <small>Laisser vide : valeur indicative de la zone {zone}</small>
                  </label>
                </div>
                {entree.masques !== 'aucun' && <p className="sol-note"><Info size={14} /> Masques solaires pris en compte : production × {resultat.coefficientMasques.toLocaleString('fr-FR')}.</p>}
              </div>
            </section>
          )}

          {etape === 4 && (
            <div className="sol-resultats">
              {resultat.prixManquant && (
                <div className="sol-alerte"><AlertTriangle size={18} />
                  <div><strong>Renseignez le prix du kWh pour calculer les économies.</strong>
                    <div className="sol-prix-saisie sol-prix-inline"><Nombre value={entree.prixKwh} step={0.001} min={0} onChange={v => maj({ prixKwh: v })} placeholder="0,25" /><em>€ / kWh</em></div>
                  </div>
                </div>
              )}
              {resultat.alertes.map(a => <div key={a} className="sol-alerte sol-alerte-douce"><AlertTriangle size={16} /><span>{a}</span></div>)}

              <div className="sol-kpis">
                <div className="sol-kpi"><small>Production par an</small><strong>{kwh(resultat.productionAnnuelle)}</strong><span>{resultat.nombrePanneaux} panneaux · {resultat.puissanceKwc.toLocaleString('fr-FR')} kWc</span></div>
                <div className="sol-kpi accent"><small>Économies par an</small><strong>{resultat.prixManquant ? '—' : euro(resultat.gainAnnuel)}</strong><span>{resultat.prixManquant ? 'prix du kWh requis' : `dont ${euro(resultat.economieAutoconsommation)} d’électricité non achetée`}</span></div>
                <div className="sol-kpi"><small>Rentable en</small><strong>{resultat.delaiRetourAnnees != null ? `${resultat.delaiRetourAnnees.toLocaleString('fr-FR')} ans` : '—'}</strong><span>investissement {euro(resultat.investissement)}{resultat.investissementEstime ? ' (estimé)' : ''}</span></div>
                <div className="sol-kpi"><small>Gain net sur 20 ans</small><strong>{resultat.prixManquant ? '—' : euro(resultat.gain20Ans - resultat.investissement)}</strong><span>prix du kWh +{entree.inflationKwhPct}%/an</span></div>
              </div>

              <div className="sol-duo">
                <section className="sol-carte sol-carte-visuel"><h3>Votre toiture</h3>
                  <SchemaToiture orientation={entree.orientation} inclinaisonDeg={entree.inclinaisonDeg} nombrePanneaux={resultat.nombrePanneaux} puissanceKwc={resultat.puissanceKwc} surfaceNecessaireM2={resultat.surfaceNecessaireM2} />
                </section>
                <section className="sol-carte sol-carte-visuel"><h3>Ce que vous consommez vous-même</h3>
                  <div className="sol-donut-bloc">
                    <DonutAutoconsommation r={resultat} />
                    <ul className="sol-legende">
                      <li><i className="auto" /><span><strong>{kwh(resultat.energieAutoconsommee)}</strong> autoconsommés<small>{resultat.tauxCouverture != null ? `couvre ${Math.round(resultat.tauxCouverture * 100)} % de vos besoins` : 'économisés sur votre facture'}</small></span></li>
                      <li><i className="surplus" /><span><strong>{kwh(resultat.energieRevendue)}</strong> revendus<small>{TARIF_RACHAT_SURPLUS.toLocaleString('fr-FR')} €/kWh · {euro(resultat.revenuRevente)} par an</small></span></li>
                    </ul>
                  </div>
                </section>
              </div>

              <section className="sol-carte sol-carte-visuel">
                <div className="sol-carte-tete"><h3>Production mois par mois</h3>
                  <div className="sol-legende-ligne"><span><i className="auto" />Autoconsommé</span><span><i className="surplus" />Revendu</span>{resultat.consommationMensuelle && <span><i className="conso" />Consommation</span>}</div></div>
                <GraphiqueMensuel r={resultat} />
              </section>

              <section className="sol-carte sol-carte-visuel">
                <h3>Gain cumulé sur 20 ans, installation déduite</h3>
                <CourbeRentabilite r={resultat} />
                <p className="sol-note"><Info size={14} /> Hypothèses : prix du kWh +{entree.inflationKwhPct} %/an, panneaux −{entree.degradationPanneauxPct.toLocaleString('fr-FR')} %/an, surplus racheté {TARIF_RACHAT_SURPLUS.toLocaleString('fr-FR')} €/kWh, aucune prime à l’autoconsommation.</p>
              </section>

              {message && <div className={`sol-message ${message.type}`}>{message.texte}</div>}
              <div className="sol-actions">
                <button type="button" className="btn btn-secondary btn-lg" onClick={() => void exporterPDF()} disabled={action !== null}>{action === 'pdf' ? <Loader2 size={18} className="spin" /> : <FileDown size={18} />} Éditer le PDF client</button>
                <button type="button" className="btn btn-primary btn-lg" onClick={() => void creerDevis()} disabled={action !== null}>{action === 'devis' ? <Loader2 size={18} className="spin" /> : <FileSignature size={18} />} Créer le devis</button>
              </div>
            </div>
          )}

          <div className="sol-nav">
            <button type="button" className="btn btn-ghost" onClick={() => setEtape(e => Math.max(1, e - 1))} disabled={etape === 1}><ArrowLeft size={16} /> Précédent</button>
            {etape < 4 && <button type="button" className="btn btn-primary" onClick={() => setEtape(e => e + 1)} disabled={!peutAvancer} title={!peutAvancer ? 'Renseignez le prix du kWh' : undefined}>Continuer <ArrowRight size={16} /></button>}
          </div>
        </div>

        {etape < 4 && (
          <aside className="sol-lateral" aria-label="Aperçu en direct">
            <div className="sol-carte sol-carte-visuel">
              <h3>Aperçu en direct</h3>
              <SchemaToiture orientation={entree.orientation} inclinaisonDeg={entree.inclinaisonDeg} nombrePanneaux={resultat.nombrePanneaux} puissanceKwc={resultat.puissanceKwc} surfaceNecessaireM2={resultat.surfaceNecessaireM2} />
              <div className="sol-mini">
                <div><small>Production</small><strong>{kwh(resultat.productionAnnuelle)}</strong></div>
                <div><small>Économies / an</small><strong>{resultat.prixManquant ? '—' : euro(resultat.gainAnnuel)}</strong></div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
