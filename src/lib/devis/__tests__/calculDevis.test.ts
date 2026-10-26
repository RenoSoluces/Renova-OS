import { describe, expect, it } from 'vitest'
import { calculMontantLigneHT, calculResteACharge, calculTotauxDevis } from '../calculDevis'

describe('calculMontantLigneHT', () => {
  it('multiplie quantité et prix, arrondi au centime', () => {
    expect(calculMontantLigneHT({ quantite: 3, prix_unitaire_ht: 10.333, tva_taux: 5.5 })).toBe(31)
    expect(calculMontantLigneHT({ quantite: 92.5, prix_unitaire_ht: 21.4, tva_taux: 5.5 })).toBe(1979.5)
  })
})

describe('calculTotauxDevis', () => {
  const lignes = [
    { quantite: 1, prix_unitaire_ht: 10000, tva_taux: 5.5 },  // PAC
    { quantite: 1, prix_unitaire_ht: 1000, tva_taux: 20 },    // accessoire
  ]

  it('additionne HT, TVA par taux et TTC sans remise', () => {
    const t = calculTotauxDevis(lignes)
    expect(t.montantHTAvantRemise).toBe(11000)
    expect(t.montantHT).toBe(11000)
    expect(t.montantTVA).toBe(750) // 550 + 200
    expect(t.montantTTC).toBe(11750)
    expect(t.remiseHT).toBe(0)
  })

  it('répartit une remise en montant au prorata sur la TVA', () => {
    const t = calculTotauxDevis(lignes, 1100, 'montant') // 10 %
    expect(t.remiseHT).toBe(1100)
    expect(t.montantHT).toBe(9900)
    expect(t.montantTVA).toBe(675)
    expect(t.montantTTC).toBe(10575)
  })

  it('applique une remise en pourcentage, bornée à 100 %', () => {
    expect(calculTotauxDevis(lignes, 10, 'pourcentage').montantHT).toBe(9900)
    const t = calculTotauxDevis(lignes, 150, 'pourcentage')
    expect(t.montantHT).toBe(0)
    expect(t.montantTTC).toBe(0)
  })

  it('ne laisse jamais une remise dépasser le total ni devenir négative', () => {
    expect(calculTotauxDevis(lignes, 50000, 'montant').montantHT).toBe(0)
    expect(calculTotauxDevis(lignes, -200, 'montant').montantHT).toBe(11000)
  })

  it('renvoie des zéros pour un devis vide', () => {
    expect(calculTotauxDevis([])).toEqual({ montantHTAvantRemise: 0, montantHT: 0, montantTVA: 0, montantTTC: 0, remiseHT: 0 })
  })
})

describe('calculResteACharge', () => {
  it('déduit les aides du TTC sans descendre sous zéro', () => {
    expect(calculResteACharge(11750, [{ montant: 4000 }, { montant: 2500.5 }])).toBe(5249.5)
    expect(calculResteACharge(1000, [{ montant: 4000 }])).toBe(0)
  })
})
