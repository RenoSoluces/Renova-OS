import { describe, expect, it } from 'vitest'
import { normaliser, rattacherFichier } from '../rattacherFiches'

const produits = [
  { id: '1', nom: 'Alfea Excellia S 12 kW triphasé, chauffage seul', marque: 'Alfea', reference: '520559' },
  { id: '2', nom: 'Aldes EasyHOME HYGRO Classic — kit CORD', marque: 'Aldes', reference: 'VMC-ALDES-EASYHOME-CLASSIC-CORD', caracteristiques: { reference_fabricant: '11033532' } },
  { id: '3', nom: 'Aldes EasyHOME HYGRO Classic — kit ELEC', marque: 'Aldes', reference: 'VMC-ALDES-EASYHOME-CLASSIC-KIT', caracteristiques: { reference_fabricant: '11033532' } },
  { id: '4', nom: 'Autre', marque: 'X', reference: 'ABC', caracteristiques: { reference_fabricant: 'à confirmer' } },
]

describe('rattachement des fiches fabricant', () => {
  it('normalise les noms de fichiers', () => expect(normaliser('Alfea-Excellia_S 12kW.PDF')).toBe('alfeaexcelliaS12kw'.toLowerCase()))
  it('référence exacte = sûr', () => {
    const r = rattacherFichier('520559.pdf', produits)
    expect(r.confiance).toBe('sur'); expect(r.produits.map(p => p.id)).toEqual(['1'])
  })
  it('une référence fabricant commune couvre toutes les variantes', () => {
    const r = rattacherFichier('11033532.pdf', produits)
    expect(r.confiance).toBe('sur'); expect(r.produits.map(p => p.id)).toEqual(['2', '3'])
  })
  it('référence contenue dans le nom = probable', () => {
    expect(rattacherFichier('Fiche_520559_Atlantic.pdf', produits).confiance).toBe('probable')
  })
  it('rapprochement par le nom', () => {
    const r = rattacherFichier('Alfea Excellia S 12kW.pdf', produits)
    expect(r.confiance).toBe('probable'); expect(r.produits[0].id).toBe('1')
  })
  it('ignore les références « à confirmer » et les noms trop courts', () => {
    expect(rattacherFichier('confirmer.pdf', produits).confiance).toBe('aucun')
    expect(rattacherFichier('ab.pdf', produits).confiance).toBe('aucun')
  })
})
