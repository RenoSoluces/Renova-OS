import { describe, expect, it } from 'vitest'
import { analyserRentabilite, descriptionConsommables, totalConsommables } from '../rentabilite'

const produits = { pac: { prix_plancher_ht: 8050, prix_conseille_ht: 9450 } }
const lignes = [
  { produit_id: 'pac', quantite: 1, prix_unitaire_ht: 9450, designation: 'PAC' },
  { produit_id: null, quantite: 1, prix_unitaire_ht: 2200, designation: 'Pose' },
  { produit_id: null, quantite: 1, prix_unitaire_ht: 650, designation: 'Consommables' },
]

describe('analyserRentabilite', () => {
  it('rentable au prix conseillé, avec la remise maximale restante', () => {
    const r = analyserRentabilite(lignes, produits, 12300)
    expect(r.niveau).toBe('ok')
    expect(r.plancherHT).toBe(10900)
    expect(r.remiseMaxRestanteHT).toBe(1400)
  })
  it('sous le prix conseillé mais au-dessus du plancher', () => {
    expect(analyserRentabilite(lignes, produits, 11500).niveau).toBe('sous_conseille')
  })
  it('non rentable quand la remise dépasse la marge disponible', () => {
    const r = analyserRentabilite(lignes, produits, 10500)
    expect(r.niveau).toBe('non_rentable')
    expect(r.ecartPlancherHT).toBe(400)
    expect(r.remiseMaxRestanteHT).toBe(0)
  })
  it('signale une ligne de produit vendue sous son plancher', () => {
    const r = analyserRentabilite([{ ...lignes[0], prix_unitaire_ht: 7000 }], produits, 7000)
    expect(r.lignesSousPlancher).toHaveLength(1)
    expect(r.niveau).toBe('non_rentable')
  })
  it('ne conclut rien sans plancher connu', () => {
    const r = analyserRentabilite([lignes[1]], produits, 100)
    expect(r.analysable).toBe(false)
    expect(r.niveau).toBe('ok')
  })
})

describe('consommables', () => {
  it('additionne et décrit le détail', () => {
    const d = [{ libelle: 'Liaison', quantite: 2, unite: 'ml', prix_ht: 15 }, { libelle: 'Support', prix_ht: 50 }]
    expect(totalConsommables(d)).toBe(80)
    expect(descriptionConsommables(d)).toBe('Comprend : Liaison (2 ml) ; Support.')
  })
})
