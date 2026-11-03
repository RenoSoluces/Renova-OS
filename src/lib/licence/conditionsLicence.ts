/** Conditions générales de la licence Renova OS. Projet de texte : à faire valider par un juriste avant signature. */
export const VERSION_CONDITIONS = 'CGL-2026-11'

export interface ParametresLicence {
  fournisseur: string; fournisseurSiret: string; fournisseurAdresse: string
  client: string; clientForme?: string; clientSiret?: string; clientAdresse?: string
  nbLicences: number; prixHtMensuel: number; engagementMois: number; preavisJours: number; essaiJours: number
  debut?: string
}

const euro = (n: number) => `${n.toFixed(2).replace('.', ',')} € HT`
const ou = (v?: string) => (v && v.trim() ? v.trim() : '……………')

export function conditionsLicence(p: ParametresLicence): { titre: string; corps: string } {
  const totalMensuel = p.nbLicences * p.prixHtMensuel
  const engagement = p.engagementMois > 0 ? `${p.engagementMois} mois à compter du ${ou(p.debut)}, puis reconduction tacite par périodes de 1 mois` : `sans durée minimale, à compter du ${ou(p.debut)}`
  const corps = `ENTRE
${ou(p.fournisseur)}, SIRET ${ou(p.fournisseurSiret)}, ${ou(p.fournisseurAdresse)} (« le Fournisseur »),
ET
${ou(p.client)}${p.clientForme ? ` (${p.clientForme})` : ''}, SIRET ${ou(p.clientSiret)}, ${ou(p.clientAdresse)} (« le Client »).

1. Objet
Le Fournisseur concède au Client un droit d'accès et d'utilisation, non exclusif et non cessible, à la plateforme Renova OS (suivi des prospects, devis, dossiers de rénovation énergétique, pièces administratives, suivi des aides) en mode SaaS, pour ses besoins professionnels.

2. Licences et utilisateurs
Le Client dispose de ${p.nbLicences} licence${p.nbLicences > 1 ? 's' : ''} nominative${p.nbLicences > 1 ? 's' : ''}. Une licence est attribuée à une seule personne et ne peut être partagée. Les comptes sont créés par le Fournisseur : le Client ne peut pas créer lui-même de comptes supplémentaires ; toute licence supplémentaire fait l'objet d'une commande.

3. Durée
Engagement : ${engagement}. Résiliation par lettre ou courriel avec un préavis de ${p.preavisJours} jours avant l'échéance de la période en cours.${p.essaiJours > 0 ? ` Une période d'essai gratuite de ${p.essaiJours} jours est accordée ; elle prend fin automatiquement sans engagement si le Client n'active pas la licence.` : ''}

4. Prix et paiement
Prix : ${euro(p.prixHtMensuel)} par mois et par licence, soit ${euro(totalMensuel)} par mois pour ${p.nbLicences} licence${p.nbLicences > 1 ? 's' : ''}, TVA en sus. Facturation mensuelle d'avance, paiement à 30 jours. En cas d'impayé après mise en demeure restée sans effet pendant 15 jours, le Fournisseur peut suspendre l'accès jusqu'au règlement, sans que cela n'interrompe la facturation. Le tarif peut être révisé à chaque échéance avec un préavis de 60 jours ; le Client peut alors résilier sans pénalité.

5. Données personnelles
Pour les données de ses clients et prospects (identité, coordonnées, situation fiscale et foyer, documents), le Client est responsable de traitement et le Fournisseur est son sous-traitant au sens de l'article 28 du RGPD. Le Fournisseur : ne traite les données que sur instruction du Client et pour fournir le service ; garantit la confidentialité des personnes habilitées ; met en œuvre des mesures de sécurité appropriées (accès par rôle, cloisonnement entre entreprises, chiffrement des échanges) ; n'a recours à des sous-traitants ultérieurs (hébergement) qu'avec des garanties équivalentes ; aide le Client à répondre aux demandes d'exercice de droits ; notifie toute violation de données dans les meilleurs délais ; supprime ou restitue les données à la fin du contrat. Le Client s'engage à informer ses clients du traitement et à recueillir les consentements nécessaires (notamment pour la démarche d'aides et les échanges avec les délégataires CEE).

6. Cloisonnement
Les données du Client ne sont visibles ni des autres entreprises utilisatrices ni de leurs équipes. Le Fournisseur n'y accède que pour le support, la maintenance ou à la demande du Client.

7. Aides, calculs et veille réglementaire
Les simulations d'aides (MaPrimeRénov', CEE, TVA, éco-PTZ), les barèmes, les modèles de documents et la veille réglementaire sont des outils d'aide : ils sont mis à jour avec soin mais n'engagent pas le Fournisseur sur l'octroi d'une aide ni sur la conformité d'un dossier. Le Client reste responsable de vérifier les montants et les documents auprès des sources officielles (Anah, délégataires, administration fiscale). Renova OS n'est pas affilié à l'Anah et n'accède pas aux dossiers du Client sur les plateformes de l'Anah ; l'avancement affiché provient de ce que le Client saisit ou importe.

8. Disponibilité et support
Le Fournisseur s'efforce d'assurer l'accès 24 h/24, hors maintenance, sans garantie d'absence d'interruption. Support par courriel en jours ouvrés. Les évolutions du service sont comprises dans le prix.

9. Propriété et usage
Renova OS, son code, ses bases et ses modèles restent la propriété du Fournisseur. Le Client reste propriétaire de ses données. Il s'interdit toute copie, revente, extraction massive du service ou usage pour concurrencer le Fournisseur.

10. Responsabilité
La responsabilité du Fournisseur est limitée aux dommages directs et plafonnée au montant payé par le Client au cours des 12 derniers mois ; elle exclut les pertes indirectes (manque à gagner, perte de dossier ou d'aide).

11. Fin du contrat et réversibilité
À l'issue du contrat, le Client peut exporter ses données (dossiers, clients, documents) pendant 30 jours ; elles sont ensuite supprimées, hors obligations légales de conservation.

12. Droit applicable
Droit français. À défaut d'accord amiable, tribunaux compétents du siège du Fournisseur.

Fait en deux exemplaires, le …………… à ……………

Pour le Fournisseur                                          Pour le Client`
  return { titre: `Contrat de licence Renova OS (${VERSION_CONDITIONS})`, corps }
}
