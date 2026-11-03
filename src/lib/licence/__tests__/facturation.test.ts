import { describe, expect, it } from 'vitest'
import { calculerFacture, economieAnnuelle, montantAnnuelHt, numeroFacture } from '../facturation'

const base = { nb_licences: 1, prix_ht_mensuel: 39, formule: 'mensuel' as const, remise_annuelle_pct: 15 }

describe('facturation des licences', () => {
  it('mensuel : prix × licences, TVA 20 %', () => {
    const f = calculerFacture({ ...base, nb_licences: 3 }, null, '2026-11-10')
    expect(f.montant_ht).toBe(117)
    expect(f.montant_ttc).toBe(140.4)
    expect(f.debut).toBe('2026-11-10')
    expect(f.fin).toBe('2026-12-09')
  })
  it('annuel : 12 mois moins la remise', () => {
    expect(montantAnnuelHt({ ...base, formule: 'annuel' })).toBe(397.8)
    expect(economieAnnuelle(base)).toBe(70.2)
  })
  it('la période suivante commence le lendemain de la précédente', () => {
    const f = calculerFacture({ ...base, formule: 'annuel' }, '2027-11-09', null)
    expect(f.debut).toBe('2027-11-10')
    expect(f.fin).toBe('2028-11-09')
  })
  it('numérotation', () => { expect(numeroFacture(2026, 7)).toBe('LIC-2026-0007') })
})
