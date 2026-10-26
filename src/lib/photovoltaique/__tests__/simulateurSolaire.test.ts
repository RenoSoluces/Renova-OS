import { describe, expect, it } from 'vitest'
import { ENTREE_PAR_DEFAUT, optionsPuissance, simulerSolaire } from '../simulateurSolaire'

const base = { ...ENTREE_PAR_DEFAUT, codePostal: '69003', prixKwh: 0.2016, consommationAnnuelleKwh: 6000 }

describe('simulateur solaire', () => {
  it('donne des ordres de grandeur réalistes', () => {
    const r = simulerSolaire({ ...base, puissanceKwc: 4.5 })
    console.log('4,5 kWc', r.productionAnnuelle, Math.round(r.tauxAutoconsommation * 100), r.gainAnnuel, r.delaiRetourAnnees)
    expect(r.productionAnnuelle).toBeGreaterThan(4000)
    expect(r.tauxAutoconsommation).toBeGreaterThan(0.35)
    expect(r.tauxAutoconsommation).toBeLessThan(0.9)
  })
  it('l’autoconsommation baisse quand la puissance augmente, la batterie l’augmente', () => {
    const petit = simulerSolaire({ ...base, puissanceKwc: 3 })
    const grand = simulerSolaire({ ...base, puissanceKwc: 9 })
    const batt = simulerSolaire({ ...base, puissanceKwc: 9, batterie: true })
    expect(petit.tauxAutoconsommation).toBeGreaterThan(grand.tauxAutoconsommation)
    expect(batt.energieAutoconsommee).toBeGreaterThan(grand.energieAutoconsommee)
  })
  it('utilise la production PVGIS quand elle est fournie', () => {
    const pvgis = [50, 70, 105, 130, 145, 150, 160, 145, 115, 85, 55, 45]
    const r = simulerSolaire({ ...base, puissanceKwc: 6, pvgisMensuelParKwc: pvgis })
    expect(r.sourcePvgis).toBe(true)
    expect(r.productionAnnuelle).toBe(pvgis.reduce((a, b) => a + b, 0) * 6)
  })
  it('calcule la mensualité et propose trois dimensionnements', () => {
    const r = simulerSolaire({ ...base, puissanceKwc: 6, prixInstallationTtc: 12000, financementMois: 120, financementTaux: 4 })
    expect(r.mensualite).toBe(121)
    const o = optionsPuissance(base)
    console.log(o.map(x => `${x.libelle} ${x.puissanceKwc} ${x.batterie} ${x.resultat.delaiRetourAnnees} ${x.resultat.gain20Ans - x.resultat.investissement}`))
    expect(o.length).toBeGreaterThanOrEqual(2)
  })
})
