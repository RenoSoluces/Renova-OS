/**
 * Modèle de conditions générales de vente pour une entreprise de rénovation énergétique
 * vendant à des particuliers, y compris hors établissement (domicile du client).
 *
 * Base de travail rédigée à partir du Code de la consommation et du Code civil : elle doit être
 * relue et validée par un juriste avant usage. Les articles sont séparés par une ligne vide ;
 * le PDF du devis met en gras les paragraphes commençant par « Article ».
 */
export interface InfosCGV {
  raison_sociale?: string | null
  forme_juridique?: string | null
  capital_social?: string | null
  siret?: string | null
  adresse?: string | null
  code_postal?: string | null
  ville?: string | null
  telephone?: string | null
  email?: string | null
  numero_rge?: string | null
  taux_penalite_retard?: string | null
  mediateur_nom?: string | null
  mediateur_site?: string | null
  assureur_decennale?: string | null
  police_decennale?: string | null
  couverture_decennale?: string | null
}

const val = (v: string | null | undefined, defaut: string) => (v && String(v).trim()) || defaut

/** Mentions encore à renseigner dans les paramètres pour que les CGV soient complètes. */
export function mentionsManquantes(e: InfosCGV): string[] {
  const manque: string[] = []
  if (!e.mediateur_nom?.trim() || !e.mediateur_site?.trim()) manque.push('médiateur de la consommation (nom et site)')
  if (!e.assureur_decennale?.trim() || !e.police_decennale?.trim()) manque.push('assurance décennale (assureur et n° de contrat)')
  if (!e.siret?.trim()) manque.push('SIRET')
  return manque
}

export function genererCGV(e: InfosCGV): string {
  const nom = val(e.raison_sociale, 'L’entreprise')
  const adresse = [e.adresse, [e.code_postal, e.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const identite = [
    nom, e.forme_juridique && `${e.forme_juridique}${e.capital_social ? ` au capital de ${e.capital_social} €` : ''}`,
    adresse && `siège : ${adresse}`, e.siret && `SIRET ${e.siret}`,
  ].filter(Boolean).join(', ')
  const contact = [e.telephone && `téléphone ${e.telephone}`, e.email && `e-mail ${e.email}`].filter(Boolean).join(', ')
  const mediateur = e.mediateur_nom?.trim()
    ? `${e.mediateur_nom.trim()}${e.mediateur_site?.trim() ? ` (${e.mediateur_site.trim()})` : ''}`
    : '[médiateur de la consommation à renseigner dans Paramètres]'
  const assurance = e.assureur_decennale?.trim()
    ? `${e.assureur_decennale.trim()}${e.police_decennale?.trim() ? `, contrat n° ${e.police_decennale.trim()}` : ''}${e.couverture_decennale?.trim() ? `, couverture : ${e.couverture_decennale.trim()}` : ''}`
    : '[assureur et n° de contrat décennal à renseigner dans Paramètres]'

  return `CONDITIONS GÉNÉRALES DE VENTE

Article 1 – Objet et champ d’application
Les présentes conditions générales de vente (CGV) s’appliquent à toutes les prestations de fourniture et de pose d’équipements et de travaux de rénovation énergétique réalisées par ${identite}${contact ? ` (${contact})` : ''}, ci-après « l’Entreprise », pour le compte de ses clients, ci-après « le Client ». Elles forment, avec le devis signé et ses éventuels avenants, l’intégralité du contrat. En cas de contradiction, les mentions particulières du devis prévalent sur les CGV.

Article 2 – Devis et formation du contrat
Le devis est gratuit, sauf mention contraire. Il est valable pendant la durée indiquée sur celui-ci. Le contrat est formé à la signature du devis par le Client, précédée de la mention « Bon pour accord », sur papier ou par signature électronique. Une visite technique préalable peut être nécessaire : si elle révèle des contraintes non connues lors du devis (accès, état du support, mise aux normes), un avenant est proposé au Client, qui reste libre de l’accepter.

Article 3 – Prix
Les prix sont indiqués en euros, hors taxes et toutes taxes comprises. Le taux de TVA appliqué est celui en vigueur à la date de facturation. Le taux réduit (5,5 % ou 10 %) est appliqué sous réserve que le logement soit achevé depuis plus de deux ans et que le Client remette l’attestation requise ; à défaut, le taux normal s’applique et la différence est due par le Client. Les travaux supplémentaires demandés par le Client en cours de chantier font l’objet d’un avenant écrit et signé.

Article 4 – Aides financières
Les montants d’aides (primes CEE, MaPrimeRénov’ ou autres dispositifs) mentionnés au devis sont des estimations fondées sur les informations communiquées par le Client et sur la réglementation en vigueur à la date du devis. Leur attribution dépend de l’éligibilité du Client et du logement, de l’exactitude des justificatifs fournis et de la décision des organismes qui les versent. Le Client s’engage à fournir des informations exactes et les pièces demandées dans les délais. Sauf faute de l’Entreprise, le refus, la réduction ou le retard d’une aide ne remet pas en cause le contrat et le reste à charge correspondant est dû par le Client.

Article 5 – Droit de rétractation
Lorsque le contrat est conclu hors établissement (notamment au domicile du Client) ou à distance, le Client consommateur dispose d’un délai de quatorze jours calendaires à compter de la conclusion du contrat pour se rétracter, sans avoir à motiver sa décision ni à supporter d’autres coûts que ceux prévus par la loi (articles L221-18 et suivants du Code de la consommation). Pour exercer ce droit, le Client adresse à l’Entreprise, avant l’expiration du délai, le bordereau de rétractation joint au devis ou toute autre déclaration dénuée d’ambiguïté, par courrier ou par e-mail aux coordonnées figurant ci-dessus. Si le Client demande expressément que les travaux commencent avant la fin du délai de rétractation, il reste redevable, en cas de rétractation, d’un montant proportionnel aux prestations déjà réalisées (article L221-25 du Code de la consommation). Le droit de rétractation ne peut plus être exercé pour des travaux pleinement exécutés avant la fin du délai avec l’accord exprès du Client.

Article 6 – Conditions de paiement
Les modalités de paiement (acompte, échéances, solde) figurent sur le devis. Pour un contrat conclu hors établissement, aucun paiement ni acompte ne peut être exigé ou reçu avant l’expiration d’un délai de sept jours à compter de la conclusion du contrat (article L221-10 du Code de la consommation). Le solde est payable à la réception des travaux, sauf mention contraire au devis. Lorsque tout ou partie du prix est réglé par une aide versée directement à l’Entreprise, le Client reste redevable des sommes non prises en charge.

Article 7 – Retard de paiement
Toute somme non réglée à l’échéance porte intérêt de retard au taux de ${val(e.taux_penalite_retard, 'trois fois le taux d’intérêt légal')}, après mise en demeure restée sans effet. Pour le Client professionnel, une indemnité forfaitaire pour frais de recouvrement de 40 € est en outre due de plein droit (article L441-10 du Code de commerce).

Article 8 – Délais d’exécution
Les dates ou délais de démarrage et d’exécution figurant au devis sont donnés à titre indicatif, sauf engagement contraire exprès. Ils peuvent être prolongés en cas d’intempéries, de retard d’approvisionnement indépendant de l’Entreprise, de démarches administratives (autorisations d’urbanisme, raccordement) ou de fait du Client. En l’absence de date convenue, l’Entreprise exécute les travaux au plus tard dans un délai de trente jours après la conclusion du contrat (article L216-1 du Code de la consommation) ; en cas de dépassement, le Client peut mettre l’Entreprise en demeure d’exécuter dans un délai supplémentaire raisonnable, puis résoudre le contrat si elle ne s’exécute pas.

Article 9 – Obligations du Client
Le Client garantit l’accès au chantier, aux réseaux d’eau et d’électricité nécessaires et aux locaux techniques, ainsi que la libération des zones de travail. Il informe l’Entreprise de toute contrainte connue (amiante, réseaux encastrés, servitudes, copropriété) et obtient, le cas échéant, les autorisations nécessaires (déclaration préalable, accord de copropriété), sauf si l’Entreprise s’est engagée à les accomplir.

Article 10 – Réception des travaux
La réception est prononcée contradictoirement à l’achèvement des travaux, avec ou sans réserves, par la signature d’un procès-verbal. Les réserves éventuelles sont levées dans un délai convenu entre les parties. La réception marque le point de départ des garanties légales.

Article 11 – Garanties
Le Client bénéficie des garanties légales applicables : garantie de parfait achèvement d’un an, garantie de bon fonctionnement de deux ans pour les éléments d’équipement dissociables et garantie décennale pour les dommages compromettant la solidité de l’ouvrage ou le rendant impropre à sa destination (articles 1792 et suivants du Code civil), ainsi que la garantie légale de conformité et la garantie des vices cachés. Assurance de responsabilité civile décennale : ${assurance}. Les garanties commerciales des fabricants s’appliquent selon leurs propres conditions. Les garanties ne couvrent pas les dommages résultant d’un usage anormal, d’un défaut d’entretien (notamment l’entretien périodique obligatoire des pompes à chaleur), ou d’une intervention d’un tiers.

Article 12 – Réserve de propriété
Les équipements fournis restent la propriété de l’Entreprise jusqu’au paiement intégral du prix. Les risques sont transférés au Client dès leur livraison sur le chantier.

Article 13 – Sous-traitance
L’Entreprise peut confier tout ou partie des travaux à des entreprises qualifiées, dans le respect de la loi du 31 décembre 1975 relative à la sous-traitance. Elle demeure responsable de leur bonne exécution envers le Client. Pour les travaux ouvrant droit à des aides conditionnées à la qualification RGE, l’entreprise exécutante dispose de la qualification requise${e.numero_rge?.trim() ? ` (RGE n° ${e.numero_rge.trim()})` : ''}.

Article 14 – Force majeure
Aucune des parties ne pourra être tenue responsable d’un retard ou d’une inexécution résultant d’un cas de force majeure au sens de l’article 1218 du Code civil.

Article 15 – Données personnelles
Les données personnelles du Client sont traitées par l’Entreprise pour l’établissement et l’exécution du contrat, la constitution des dossiers d’aides et la gestion de la relation client. Elles peuvent être transmises aux organismes instruisant les aides et aux partenaires intervenant sur le chantier, dans la limite de ce qui est nécessaire. Le Client dispose des droits d’accès, de rectification, d’effacement, d’opposition et de portabilité, qu’il exerce auprès de l’Entreprise aux coordonnées ci-dessus, et peut saisir la CNIL. Le Client peut s’inscrire gratuitement sur la liste d’opposition au démarchage téléphonique Bloctel (www.bloctel.gouv.fr).

Article 16 – Réclamations et médiation
Toute réclamation est adressée par écrit à l’Entreprise. À défaut de solution amiable dans un délai de deux mois, le Client consommateur peut recourir gratuitement au médiateur de la consommation suivant : ${mediateur} (articles L611-1 et suivants du Code de la consommation).

Article 17 – Droit applicable et litiges
Le contrat est soumis au droit français. À défaut d’accord amiable ou de médiation, les litiges relèvent des juridictions compétentes selon les règles de droit commun ; le Client consommateur peut saisir, à son choix, la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable.

BORDEREAU DE RÉTRACTATION
(À renvoyer uniquement si vous souhaitez vous rétracter du contrat.)
À l’attention de ${nom}${adresse ? `, ${adresse}` : ''}${e.email ? `, ${e.email}` : ''} :
Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la prestation de services ci-dessous :
Devis n° ..........................................................
Commandé le (*) / signé le (*) : ..........................................................
Nom du (des) consommateur(s) : ..........................................................
Adresse du (des) consommateur(s) : ..........................................................
Signature du (des) consommateur(s) : ..........................................................
Date : ..........................................................
(*) Rayez la mention inutile.`
}
