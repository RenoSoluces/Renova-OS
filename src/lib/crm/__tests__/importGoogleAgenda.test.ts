import { describe, expect, it } from 'vitest'
import { adresseDepuisLieu, analyserRdv, nomDepuisTitre, normaliserTelephone } from '../importGoogleAgenda'

const rdv = (titre: string, extra: Partial<Parameters<typeof analyserRdv>[0]> = {}) =>
  ({ id: 'g1', titre, date: '2026-09-12', heure: '14:00', lieu: '', description: '', participants: [], ...extra })

describe('nomDepuisTitre', () => {
  it('retire les préfixes et le projet, détecte civilité et NOM en majuscules', () => {
    expect(nomDepuisTitre('RDV M. DUPONT Jean - PAC air/eau')).toEqual({ civilite: 'M.', prenom: 'Jean', nom: 'Dupont' })
    expect(nomDepuisTitre('VT : Mme Martin Sophie (combles)')).toEqual({ civilite: 'Mme', prenom: 'Martin', nom: 'Sophie' })
    expect(nomDepuisTitre('Visite technique M et Mme BENALI')).toEqual({ civilite: 'M. et Mme', prenom: '', nom: 'Benali' })
    expect(nomDepuisTitre('Karim Benali')).toEqual({ civilite: '', prenom: 'Karim', nom: 'Benali' })
  })
  it('ignore un numéro de téléphone dans le titre', () => {
    expect(nomDepuisTitre('rdv Roux 06 12 34 56 78').nom).toBe('Roux')
  })
})

describe('adresseDepuisLieu', () => {
  it('sépare rue, code postal et ville', () => {
    expect(adresseDepuisLieu('12 Rue des Lilas, 69003 Lyon, France')).toEqual({ adresse: '12 Rue des Lilas', codePostal: '69003', ville: 'Lyon' })
    expect(adresseDepuisLieu('3 allée du Parc 38200 VIENNE')).toEqual({ adresse: '3 allée du Parc', codePostal: '38200', ville: 'Vienne' })
  })
  it('garde le lieu brut sans code postal', () => {
    expect(adresseDepuisLieu('Chez le client')).toEqual({ adresse: 'Chez le client', codePostal: '', ville: '' })
  })
})

describe('normaliserTelephone', () => {
  it('formate les numéros français', () => {
    expect(normaliserTelephone('+33 6 12 34 56 78')).toBe('06 12 34 56 78')
    expect(normaliserTelephone('0612345678')).toBe('06 12 34 56 78')
  })
})

describe('analyserRdv', () => {
  it('pré-remplit et sélectionne un vrai RDV client', () => {
    const c = analyserRdv(rdv('RDV M. DUPONT Jean - PAC', { lieu: '12 rue des Lilas, 69003 Lyon', description: 'Tél : 06.12.34.56.78\nmail jean.dupont@exemple.fr' }), [])
    expect(c).toMatchObject({ civilite: 'M.', prenom: 'Jean', nom: 'Dupont', telephone: '06 12 34 56 78', email: 'jean.dupont@exemple.fr', codePostal: '69003', ville: 'Lyon', selection: true, doublon: null })
  })
  it('décoche un événement personnel', () => {
    const c = analyserRdv(rdv('Dentiste'), [])
    expect(c.probablementPerso).toBe(true)
    expect(c.selection).toBe(false)
  })
  it('repère un prospect déjà présent par téléphone', () => {
    const c = analyserRdv(rdv('Visite Martin', { description: '0655443322', lieu: '1 rue X 69007 Lyon' }), [{ id: 'p', nom: 'Martin', prenom: 'Sophie', telephone: '+33 6 55 44 33 22' }])
    expect(c.doublon).toBe('Sophie Martin')
    expect(c.selection).toBe(false)
  })
})
