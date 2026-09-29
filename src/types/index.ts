export type PageKey =
  | 'dashboard' | 'prospects' | 'visites' | 'simulations'
  | 'dossiers' | 'devis' | 'catalogue' | 'planning' | 'suivi_chantier' | 'partenaires' | 'performance' | 'documents' | 'parametres' | 'activite' | 'commissions'

export type TypeProspect = 'particulier' | 'professionnel'

export interface Prospect {
  id: string
  civilite: string
  nom: string
  prenom: string
  prenom_conjoint: string | null
  nom_conjoint: string | null
  email: string
  telephone: string
  adresse: string
  adresse_rue: string | null
  adresse_complement: string | null
  code_postal: string
  ville: string
  source: string
  statut: string
  notes: string
  nombre_personnes_foyer: number
  rfr: number | null
  categorie_mpr: string | null
  statut_occupation: string
  fiches_cee: string[]
  zone_ile_de_france: boolean
  commercial: string | null
  commercial_id: string | null
  commercial_historique_id?: string | null
  pot_commun?: boolean
  pot_commun_at?: string | null
  pot_commun_ancien_commercial?: string | null
  tags: string[]
  montant_potentiel: number | null
  temperature: 'chaud' | 'tiede' | 'froid' | null
  derniere_interaction_at: string | null
  // Prospects professionnels (personne morale) — nom/prenom/email/telephone restent
  // les coordonnées du contact au sein de l'entreprise.
  type_prospect: TypeProspect
  raison_sociale: string | null
  siret: string | null
  forme_juridique: string | null
  created_at: string
}

export type InteractionType = 'appel' | 'email' | 'sms' | 'rdv' | 'note' | 'statut' | 'visite' | 'devis' | 'dossier'

export interface Interaction {
  id: string
  prospect_id: string
  type: InteractionType
  contenu: string
  auteur: string | null
  meta: Record<string, unknown>
  created_at: string
}

export type TaskType = 'appel' | 'relance' | 'rdv' | 'email' | 'autre'
export type TaskPriorite = 'basse' | 'normale' | 'haute'

export interface CrmTask {
  id: string
  prospect_id: string
  titre: string
  description: string
  type: TaskType
  priorite: TaskPriorite
  assigne: string | null
  due_at: string | null
  done: boolean
  done_at: string | null
  created_at: string
  prospect?: Prospect
}

export interface Visite {
  id: string
  prospect_id: string
  date_visite: string
  statut: 'planifiee' | 'en_cours' | 'terminee'
  audit_data: AuditData | null
  type_visite?: 'complete' | 'produit'
  produit_cible?: string | null
  vt_produit_id?: string | null
  created_at: string
  prospect?: Prospect
}

export interface Notification {
  id: string
  type: 'relance_devis' | 'tache_retard' | 'vt_a_qualifier' | 'info'
  titre: string
  message: string
  prospect_id: string | null
  devis_id: string | null
  visite_id?: string | null
  recipient_id?: string | null
  lue: boolean
  meta: Record<string, unknown>
  created_at: string
}

export interface DispositifAide {
  id: string
  code: string
  dispositif: 'cee' | 'mpr'
  libelle: string
  description: string
  secteur: 'residentiel' | 'tertiaire'
  public_cible: 'particulier' | 'professionnel' | 'tous'
  categorie: string
  statut: 'active' | 'abrogee'
  date_debut_validite: string | null
  date_fin_validite: string | null
  source_url: string
  derniere_verification: string | null
  created_at: string
  updated_at: string
}

export interface IdentificationData {
  date_visite: string
  occupation: string
  nom_occupant: string
  prenom_occupant: string
  telephone: string
  email: string
  adresse: string
  code_postal: string
  ville: string
  latitude?: number
  longitude?: number
  notes: string
  photos: string[]
}

export interface DonneesBatimentData {
  photo_facade: string
  type_batiment: string
  mitoyennete: string
  surface_habitable: number | null
  nombre_niveaux: number | null
  orientation_principale: string
  etat_general: string
  annee_construction: number | null
  hsp: number | null
  photos_facade: string[]
}

export interface MenuiserieMur {
  id: string
  type_menuiserie: string
  largeur_m: number | null
  hauteur_m: number | null
  vitrage: string
  photos?: string[]
}

export interface MurFiche {
  id: string
  orientation: string
  position: string
  type_doublage: string
  composition: string
  epaisseur_cm: number | null
  longueur_m: number | null
  hauteur_type: 'plat' | 'pointe' | null
  hauteur_m: number | null
  isole: string
  isolant_type: string
  epaisseur_isolant_cm: number | null
  mur_lourd: string
  paroi_ancienne: string
  retour_iso_menuiseries: string
  menuiseries: MenuiserieMur[]
  notes: string
  etape_active: number
  u_value?: number | null
  photos: string[]
}

export interface MenuiserieFiche {
  id: string
  type_menuiserie: string
  orientation: string
  mur_rattache: string
  largeur_m: number | null
  hauteur_m: number | null
  vitrage: string
  materiau: string
  nombre: number
  notes: string
  photos: string[]
}

export interface PlancherFiche {
  id: string
  type: string
  position: string
  surface_m2: number | null
  composition: string
  isolation: string
  isolant_type: string
  epaisseur_isolant_cm: number | null
  notes: string
  photos: string[]
}

export interface PlafondFiche {
  id: string
  type: string
  position: string
  surface_m2: number | null
  composition: string
  isolation: string
  isolant_type: string
  epaisseur_isolant_cm: number | null
  notes: string
  photos: string[]
}

export interface VentilationData {
  type: string
  presence_vmc: string
  age_installation: number | null
  notes: string
}

export interface ChauffageData {
  systeme_principal: string
  energie: string
  puissance_kw: number | null
  annee_installation: number | null
  systeme_secondaire: string
  notes: string
}

export interface EcsData {
  systeme: string
  energie: string
  capacite_l: number | null
  annee_installation: number | null
  notes: string
}

export interface PhotovoltaiqueData {
  interet_client: string // 'oui' | 'non' | 'a_etudier'
  type_toiture: string // 'tuiles' | 'ardoises' | 'bac_acier' | 'toit_terrasse' | 'autre'
  orientation_toiture: string // 'sud' | 'sud_est' | 'sud_ouest' | 'est' | 'ouest' | 'nord_est' | 'nord_ouest' | 'nord'
  inclinaison_deg: number | null
  surface_disponible_m2: number | null
  masques_solaires: string // 'aucun' | 'faible' | 'moyen' | 'fort'
  type_raccordement: string // 'monophase' | 'triphase'
  usage_souhaite: string // 'autoconsommation_revente_surplus' | 'autoconsommation_batterie' | 'revente_totale'
  puissance_souhaitee_kwc: number | null
  consommation_annuelle_kwh: number | null
  notes: string
  photos: string[]
}

export interface AuditData {
  identification?: IdentificationData
  donnees_batiment?: DonneesBatimentData
  murs?: MurFiche[]
  menuiseries?: MenuiserieFiche[]
  planchers?: PlancherFiche[]
  plafonds?: PlafondFiche[]
  ventilation?: VentilationData
  chauffage?: ChauffageData
  ecs?: EcsData
  photovoltaique?: PhotovoltaiqueData
  completed_sections?: number[]
}

export interface Simulation {
  id: string
  prospect_id: string
  visite_id: string | null
  nom: string
  config_avant: any
  config_apres: any
  resultat_avant: any
  resultat_apres: any
  aides: any
  dpe_avant?: string | null
  dpe_apres?: string | null
  travaux_json?: any[]
  created_at: string
}

export interface Dossier {
  id: string
  prospect_id: string
  visite_id: string | null
  devis_id: string | null
  reference: string
  statut: string
  montant_total: number | null
  aides_montant: number | null
  reste_a_charge: number | null
  installateur_id?: string | null
  date_installation_prevue?: string | null
  date_installation?: string | null
  garantie_fin?: string | null
  notes_installation?: string | null
  created_at: string
  prospect?: Prospect
}

export interface PlanningEvent {
  id: string
  titre: string
  date: string
  heure: string
  type: string
  prospect_id: string | null
  adresse: string
  notes: string
  user_id: string | null
  // Renseignés uniquement pour une VT (type === 'visite') attribuée à un commercial ou
  // technicien : montant réellement reversé vs. coût/prix côté société. Si absents, le
  // barème actif de type 'vt' (commission_bareme) s'applique automatiquement.
  commission_montant_commercial?: number | null
  commission_montant_societe?: number | null
  created_at?: string
}

// ── Commissions ──────────────────────────────────────────────────────────────
export type CommissionType = 'vt' | 'devis_signe' | 'manuel'
export type CommissionStatut = 'en_attente' | 'validee' | 'payee' | 'annulee'

export interface CommissionBareme {
  id: string
  type: CommissionType
  libelle: string
  montant_commercial: number
  montant_societe: number
  pourcentage_commercial: number | null
  actif: boolean
  commercial_id?: string | null
  produit_id?: string | null
  mode?: string
  base_pourcentage?: string
  priorite?: number
  date_debut?: string | null
  date_fin?: string | null
  created_at: string
  updated_at?: string
}

export interface Commission {
  id: string
  commercial_id: string | null
  type: CommissionType
  libelle: string
  reference_type: string | null
  reference_id: string | null
  montant_commercial: number
  montant_societe: number
  statut: CommissionStatut
  date_generation: string
  date_validation: string | null
  date_paiement_commercial?: string | null
  date_paiement_societe?: string | null
  notes: string | null
  created_at: string
  commercial?: { id: string; nom_complet: string; couleur?: string } | null
}

export interface Document {
  id: string
  dossier_id: string | null
  nom: string
  type: string
  taille: number | string | null
  url: string
  recu: boolean
  groupe_id: string
  version: number
  created_at: string
}

export interface Entreprise {
  id: string
  raison_sociale: string
  siret: string
  numero_rge: string
  qualifications_rge: { domaine: string; certificat: string; validite: string }[]
  adresse: string
  code_postal: string
  ville: string
  telephone: string
  email: string
  logo_url: string
  taux_cee_eur_par_mwh_cumac: number
  conditions_generales_devis: string
  devis_duree_validite_jours: number
  devis_conditions_paiement_defaut: string
  pv_prix_achat_evite_eur_kwh: number
  pv_prix_revente_surplus_eur_kwh: number
  pv_cout_installation_eur_par_kwc: number
  pv_prime_moins_3kwc_eur_par_kwc: number
  pv_prime_3_9kwc_eur_par_kwc: number
  pv_prime_9_36kwc_eur_par_kwc: number
  pv_prime_plus_36kwc_eur_par_kwc: number
  created_at: string
}

export interface Produit {
  id: string
  entreprise_id: string
  categorie: string
  nom: string
  marque: string
  reference: string
  description: string
  caracteristiques: Record<string, string | number>
  prix_unitaire_ht: number
  unite: 'm2' | 'unite' | 'forfait' | 'kw' | 'kwc' | 'ml'
  zones_prix: { zone: string; prix_unitaire_ht: number }[]
  forfait_pose_ht: number
  forfait_evacuation_ht: number
  tva_taux: number
  eligible_mpr: boolean
  eligible_cee: boolean
  fiche_cee: string
  actif: boolean
  created_at: string
}

export interface Devis {
  id: string
  entreprise_id: string
  prospect_id: string
  visite_id: string | null
  dossier_id: string | null
  numero: string
  statut: 'brouillon' | 'envoye' | 'signe' | 'refuse' | 'expire'
  type_operation: 'mono_geste' | 'renovation_ampleur'
  date_creation: string
  date_validite: string | null
  conditions_paiement: string
  montant_ht: number
  montant_ht_avant_remise?: number
  remise_type?: 'montant' | 'pourcentage'
  remise_valeur?: number
  remise_montant_ht?: number
  montant_tva: number
  montant_ttc: number
  montant_aides: number
  reste_a_charge: number
  notes: string
  signature_statut: 'non_envoye' | 'envoye' | 'signe' | 'refuse'
  signature_date: string | null
  signature_provider: string
  signature_document_url: string
  signature_image_data: string | null
  signature_nom_signataire: string | null
  devis_parent_id: string | null
  numero_avenant: number
  created_at: string
  prospect?: Prospect
  lignes?: DevisLigne[]
  aides?: DevisAide[]
}

export interface DevisLigne {
  id: string
  devis_id: string
  produit_id: string | null
  designation: string
  description: string
  caracteristiques: Record<string, string | number>
  quantite: number
  prix_unitaire_ht: number
  tva_taux: number
  montant_ht: number
  ordre: number
  created_at: string
}

export interface DevisAide {
  id: string
  devis_id: string
  type: 'maprimerenov' | 'cee' | 'anah_ampleur' | 'eco_ptz' | 'tva_reduite'
  libelle: string
  montant: number
  details: Record<string, unknown>
  created_at: string
}
