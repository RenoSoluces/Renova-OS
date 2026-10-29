import { describe, expect, it } from 'vitest'
import fixture from './rapportVtSmart.fixture.json'
import { structurerChamps, champsEnTexte, type ItemPdf } from '../champsPdf'
import { parseVT174, anneeDepuisTexte } from '../parseVT174'
import { construireBatiment3CL } from '../../../3cl/batiment3CL'
import { calculDPE } from '../../../3cl/calculDPE'

// Positions des textes d'un vrai rapport « VT TH174 / 175 SMART » (26 pages), noms et adresse anonymisés.
const pages: ItemPdf[][] = (fixture as [string, number, number, number, number][][])
  .map(p => p.map(([s, x, y, w, size]) => ({ s, x, y, w, size })))

describe('import d’un rapport VT TH174 / 175 SMART', () => {
  const champs = structurerChamps(pages)
  const res = parseVT174(champs, champsEnTexte(champs))
  const a = res.audit_data

  it('associe chaque question à sa réponse', () => {
    const val = (label: string) => champs.find(c => c.label.startsWith(label) && c.value)?.value
    expect(val('Nom du propriétaire')).toBe('DUPONT')
    expect(val('Superficie habitable')).toBe('90')
    expect(val('Types de planchers bas ?')).toBe('Terre-plein')
    expect(val('Type planchers hauts ?')).toBe('Combles perdus')
    expect(val("Type d'énergie utilisée")).toBe('Bois')
  })

  it('reprend toutes les sections de la visite', () => {
    expect(res.success).toBe(true)
    expect(res.format_detecte).toBe(true)
    expect(a.identification?.adresse).toBe('1 rue de l’Exemple')
    expect(a.identification?.code_postal).toBe('66000')
    expect(a.donnees_batiment?.surface_habitable).toBe(90)
    expect(a.donnees_batiment?.annee_construction).toBe(1947)
    expect(a.murs).toHaveLength(14)
    expect(a.murs?.[0]).toMatchObject({ orientation: 'E', composition: 'agglomeres', epaisseur_cm: 23, isole: 'non' })
    expect((a.murs?.[0].longueur_m ?? 0) * (a.murs?.[0].hauteur_m ?? 0)).toBeCloseTo(14)
    expect(a.menuiseries?.filter(m => m.type_menuiserie === 'porte_fenetre')).toHaveLength(2)
    expect(a.menuiseries?.filter(m => m.type_menuiserie === 'porte')).toHaveLength(1)
    expect(a.planchers?.[0]).toMatchObject({ type: 'Terre-plein', surface_m2: 49 })
    expect(a.plafonds?.[0]).toMatchObject({ type: 'Combles perdus', surface_m2: 49, isolation: 'Non' })
    expect(a.chauffage).toMatchObject({ systeme_principal: 'Poêle à bois', energie: 'Bois' })
    expect(a.ecs).toMatchObject({ systeme: 'Ballon électrique', capacite_l: 200 })
    expect(a.ventilation?.type).toBe('Aucune')
    expect(a.completed_sections).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('permet de calculer la note du logement', () => {
    const dpe = calculDPE(construireBatiment3CL(a))
    expect(dpe.etiquette).toMatch(/^[A-G]$/)
    expect(dpe.consommationM2).toBeGreaterThan(150)
  })

  it('refuse un PDF qui n’est pas un rapport de visite', () => {
    const autre = parseVT174([{ page: 1, label: 'Facture', value: '120 €' }], 'Facture 120 €')
    expect(autre.success).toBe(false)
  })

  it('interprète les années de construction', () => {
    expect(anneeDepuisTexte('Avant 1948')).toBe(1947)
    expect(anneeDepuisTexte('1949 - 1974')).toBe(1962)
    expect(anneeDepuisTexte('2005')).toBe(2005)
  })
})
