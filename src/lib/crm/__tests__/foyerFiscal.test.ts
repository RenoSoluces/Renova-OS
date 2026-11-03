import { describe, it, expect } from 'vitest'
import { agregerAvis, departementDepuisCodePostal, numeroFiscalValide, referenceAvisValide, syntheseFoyer, precariteDepuisProfil, nouvelAvis } from '../foyerFiscal'
import { determinerProfilMPR } from '../../aides/baremeMaPrimeRenov'

describe('avis d\'imposition', () => {
  it('additionne les revenus et les personnes de tous les avis', () => {
    const r = agregerAvis([
      { ...nouvelAvis(), rfr: '18 000', nb_personnes: 2 },
      { ...nouvelAvis(), rfr: 7500.4, nb_personnes: 1 },
      nouvelAvis(),
    ])
    expect(r).toEqual({ nbAvis: 2, rfrGlobal: 25500, nbPersonnes: 3 })
  })
  it('sans avis : 0 € et 1 personne', () => {
    expect(agregerAvis([])).toEqual({ nbAvis: 0, rfrGlobal: 0, nbPersonnes: 1 })
  })
  it('valide numéro fiscal et référence de l\'avis (13 caractères)', () => {
    expect(numeroFiscalValide('1234567890123')).toBe(true)
    expect(numeroFiscalValide('12 345 678 901 23')).toBe(true)
    expect(numeroFiscalValide('12345')).toBe(false)
    expect(referenceAvisValide('26AB123456789')).toBe(true)
    expect(referenceAvisValide('26AB12')).toBe(false)
  })
})

describe('département et zone', () => {
  it('déduit le département du code postal', () => {
    expect(departementDepuisCodePostal('11160')).toBe('11')
    expect(departementDepuisCodePostal('20000')).toBe('2A')
    expect(departementDepuisCodePostal('20200')).toBe('2B')
    expect(departementDepuisCodePostal('97400')).toBe('974')
    expect(departementDepuisCodePostal('abc')).toBe('')
  })
})

describe('synthèse du foyer', () => {
  it('Aude, 2 personnes, 30 000 € → jaune, précarité', () => {
    const s = syntheseFoyer(30000, 2, '11160')
    expect(s).toMatchObject({ departement: '11', zone: 'Hors Île-de-France', profil: 'jaune', couleur: 'Modeste', precarite: 'Précarité' })
  })
  it('Paris, 1 personne, 24 000 € → bleu, grande précarité', () => {
    expect(syntheseFoyer(24000, 1, '75011')).toMatchObject({ zone: 'Île-de-France', profil: 'bleu', precarite: 'Grande précarité' })
  })
  it('sans revenu : département et zone seulement', () => {
    expect(syntheseFoyer(0, 1, '11160')).toMatchObject({ departement: '11', profil: null, precarite: null })
    expect(precariteDepuisProfil('rose')).toBe('Classique')
  })
})

describe('plafonds MaPrimeRénov\' 2026 Île-de-France', () => {
  it('respecte les seuils officiels (inclus) pour 2 et 4 personnes', () => {
    expect(determinerProfilMPR(35270, 2, true)).toBe('bleu')
    expect(determinerProfilMPR(35271, 2, true)).toBe('jaune')
    expect(determinerProfilMPR(84562, 4, true)).toBe('violet')
    expect(determinerProfilMPR(84563, 4, true)).toBe('rose')
  })
  it('applique la majoration par personne au-delà de 5 (6 personnes IdF)', () => {
    expect(determinerProfilMPR(56580 + 7116, 6, true)).toBe('bleu')
    expect(determinerProfilMPR(56580 + 7117, 6, true)).toBe('jaune')
    expect(determinerProfilMPR(96817 + 12257, 6, true)).toBe('violet')
  })
})
