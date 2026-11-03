import { describe, expect, it } from 'vitest'
import { conditionsLicence } from '../conditionsLicence'

const base = { fournisseur: 'Reno Soluces', fournisseurSiret: '', fournisseurAdresse: '', client: 'France Rénovation', nbLicences: 1, prixHtMensuel: 39, engagementMois: 12, preavisJours: 30, essaiJours: 0 }

describe('conditionsLicence', () => {
  it('reprend prix, durée et interdiction de créer des comptes', () => {
    const { corps } = conditionsLicence(base)
    expect(corps).toContain('39,00 € HT par mois et par licence')
    expect(corps).toContain('12 mois')
    expect(corps).toContain('ne peut pas créer lui-même de comptes')
  })
  it('multiplie le prix par le nombre de licences', () => {
    expect(conditionsLicence({ ...base, nbLicences: 3 }).corps).toContain('117,00 € HT par mois pour 3 licences')
  })
  it('mentionne l\'essai uniquement s\'il existe', () => {
    expect(conditionsLicence(base).corps).not.toContain('essai gratuite')
    expect(conditionsLicence({ ...base, essaiJours: 14 }).corps).toContain('essai gratuite de 14 jours')
  })
  it('offre annuelle avec remise et suspension immédiate', () => {
    const { corps } = conditionsLicence({ ...base, formule: 'annuel', remiseAnnuellePct: 15 })
    expect(corps).toContain('397,80 € HT par an')
    expect(corps).toContain('suspendu immédiatement')
  })
})
