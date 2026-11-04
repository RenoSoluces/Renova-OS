import { actionRequise } from '../mpr/suiviAnah'

const norm = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const memeMois = (iso: string | null | undefined, ref: Date) => {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export interface IndicateursInstallateur {
  prospectsANouveau: number
  devisEnAttente: number
  devisSignesMois: number
  caSigneMois: number
  dossiersActifs: number
  dossiersActionAnah: number
  dossiersSansEtape: number
}

/** Chiffres clés d'une entreprise installatrice, calculés sur les données visibles par l'utilisateur. */
export function indicateursInstallateur(
  prospects: { statut?: string | null }[],
  devis: { statut?: string | null; signature_statut?: string | null; signature_date?: string | null; montant_ttc?: number | null }[],
  dossiers: { statut?: string | null; parcours_etape?: string | null; mpr_statut?: string | null }[],
  ref = new Date(),
): IndicateursInstallateur {
  const signes = devis.filter(d => d.signature_statut === 'signe' && memeMois(d.signature_date, ref))
  const actifs = dossiers.filter(d => norm(d.statut) !== 'installe' && norm(d.statut) !== 'annule')
  return {
    prospectsANouveau: prospects.filter(p => !p.statut || norm(p.statut) === 'nouveau').length,
    devisEnAttente: devis.filter(d => d.statut === 'envoye' && d.signature_statut !== 'signe').length,
    devisSignesMois: signes.length,
    caSigneMois: Math.round(signes.reduce((s, d) => s + Number(d.montant_ttc || 0), 0) * 100) / 100,
    dossiersActifs: actifs.length,
    dossiersActionAnah: dossiers.filter(d => actionRequise(d.mpr_statut)).length,
    dossiersSansEtape: actifs.filter(d => !d.parcours_etape).length,
  }
}
