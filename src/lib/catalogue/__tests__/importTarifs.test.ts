import { describe, expect, it } from 'vitest'
import { detecterColonnes, lignesDepuisFeuille, lignesDepuisTexte, lireNombre, rapprocher } from '../importTarifs'

const produits = [
  { id: 'a', nom: 'Pompe à chaleur Alféa Extensa 8', marque: 'Atlantic', reference: '526308', categorie: 'pac' },
  { id: 'b', nom: 'Ballon thermodynamique 200 L', marque: 'Thermor', reference: 'AÉROMAX-5 200', categorie: 'ballon' },
  { id: 'c', nom: 'Isolant laine de verre', marque: 'Isover', reference: '', categorie: 'iso' },
]

describe('import des tarifs fournisseurs', () => {
  it('lit les montants au format français et anglais', () => {
    expect(lireNombre('1 234,50 €')).toBe(1234.5)
    expect(lireNombre('1.234,50')).toBe(1234.5)
    expect(lireNombre('1,234.50')).toBe(1234.5)
    expect(lireNombre('89,9 HT')).toBe(89.9)
    expect(lireNombre(42)).toBe(42)
    expect(lireNombre('—')).toBe(0)
  })

  it('repère les colonnes et préfère le prix net au prix public', () => {
    expect(detecterColonnes(['Code article', 'Désignation', 'Prix public HT', 'Prix net HT'])).toEqual({ reference: 0, designation: 1, prix: 3 })
    expect(detecterColonnes(['Libellé', 'Réf.', 'Tarif'])).toEqual({ reference: 1, designation: 0, prix: 2 })
  })

  it('trouve la ligne d’en-têtes sous un bandeau et ignore les lignes vides', () => {
    const { lignes } = lignesDepuisFeuille([['Tarif 2026 — Atlantic'], [], ['Référence', 'Désignation', 'Prix net'], ['526308', 'Alféa Extensa 8', '3 120,00'], ['', '', ''], ['X1', 'Sans prix', '']])
    expect(lignes).toEqual([{ reference: '526308', designation: 'Alféa Extensa 8', prix: 3120 }])
  })

  it('rapproche par référence (insensible aux espaces, tirets, accents) puis par désignation', () => {
    const r = rapprocher([
      { reference: 'aeromax5-200', designation: '', prix: 900 },
      { reference: '', designation: 'Isover Isolant laine de verre', prix: 12 },
      { reference: 'INCONNU', designation: 'Autre', prix: 5 },
    ], produits, new Map([['b', 1000]]))
    expect(r.map(x => [x.produit?.id ?? null, x.methode])).toEqual([['b', 'reference'], ['c', 'designation'], [null, null]])
    expect(r[0].ecartPct).toBeCloseTo(-10)
    expect(r[1].ecartPct).toBeNull()
  })

  it('n’associe pas deux lignes au même produit', () => {
    const r = rapprocher([{ reference: '526308', designation: '', prix: 1 }, { reference: '526 308', designation: '', prix: 2 }], produits, new Map())
    expect(r.filter(x => x.produit).length).toBe(1)
  })

  it('extrait référence et prix d’un texte copié depuis un PDF', () => {
    const t = 'Atlantic 526308 Alféa Extensa 8 kW   3 120,00 €\nPage 2\nThermor AEROMAX 5 200 L  Ballon   845,50'
    expect(lignesDepuisTexte(t, produits)).toEqual([
      { reference: '526308', designation: 'Atlantic 526308 Alféa Extensa 8 kW   3 120,00 €', prix: 3120 },
      { reference: 'AÉROMAX-5 200', designation: 'Thermor AEROMAX 5 200 L  Ballon   845,50', prix: 845.5 },
    ])
  })
})
