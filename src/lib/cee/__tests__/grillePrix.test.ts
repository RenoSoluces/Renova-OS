import { describe, it, expect } from 'vitest'
import { ligneApplicable, primeCee, prixNet, precariteDepuisCategorieMpr, type LignePrix } from '../grillePrix'

const ligne = (p: Partial<LignePrix>): LignePrix => ({
  id: 'x', delegataire_id: 'd1', fiche_reference: null, precarite: null, prix_eur_par_mwh_cumac: 6,
  bonification_pct: 0, date_debut: null, date_fin: null, actif: true, ...p,
})

describe('ligneApplicable', () => {
  it('ignore un autre délégataire, une ligne inactive et une période hors dates', () => {
    const g = [ligne({ id: 'a', delegataire_id: 'd2' }), ligne({ id: 'b', actif: false }), ligne({ id: 'c', date_fin: '2026-01-31' }), ligne({ id: 'd', date_debut: '2026-12-01' })]
    expect(ligneApplicable(g, { delegataireId: 'd1', date: '2026-11-03' })).toBeNull()
  })
  it('préfère la fiche précise puis la précarité précise', () => {
    const g = [
      ligne({ id: 'toutes', prix_eur_par_mwh_cumac: 5 }),
      ligne({ id: 'precarite', precarite: 'precarite', prix_eur_par_mwh_cumac: 6 }),
      ligne({ id: 'fiche', fiche_reference: 'BAR-TH-171', prix_eur_par_mwh_cumac: 7 }),
      ligne({ id: 'fiche-precarite', fiche_reference: 'BAR-TH-171', precarite: 'precarite', prix_eur_par_mwh_cumac: 8 }),
    ]
    expect(ligneApplicable(g, { delegataireId: 'd1', fiche: 'bar-th-171', precarite: 'precarite', date: '2026-11-03' })?.id).toBe('fiche-precarite')
    expect(ligneApplicable(g, { delegataireId: 'd1', fiche: 'BAR TH 171', precarite: 'classique', date: '2026-11-03' })?.id).toBe('fiche')
    expect(ligneApplicable(g, { delegataireId: 'd1', fiche: 'BAR-EN-101', precarite: 'precarite', date: '2026-11-03' })?.id).toBe('precarite')
    expect(ligneApplicable(g, { delegataireId: 'd1', fiche: 'BAR-EN-101', precarite: 'classique', date: '2026-11-03' })?.id).toBe('toutes')
  })
  it('à spécificité égale, prend la période la plus récente', () => {
    const g = [ligne({ id: 'ancienne', date_debut: '2026-01-01', prix_eur_par_mwh_cumac: 5 }), ligne({ id: 'recente', date_debut: '2026-09-01', prix_eur_par_mwh_cumac: 7 })]
    expect(ligneApplicable(g, { delegataireId: 'd1', date: '2026-11-03' })?.id).toBe('recente')
    expect(ligneApplicable(g, { delegataireId: 'd1', date: '2026-05-10' })?.id).toBe('ancienne')
  })
})

describe('prime CEE', () => {
  it('multiplie les MWh cumac par le prix net bonification comprise', () => {
    const l = ligne({ prix_eur_par_mwh_cumac: 6.5, bonification_pct: 20 })
    expect(prixNet(l)).toBe(7.8)
    expect(primeCee(100, l)).toBe(780)
    expect(primeCee(33.331, ligne({ prix_eur_par_mwh_cumac: 6 }))).toBe(199.99)
  })
  it('vaut 0 sans prix ou sans MWh cumac', () => {
    expect(primeCee(100, null)).toBe(0)
    expect(primeCee(0, ligne({}))).toBe(0)
  })
  it('convertit la catégorie MaPrimeRénov\' en précarité', () => {
    expect(precariteDepuisCategorieMpr('TresModeste')).toBe('grande_precarite')
    expect(precariteDepuisCategorieMpr('Modeste')).toBe('precarite')
    expect(precariteDepuisCategorieMpr('Aisee')).toBe('classique')
    expect(precariteDepuisCategorieMpr(null)).toBeNull()
  })
})
