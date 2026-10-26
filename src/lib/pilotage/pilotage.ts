/**
 * Pilotage de l'équipe commerciale : activité, transformation et chiffre d'affaires par commercial
 * sur une période, entonnoir global et points d'attention pour le manager.
 * Fonctions pures (testées) ; les données viennent de la base, filtrées par la RLS.
 */
export interface ProfilPilotage { id: string; nom_complet: string | null; role: string; objectif_mensuel?: number | null }
export interface ProspectPilotage { id: string; commercial_id: string | null; created_at: string; statut: string | null; temperature?: string | null; derniere_interaction_at?: string | null; prenom?: string | null; nom?: string | null }
export interface DevisPilotage { id: string; prospect_id: string | null; numero?: string | null; statut: string; created_at: string; signature_date?: string | null; montant_ht?: number | null; montant_ht_avant_remise?: number | null; remise_montant_ht?: number | null; niveau_rentabilite?: string | null; visite_id?: string | null }
export interface VisitePilotage { id: string; prospect_id: string | null; statut: string | null; date_visite?: string | null; created_at?: string | null }
export interface EvenementPilotage { id: string; user_id: string | null; type: string | null; date: string; source?: string | null }
export interface PortePilotage { commercial_id: string | null; resultat: string; cree_le: string }

export interface DonneesPilotage {
  profils: ProfilPilotage[]
  prospects: ProspectPilotage[]
  devis: DevisPilotage[]
  visites: VisitePilotage[]
  evenements: EvenementPilotage[]
  portes: PortePilotage[]
}

export interface LignePilotage {
  id: string
  nom: string
  portes: number
  contacts: number
  prospects: number
  rdv: number
  vt: number
  devisEmis: number
  devisSignes: number
  caSigneHT: number
  transformation: number | null
  panierMoyenHT: number | null
  remiseMoyennePct: number | null
  nonRentables: number
  objectifMensuel: number
}

export interface Alerte { type: 'devis_sans_reponse' | 'prospect_chaud_oublie' | 'vt_sans_devis' | 'devis_non_rentable'; titre: string; detail: string; commercialId: string | null; prospectId: string | null; age: number }

const jour = 86400000
const dans = (iso: string | null | undefined, debut: Date, fin: Date) => {
  if (!iso) return false
  const t = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).getTime()
  return t >= debut.getTime() && t < fin.getTime()
}

export function calculerPilotage(d: DonneesPilotage, debut: Date, fin: Date): { lignes: LignePilotage[]; total: LignePilotage; entonnoir: { etape: string; valeur: number }[] } {
  const commercialDe = new Map(d.prospects.map(p => [p.id, p.commercial_id]))
  const vendeurs = d.profils.filter(p => ['commercial', 'manager', 'admin'].includes(p.role))
  const vide = (id: string, nom: string, objectif = 0): LignePilotage => ({ id, nom, portes: 0, contacts: 0, prospects: 0, rdv: 0, vt: 0, devisEmis: 0, devisSignes: 0, caSigneHT: 0, transformation: null, panierMoyenHT: null, remiseMoyennePct: null, nonRentables: 0, objectifMensuel: objectif })
  const lignes = new Map<string, LignePilotage & { _remises: number[] }>()
  for (const v of vendeurs) lignes.set(v.id, { ...vide(v.id, v.nom_complet || 'Sans nom', Number(v.objectif_mensuel) || 0), _remises: [] })
  const ligne = (id: string | null | undefined) => (id ? lignes.get(id) : undefined)

  for (const p of d.portes) if (dans(p.cree_le, debut, fin)) {
    const l = ligne(p.commercial_id); if (!l) continue
    l.portes++; if (p.resultat !== 'absent') l.contacts++
  }
  for (const p of d.prospects) if (dans(p.created_at, debut, fin)) { const l = ligne(p.commercial_id); if (l) l.prospects++ }
  for (const e of d.evenements) if (e.source !== 'google' && ['rdv', 'visite'].includes(String(e.type || '').toLowerCase()) && dans(e.date, debut, fin)) { const l = ligne(e.user_id); if (l) l.rdv++ }
  for (const v of d.visites) if (v.statut === 'terminee' && dans(v.date_visite || v.created_at, debut, fin)) { const l = ligne(commercialDe.get(v.prospect_id || '')); if (l) l.vt++ }
  for (const dv of d.devis) {
    const l = ligne(commercialDe.get(dv.prospect_id || '')); if (!l) continue
    if (dans(dv.created_at, debut, fin)) {
      l.devisEmis++
      if (dv.niveau_rentabilite === 'non_rentable') l.nonRentables++
    }
    if (dv.statut === 'signe' && dans(dv.signature_date || dv.created_at, debut, fin)) {
      l.devisSignes++
      l.caSigneHT += Number(dv.montant_ht) || 0
      const avant = Number(dv.montant_ht_avant_remise) || 0
      if (avant > 0) l._remises.push(((Number(dv.remise_montant_ht) || 0) / avant) * 100)
    }
  }

  const finir = (l: LignePilotage & { _remises: number[] }): LignePilotage => {
    const { _remises, ...reste } = l
    return {
      ...reste,
      caSigneHT: Math.round(reste.caSigneHT * 100) / 100,
      transformation: reste.devisEmis ? Math.round((reste.devisSignes / reste.devisEmis) * 100) : null,
      panierMoyenHT: reste.devisSignes ? Math.round(reste.caSigneHT / reste.devisSignes) : null,
      remiseMoyennePct: _remises.length ? Math.round((_remises.reduce((s, x) => s + x, 0) / _remises.length) * 10) / 10 : null,
    }
  }
  const resultat = [...lignes.values()].map(finir)
    .filter(l => l.portes || l.prospects || l.rdv || l.vt || l.devisEmis || l.devisSignes || l.objectifMensuel)
    .sort((a, b) => b.caSigneHT - a.caSigneHT || b.devisSignes - a.devisSignes || b.rdv - a.rdv)

  const total = resultat.reduce<LignePilotage & { _remises: number[] }>((t, l) => {
    t.portes += l.portes; t.contacts += l.contacts; t.prospects += l.prospects; t.rdv += l.rdv; t.vt += l.vt
    t.devisEmis += l.devisEmis; t.devisSignes += l.devisSignes; t.caSigneHT += l.caSigneHT; t.nonRentables += l.nonRentables; t.objectifMensuel += l.objectifMensuel
    if (l.remiseMoyennePct != null) for (let i = 0; i < l.devisSignes; i++) t._remises.push(l.remiseMoyennePct)
    return t
  }, { ...vide('total', 'Équipe'), _remises: [] })

  const totalFini = finir(total)
  return {
    lignes: resultat,
    total: totalFini,
    entonnoir: [
      { etape: 'Portes frappées', valeur: totalFini.portes },
      { etape: 'Nouveaux prospects', valeur: totalFini.prospects },
      { etape: 'Rendez-vous', valeur: totalFini.rdv },
      { etape: 'Visites techniques', valeur: totalFini.vt },
      { etape: 'Devis émis', valeur: totalFini.devisEmis },
      { etape: 'Devis signés', valeur: totalFini.devisSignes },
    ],
  }
}

/** Points d'attention : ce qui risque de se perdre si personne ne s'en occupe. */
export function alertesPilotage(d: DonneesPilotage, maintenant = new Date()): Alerte[] {
  const prospects = new Map(d.prospects.map(p => [p.id, p]))
  const nom = (id: string | null | undefined) => { const p = id ? prospects.get(id) : undefined; return p ? `${p.prenom || ''} ${p.nom || ''}`.trim() || 'Client' : 'Client' }
  const age = (iso: string | null | undefined) => (iso ? Math.floor((maintenant.getTime() - new Date(iso).getTime()) / jour) : 0)
  const alertes: Alerte[] = []

  for (const dv of d.devis) {
    const p = dv.prospect_id ? prospects.get(dv.prospect_id) : undefined
    if (dv.statut === 'envoye' && age(dv.created_at) >= 7) {
      alertes.push({ type: 'devis_sans_reponse', titre: `Devis ${dv.numero || ''} sans réponse`.trim(), detail: `${nom(dv.prospect_id)} · envoyé il y a ${age(dv.created_at)} j · ${Math.round(Number(dv.montant_ht) || 0).toLocaleString('fr-FR')} € HT`, commercialId: p?.commercial_id ?? null, prospectId: dv.prospect_id, age: age(dv.created_at) })
    }
    if (dv.niveau_rentabilite === 'non_rentable' && dv.statut !== 'refuse' && dv.statut !== 'annule') {
      alertes.push({ type: 'devis_non_rentable', titre: `Devis ${dv.numero || ''} sous le prix plancher`.trim(), detail: `${nom(dv.prospect_id)} · ${dv.statut === 'signe' ? 'signé' : 'en cours'}`, commercialId: p?.commercial_id ?? null, prospectId: dv.prospect_id, age: age(dv.created_at) })
    }
  }

  const fermes = new Set(['signé', 'signe', 'installé', 'installe', 'perdu', 'refusé', 'refuse', 'installation'])
  for (const p of d.prospects) {
    if (p.temperature !== 'chaud' || fermes.has(String(p.statut || '').toLowerCase())) continue
    const a = age(p.derniere_interaction_at || p.created_at)
    if (a >= 7) alertes.push({ type: 'prospect_chaud_oublie', titre: `${nom(p.id)} : prospect chaud sans contact`, detail: `Dernier échange il y a ${a} j`, commercialId: p.commercial_id, prospectId: p.id, age: a })
  }

  const avecDevis = new Set(d.devis.map(x => x.prospect_id).filter(Boolean))
  for (const v of d.visites) {
    if (v.statut !== 'terminee' || !v.prospect_id || avecDevis.has(v.prospect_id)) continue
    const a = age(v.date_visite || v.created_at)
    if (a >= 3 && a <= 60) alertes.push({ type: 'vt_sans_devis', titre: `${nom(v.prospect_id)} : VT faite, pas de devis`, detail: `Visite il y a ${a} j`, commercialId: prospects.get(v.prospect_id)?.commercial_id ?? null, prospectId: v.prospect_id, age: a })
  }

  const priorite: Record<Alerte['type'], number> = { devis_non_rentable: 0, devis_sans_reponse: 1, vt_sans_devis: 2, prospect_chaud_oublie: 3 }
  return alertes.sort((a, b) => priorite[a.type] - priorite[b.type] || b.age - a.age)
}

export type Periode = 'semaine' | 'mois' | 'mois_precedent' | 'trimestre'
export function bornesPeriode(p: Periode, ref = new Date()): { debut: Date; fin: Date; libelle: string } {
  const y = ref.getFullYear(), m = ref.getMonth()
  if (p === 'semaine') {
    const debut = new Date(y, m, ref.getDate() - ((ref.getDay() + 6) % 7))
    return { debut, fin: new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + 7), libelle: 'Cette semaine' }
  }
  if (p === 'mois_precedent') return { debut: new Date(y, m - 1, 1), fin: new Date(y, m, 1), libelle: new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }
  if (p === 'trimestre') { const q = Math.floor(m / 3) * 3; return { debut: new Date(y, q, 1), fin: new Date(y, q + 3, 1), libelle: `T${q / 3 + 1} ${y}` } }
  return { debut: new Date(y, m, 1), fin: new Date(y, m + 1, 1), libelle: new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }
}
