import { describe, expect, it } from 'vitest'
import {
  categorieRevenusDepuisLabel, estHorsChampBarEn104, extraireFiche, ficheDuProduit, mprParGestePossible,
  valeursFiche, valeursLigne, verifierFiche,
} from '../conformite'

const blocs = (fiche: string, v: Record<string, string>, surLigne = false) =>
  verifierFiche(fiche, v, surLigne).filter(p => p.gravite === 'bloc').map(p => p.champ)

describe('identification de la fiche CEE', () => {
  it('extrait le code d’un libellé libre', () => {
    expect(extraireFiche('CEE bar-th-129 (PAC)')).toBe('BAR-TH-129')
    expect(extraireFiche('à vérifier')).toBeNull()
  })

  it('se rabat sur la catégorie pour un produit éligible sans fiche', () => {
    expect(ficheDuProduit({ id: '1', nom: 'PAC', categorie: 'pac_air_eau', eligible_cee: true })).toBe('BAR-TH-171')
    expect(ficheDuProduit({ id: '1', nom: 'PAC', categorie: 'pac_air_eau', eligible_cee: false })).toBeNull()
  })

  it('exclut portes d’entrée et volets roulants de BAR-EN-104, pas les portes-fenêtres', () => {
    expect(estHorsChampBarEn104({ id: '1', nom: 'Porte d entree alu', categorie: 'menuiseries_portes' })).toBe(true)
    expect(estHorsChampBarEn104({ id: '1', nom: 'Volet roulant isolant', categorie: 'menuiseries' })).toBe(true)
    expect(estHorsChampBarEn104({ id: '1', nom: 'Porte-fenêtre 2 vantaux', categorie: 'menuiseries_portes' })).toBe(false)
    expect(ficheDuProduit({ id: '1', nom: 'Volet roulant', categorie: 'menuiseries', eligible_cee: true, fiche_cee: 'BAR-EN-104' })).toBeNull()
  })
})

describe('BAR-TH-171 — PAC air/eau', () => {
  const ok = { usage: 'Chauffage seul', temp: 'Basse température', etas: '140', regulateur: 'VI' }
  it('accepte une PAC basse température avec ηs ≥ 126 % et régulateur ≥ IV', () => {
    expect(blocs('BAR-TH-171', ok)).toEqual([])
  })
  it('exige 126 % en basse température et 111 % en moyenne/haute', () => {
    expect(blocs('BAR-TH-171', { ...ok, etas: '120' })).toContain('etas')
    expect(blocs('BAR-TH-171', { ...ok, temp: 'Moyenne ou haute température', etas: '120' })).toEqual([])
  })
  it('refuse un régulateur de classe I à III', () => {
    expect(blocs('BAR-TH-171', { ...ok, regulateur: 'III' })).toContain('regulateur')
    expect(blocs('BAR-TH-171', { ...ok, regulateur: 'classe VII (à confirmer)' })).toEqual([])
  })
  it('sur une ligne de devis, exige la note de dimensionnement', () => {
    expect(blocs('BAR-TH-171', ok, true)).toContain('note')
    expect(blocs('BAR-TH-171', { ...ok, note: 'oui' }, true)).toEqual([])
  })
})

describe('BAR-TH-148 — chauffe-eau thermodynamique', () => {
  it('applique le seuil d’efficacité du profil de soutirage', () => {
    expect(blocs('BAR-TH-148', { profil: 'M', efficacite: '95' })).toEqual([])
    expect(blocs('BAR-TH-148', { profil: 'L', efficacite: '99' })).toContain('efficacite')
    expect(blocs('BAR-TH-148', { profil: 'XL', efficacite: '110' })).toEqual([])
    expect(blocs('BAR-TH-148', { profil: 'XXL', efficacite: '150' })).toContain('profil')
  })
})

describe('BAR-TH-129 — PAC air/air', () => {
  it('limite la puissance à 12 kW et exige un SCOP ≥ 3,9', () => {
    expect(blocs('BAR-TH-129', { puissance: '5', scop: '4,6' })).toEqual([])
    expect(blocs('BAR-TH-129', { puissance: '14', scop: '4,6' })).toContain('puissance')
    expect(blocs('BAR-TH-129', { puissance: '5', scop: '3.8' })).toContain('scop')
  })
})

describe('Isolation', () => {
  it('BAR-EN-101 : R ≥ 7 en combles perdus, ≥ 6 en rampants', () => {
    expect(blocs('BAR-EN-101', { zone: 'Comble perdu', r: '7' })).toEqual([])
    expect(blocs('BAR-EN-101', { zone: 'Comble perdu', r: '6,5' })).toContain('r')
    expect(blocs('BAR-EN-101', { zone: 'Rampant de toiture', r: '6' })).toEqual([])
  })
  it('déduit la partie isolée de la catégorie et R de la description', () => {
    const v = valeursLigne('BAR-EN-101', {}, { categorie: 'rampants', description: 'Laine de bois, R = 6,3 m².K/W' })
    expect(v.zone).toBe('Rampant de toiture')
    expect(v.r).toBe('6,3')
    expect(blocs('BAR-EN-101', v)).toEqual([])
  })
  it('BAR-EN-102 : R ≥ 3,7 ; BAR-EN-103 : R ≥ 3 et pare-vapeur renseigné', () => {
    expect(blocs('BAR-EN-102', { r: '3.7' })).toEqual([])
    expect(blocs('BAR-EN-102', { r: '3.5' })).toContain('r')
    expect(blocs('BAR-EN-103', { r: '3', parevapeur: 'Oui' })).toEqual([])
    expect(blocs('BAR-EN-103', { r: '3' })).toContain('parevapeur')
  })
  it('lit R sous ses différents noms dans les caractéristiques du catalogue', () => {
    expect(valeursFiche('BAR-EN-102', { resistance_thermique_R_m2K_W: '4.1' }).r).toBe('4.1')
    expect(valeursFiche('BAR-EN-102', { 'Résistance thermique R': '3,9' }).r).toBe('3,9')
  })
})

describe('BAR-EN-104 — fenêtres', () => {
  it('accepte Uw ≤ 1,3 et Sw ≥ 0,3 ou Uw ≤ 1,7 et Sw ≥ 0,36', () => {
    expect(blocs('BAR-EN-104', { typef: 'Fenêtre ou porte-fenêtre', uw: '1.3', sw: '0.3' })).toEqual([])
    expect(blocs('BAR-EN-104', { typef: 'Fenêtre ou porte-fenêtre', uw: '1.6', sw: '0.36' })).toEqual([])
    expect(blocs('BAR-EN-104', { typef: 'Fenêtre ou porte-fenêtre', uw: '1.6', sw: '0.32' })).toContain('uw')
  })
  it('traduit les codes techniques du catalogue', () => {
    expect(valeursFiche('BAR-EN-104', { type_menuiserie: 'fenetre_toit' }).typef).toBe('Fenêtre de toiture')
  })
})

describe('Fiches non intégrées', () => {
  it('ne bloque pas, mais signale un contrôle manuel', () => {
    const points = verifierFiche('BAR-TH-125', {}, true)
    expect(points.every(p => p.gravite === 'info')).toBe(true)
    expect(points.length).toBe(1)
  })
})

describe('MaPrimeRénov’', () => {
  it('reconnaît la catégorie de revenus depuis le libellé ou la couleur', () => {
    expect(categorieRevenusDepuisLabel('Très modestes (bleu)')).toBe('tres_modestes')
    expect(categorieRevenusDepuisLabel('Jaune')).toBe('modestes')
    expect(categorieRevenusDepuisLabel('Revenus supérieurs')).toBe('superieurs')
    expect(categorieRevenusDepuisLabel('')).toBeNull()
  })
  it('n’ouvre le geste qu’aux PAC air/eau et géothermiques, hors revenus supérieurs', () => {
    expect(mprParGestePossible('pac_air_eau', 'modestes')).toBe(true)
    expect(mprParGestePossible('pac_air_eau', 'superieurs')).toBe(false)
    expect(mprParGestePossible('combles_perdus', 'tres_modestes')).toBe(false)
  })
})
