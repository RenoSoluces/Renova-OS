import { PARCOURS_CEE } from '../dossiers/parcoursCee'

export interface LigneRepartition { label: string; nb: number }

const ORDRE_ETATS = ['Nouveau', 'Qualifié', 'Visite planifiée', 'Visite faite', 'Dossier', 'Signé', 'Installation', 'Installé']

const norm = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Répartition des prospects par état, dans l'ordre du pipeline puis les états inconnus. */
export function compterParEtat(prospects: { statut?: string | null }[]): LigneRepartition[] {
  const par = new Map<string, LigneRepartition>()
  for (const p of prospects) {
    const brut = (p.statut || 'Nouveau').trim() || 'Nouveau'
    const connu = ORDRE_ETATS.find(e => norm(e) === norm(brut))
    const label = connu || brut
    const ligne = par.get(label) || { label, nb: 0 }
    ligne.nb++
    par.set(label, ligne)
  }
  const rang = (l: string) => { const i = ORDRE_ETATS.indexOf(l); return i === -1 ? ORDRE_ETATS.length : i }
  return [...par.values()].sort((a, b) => rang(a.label) - rang(b.label) || b.nb - a.nb)
}

/** Répartition des dossiers par étape du parcours (les dossiers sans étape sont comptés à part). */
export function compterParEtapeParcours(dossiers: { parcours_etape?: string | null }[]): LigneRepartition[] {
  const lignes: LigneRepartition[] = PARCOURS_CEE.map(e => ({ label: e.label, nb: dossiers.filter(d => d.parcours_etape === e.id).length }))
  const sansEtape = dossiers.filter(d => !PARCOURS_CEE.some(e => e.id === d.parcours_etape)).length
  return [...lignes, { label: 'Sans étape', nb: sansEtape }]
}

export interface PerformanceCollaborateur {
  id: string; nom: string; prospects: number; signes: number; dossiers: number; installes: number; tauxSignature: number
}

const ETATS_SIGNES = new Set(['signe', 'installation', 'installe'])

/** Performance par collaborateur : prospects attribués, signés, dossiers et installations. */
export function performanceParCollaborateur(
  prospects: { id: string; statut?: string | null; commercial_id?: string | null }[],
  dossiers: { prospect_id?: string | null; statut?: string | null }[],
  profils: { id: string; nom_complet?: string | null }[],
): PerformanceCollaborateur[] {
  const commercialDe = new Map(prospects.map(p => [p.id, p.commercial_id || null]))
  return profils
    .filter(pr => !/reno\s*soluces/i.test(pr.nom_complet || ''))
    .map(pr => {
      const siens = prospects.filter(p => p.commercial_id === pr.id)
      const signes = siens.filter(p => ETATS_SIGNES.has(norm(p.statut))).length
      const sesDossiers = dossiers.filter(d => d.prospect_id && commercialDe.get(d.prospect_id) === pr.id)
      return {
        id: pr.id, nom: pr.nom_complet || '—', prospects: siens.length, signes,
        dossiers: sesDossiers.length, installes: sesDossiers.filter(d => norm(d.statut) === 'installe').length,
        tauxSignature: siens.length ? Math.round((signes / siens.length) * 100) : 0,
      }
    })
    .filter(l => l.prospects > 0 || l.dossiers > 0)
    .sort((a, b) => b.signes - a.signes || b.dossiers - a.dossiers || b.prospects - a.prospects)
}
