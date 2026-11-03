/**
 * Pièces administratives d'un dossier installateur : quelles pièces sont attendues selon les travaux,
 * et textes de pré-remplissage (variables {{…}}) des documents que l'installateur doit faire signer.
 * Les textes sont des modèles de départ : chaque entreprise peut les remplacer par les siens
 * (ou importer le formulaire officiel / celui du délégataire CEE).
 */

export type CodePiece = 'devis' | 'mandat_mpr' | 'cadre_cee' | 'mention_tva' | 'mandat_mairie' | 'mandat_enedis' | 'fiches_techniques'

export interface ContexteTravaux {
  /** Désignations + catégories des lignes du devis, pour repérer le type de travaux. */
  lignes: { designation: string; categorie?: string | null; eligible_mpr?: boolean | null; eligible_cee?: boolean | null; fiche_cee?: string | null }[]
  categorieMpr?: string | null
  fichesCee?: string[] | null
}

export interface PieceAttendue {
  code: CodePiece
  libelle: string
  obligatoire: boolean
  /** Pourquoi la pièce est demandée (affiché à l'installateur). */
  raison: string
  /** Document que Renova sait pré-remplir en PDF. */
  generable: boolean
  /** Formulaire ou modèle officiel à préférer si disponible. */
  officiel?: string
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const texteLigne = (l: ContexteTravaux['lignes'][number]) => norm(`${l.categorie || ''} ${l.designation || ''}`)

export const estPhotovoltaique = (c: ContexteTravaux) => c.lignes.some(l => /photovolta|panneau solaire|onduleur|kwc/.test(texteLigne(l)))
/** Travaux qui modifient l'aspect extérieur : une déclaration préalable en mairie est en général nécessaire. */
export const toucheAspectExterieur = (c: ContexteTravaux) =>
  c.lignes.some(l => /photovolta|panneau solaire|pompe a chaleur|pac air|isolation.{0,20}exterieur|ite\b|fenetre|menuiserie|volet|climatisation|groupe exterieur/.test(texteLigne(l)))

export function piecesAttendues(c: ContexteTravaux): PieceAttendue[] {
  const pv = estPhotovoltaique(c)
  const mpr = !!c.categorieMpr || c.lignes.some(l => l.eligible_mpr)
  const cee = (c.fichesCee?.length ?? 0) > 0 || c.lignes.some(l => l.eligible_cee || l.fiche_cee)
  const liste: PieceAttendue[] = [
    { code: 'devis', libelle: 'Devis signé', obligatoire: true, raison: 'Base du dossier et de toutes les aides.', generable: false },
  ]
  if (mpr) liste.push({ code: 'mandat_mpr', libelle: 'Mandat MaPrimeRénov\'', obligatoire: true, generable: true, officiel: 'cerfa 16089*01',
    raison: 'Le client désigne le mandataire (administratif, de perception de fonds ou mixte) qui agit en son nom auprès de l\'Anah.' })
  if (cee) liste.push({ code: 'cadre_cee', libelle: 'Cadre de contribution CEE', obligatoire: true, generable: true, officiel: 'modèle du délégataire',
    raison: 'Le client cède ou affecte la prime CEE ; chaque délégataire fournit son propre modèle, à préférer au nôtre.' })
  liste.push({ code: 'mention_tva', libelle: 'TVA à taux réduit (mention / attestation)', obligatoire: true, generable: true,
    raison: 'Justifie le taux de TVA réduit pour un logement de plus de 2 ans. Depuis le 16/02/2025 une mention sur le devis ou la facture remplace l\'attestation Cerfa pour les nouveaux devis.' })
  if (toucheAspectExterieur(c)) liste.push({ code: 'mandat_mairie', libelle: 'Mandat pour la déclaration préalable en mairie', obligatoire: false, generable: true,
    raison: 'Les travaux modifient l\'aspect extérieur : le client autorise l\'installateur à déposer la déclaration préalable en son nom.' })
  if (pv) liste.push({ code: 'mandat_enedis', libelle: 'Mandat Enedis (raccordement)', obligatoire: true, generable: true,
    raison: 'Panneaux photovoltaïques : le client autorise l\'installateur à faire la demande de raccordement et le contrat auprès d\'Enedis.' })
  liste.push({ code: 'fiches_techniques', libelle: 'Fiches techniques des produits', obligatoire: true, generable: false,
    raison: 'Une fiche par produit du devis (justificatif de performance et d\'éligibilité).' })
  return liste
}

export interface VariablesModele {
  client_civilite: string; client_nom: string; client_prenom: string; client_adresse: string; client_cp: string; client_ville: string
  client_email: string; client_tel: string
  installateur_nom: string; installateur_siret: string; installateur_adresse: string; installateur_email: string; installateur_tel: string
  dossier_reference: string; devis_numero: string; montant_ht: string; montant_ttc: string
  travaux: string; fiches_cee: string; categorie_mpr: string
  date: string; ville: string
}

export interface ModeleTexte { code: CodePiece; titre: string; corps: string; avertissement?: string }

const IDENT_CLIENT = 'Je soussigné(e) {{client_civilite}} {{client_prenom}} {{client_nom}}, demeurant {{client_adresse}}, {{client_cp}} {{client_ville}}'
const IDENT_INST = '{{installateur_nom}}, SIRET {{installateur_siret}}, {{installateur_adresse}}'

export const MODELES: Record<Exclude<CodePiece, 'devis' | 'fiches_techniques'>, ModeleTexte> = {
  mandat_mpr: {
    code: 'mandat_mpr',
    titre: 'Mandat MaPrimeRénov\'',
    avertissement: 'Pré-remplissage de contrôle : la désignation du mandataire se fait sur le formulaire officiel de l\'Anah (cerfa 16089*01) ou dans l\'espace du demandeur. Importez le formulaire signé.',
    corps: `${IDENT_CLIENT},

désigne {{installateur_nom}} (${IDENT_INST}) comme mandataire, pour le dossier de travaux « {{travaux}} » (devis n° {{devis_numero}}, dossier {{dossier_reference}}), afin de :

[ ] accomplir en mon nom les démarches administratives de ma demande de MaPrimeRénov' auprès de l'Anah (mandat administratif) ;
[ ] percevoir en mon nom la prime versée par l'Anah (mandat de perception de fonds) — le mandataire s'engage à me reverser la différence entre la prime et ce qui m'est facturé dans les conditions écrites au devis.

Je reste informé(e) de l'avancement de mon dossier et je peux mettre fin à ce mandat à tout moment par écrit.

Fait à {{ville}}, le {{date}}.

Signature du demandeur                                   Signature du mandataire`,
  },
  cadre_cee: {
    code: 'cadre_cee',
    titre: 'Cadre de contribution — Certificats d\'économies d\'énergie',
    avertissement: 'Chaque délégataire CEE impose en pratique son propre modèle : utilisez-le s\'il existe. Ce document sert de base à défaut.',
    corps: `${IDENT_CLIENT}, bénéficiaire des travaux « {{travaux}} » (devis n° {{devis_numero}}), reconnais avoir été informé(e) du dispositif des certificats d'économies d'énergie (fiches : {{fiches_cee}}).

Je déclare :
- que le logement est mon bien et qu'il est achevé depuis plus de 2 ans ;
- ne pas avoir fait valoir, pour ces mêmes travaux, les CEE auprès d'un autre acteur ;
- accepter que la prime ou la contribution correspondante soit versée à {{installateur_nom}} (${IDENT_INST}) ou à son partenaire délégataire, dans les conditions précisées au devis ;
- que les informations de mon dossier (ressources, composition du foyer) sont exactes.

Je reconnais que cette contribution n'est pas un mandat de perception de MaPrimeRénov'.

Fait à {{ville}}, le {{date}}.

Signature du bénéficiaire`,
  },
  mention_tva: {
    code: 'mention_tva',
    titre: 'Attestation sur l\'honneur — TVA à taux réduit',
    avertissement: 'Depuis le 16/02/2025, la mention portée sur le devis ou la facture remplace l\'attestation Cerfa 1300-SD / 1301-SD pour les nouveaux devis. Faites valider le libellé exact par votre comptable.',
    corps: `${IDENT_CLIENT}, atteste que les travaux « {{travaux}} » commandés à {{installateur_nom}} (devis n° {{devis_numero}}) portent sur un local à usage d'habitation achevé depuis plus de deux ans à la date de commencement des travaux, et que ces travaux remplissent les conditions d'application du taux réduit de TVA.

Adresse des travaux : {{client_adresse}}, {{client_cp}} {{client_ville}}.

Je suis informé(e) que, si ces conditions ne sont pas remplies, je suis solidairement tenu(e) au paiement du complément de taxe.

Fait à {{ville}}, le {{date}}.

Signature du client`,
  },
  mandat_mairie: {
    code: 'mandat_mairie',
    titre: 'Mandat — déclaration préalable de travaux',
    corps: `${IDENT_CLIENT}, propriétaire du bien situé {{client_adresse}}, {{client_cp}} {{client_ville}},

donne mandat à {{installateur_nom}} (${IDENT_INST}) pour constituer, signer et déposer en mon nom la déclaration préalable de travaux relative à : {{travaux}} (devis n° {{devis_numero}}), de suivre son instruction auprès de la mairie et de recevoir les courriers correspondants.

Ce mandat prend fin à l'obtention de la décision de la mairie ou sur révocation écrite de ma part.

Fait à {{ville}}, le {{date}}.

Signature du mandant                                       Signature du mandataire`,
  },
  mandat_enedis: {
    code: 'mandat_enedis',
    titre: 'Mandat Enedis — raccordement d\'une installation photovoltaïque',
    corps: `${IDENT_CLIENT}, ({{client_email}}, {{client_tel}}), propriétaire de l'installation située {{client_adresse}}, {{client_cp}} {{client_ville}},

donne mandat à {{installateur_nom}} (${IDENT_INST}) pour effectuer en mon nom auprès d'Enedis la demande de raccordement et de mise en service de l'installation photovoltaïque « {{travaux}} » (devis n° {{devis_numero}}), signer la convention de raccordement et d'exploitation, suivre le dossier et communiquer avec le gestionnaire de réseau.

Ce mandat est valable jusqu'à la mise en service de l'installation, sauf révocation écrite de ma part.

Fait à {{ville}}, le {{date}}.

Signature du mandant                                       Signature du mandataire`,
  },
}

/** Remplace les {{variables}}. Une variable inconnue ou vide est remplacée par des points à compléter à la main. */
export function remplirModele(corps: string, vars: Partial<VariablesModele>): string {
  return corps.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, cle: string) => {
    const v = (vars as Record<string, string | undefined>)[cle]
    return v && v.trim() ? v.trim() : '……………'
  })
}
