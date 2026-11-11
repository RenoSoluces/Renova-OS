import { zoneClimatiqueDepuisCodePostal } from '../3cl/database/departementsZones'

/**
 * Prime CEE isolation des combles perdus (BAR-EN-101), en € par m² isolé.
 * Grille communiquée par Reno Soluces le 11/11/2026 : elle dépend de la zone
 * climatique (H1, H2, H3) et du profil de revenus (Bleu ou autres profils).
 */
export type ZoneCee = 'H1' | 'H2' | 'H3'

export const PRIME_COMBLES_PERDUS_EUR_M2: Record<ZoneCee, { bleu: number; autres: number }> = {
  H1: { bleu: 19.34, autres: 13.26 },
  H2: { bleu: 16.8, autres: 10.92 },
  H3: { bleu: 10.8, autres: 7.02 },
}

/** Zone CEE du chantier : la zone saisie sur le devis prime, sinon celle du code postal. */
export function zoneCee(zoneSaisie: string | null | undefined, codePostal: string | null | undefined): ZoneCee | null {
  const saisie = String(zoneSaisie || '').trim().toUpperCase().slice(0, 2)
  if (saisie === 'H1' || saisie === 'H2' || saisie === 'H3') return saisie
  if (!codePostal || !/^\d{5}$/.test(codePostal.trim())) return null
  const deduite = zoneClimatiqueDepuisCodePostal(codePostal.trim()).toUpperCase().slice(0, 2)
  return deduite === 'H1' || deduite === 'H2' || deduite === 'H3' ? deduite : null
}

export function tauxPrimeComblesPerdus(zone: ZoneCee, profilBleu: boolean): number {
  const grille = PRIME_COMBLES_PERDUS_EUR_M2[zone]
  return profilBleu ? grille.bleu : grille.autres
}
