-- Veille : sources officielles (consultations publiques du ministère, Légifrance / Journal officiel, base AIDA de l'INERIS)
-- à la place de la mention d'un outil tiers, et trois textes supplémentaires. Tout reste « à relire » avant publication.
UPDATE public.veille_reglementaire SET
  date_publication = '2026-10-26',
  resume = 'Consultation publique ouverte du 26/10/2026 au 16/11/2026 : le texte n''est pas encore adopté.',
  source_url = 'https://www.consultations-publiques.developpement-durable.gouv.fr/',
  source_note = 'Source : site des consultations publiques du ministère de la Transition écologique. Vérifié le 03/11/2026.',
  impact = 'Les dossiers qui utilisent cette fiche restent valorisables tant que le texte n''est pas publié ; suivre l''adoption et la date de fin.'
WHERE titre LIKE 'Projet d''arrêté supprimant la fiche d''opération standardisée BAR-TH-159%';

UPDATE public.veille_reglementaire SET
  date_publication = '2026-10-09', date_effet = '2026-10-10',
  resume = 'Permet à l''administration (DGCCRF) de suspendre à titre conservatoire le label RGE d''une entreprise ou l''agrément Mon Accompagnateur Rénov'' ; les ménages dont l''opération a été engagée avant la notification de la suspension conservent leur aide.',
  source_url = 'https://www.legifrance.gouv.fr/',
  source_note = 'Source : Journal officiel du 9 octobre 2026 (JORF n° 0236), Légifrance ; entrée en vigueur le 10/10/2026. Vérifié le 03/11/2026.',
  impact = 'Contrôler que le label RGE de chaque installateur partenaire est actif : une suspension bloque les nouveaux dossiers aidés.'
WHERE titre LIKE 'Décret n° 2026-935 du 7 octobre 2026%';

UPDATE public.veille_reglementaire SET
  source_note = 'À confirmer sur le site des consultations publiques du ministère de la Transition écologique ou sur Légifrance.'
WHERE titre LIKE 'Projet d''arrêté modifiant la définition de la précarité énergétique%';

UPDATE public.veille_reglementaire SET
  date_publication = '2026-09-23',
  resume = 'Abroge deux fiches (transport et agricole) : hors rénovation résidentielle.',
  source_url = 'https://aida.ineris.fr/reglementation/arrete-180926-abrogeant-fiches-doperations-standardisees-tra-104-station-gonflage',
  source_note = 'Source : Journal officiel n° 222 du 23 septembre 2026 (NOR ECOR2624709A), via la base AIDA de l''INERIS. Vérifié le 03/11/2026.'
WHERE titre LIKE 'Arrêté du 18 septembre 2026 abrogeant%';

UPDATE public.veille_reglementaire SET
  source_note = 'À confirmer sur Légifrance.'
WHERE titre LIKE 'Décret n° 2026-863 du 12 septembre 2026%';

INSERT INTO public.veille_reglementaire (organisation_id, titre, resume, dispositifs, type_texte, fiches_concernees, date_publication, date_effet, source_url, source_note, impact, statut)
SELECT o.id, v.titre, v.resume, v.dispositifs, v.type_texte, v.fiches, v.dpub::date, v.deff::date, v.url, v.note, v.impact, 'a_relire'
FROM public.organisations o,
 (VALUES
  ('Arrêté du 26 octobre 2026 portant suppression de fiches d''opérations standardisées du dispositif des certificats d''économies d''énergie',
   'Fait suite au projet soumis à consultation du 16/09 au 12/10/2026 (27 fiches prévues, annexe lots 1 et 2). Les opérations engagées avant la suppression restent valorisables si elles figurent sur une liste transmise dans un délai de 20 jours calendaires à compter de la publication.',
   ARRAY['cee'], 'arrete', ARRAY[]::text[], NULL, NULL,
   'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000055020242',
   'Source : Légifrance (JORF). Entre en vigueur le lendemain de sa publication : confirmer la date de publication et la liste exacte des fiches supprimées.',
   'Vérifier si une des fiches utilisées par vos dossiers figure dans l''annexe ; respecter le délai de 20 jours pour déclarer les opérations déjà engagées.'),
  ('Projet d''arrêté créant des bonifications CEE pour les chauffe-eau thermodynamiques et les équipements solaires',
   'Consultation publique jusqu''au 10 août 2026 ; entrée en vigueur prévue le 1er septembre 2026 sous réserve d''adoption. Vise à compenser la suppression, à compter du 1er septembre 2026, des aides MaPrimeRénov'' pour certains gestes eau chaude sanitaire et solaire thermique.',
   ARRAY['cee','mpr'], 'projet', ARRAY[]::text[], NULL, '2026-09-01',
   'https://synasav.fr/actualites-synasav/detail/cee-de-nouvelles-bonifications-envisagees-pour-les-cet-et-les-equipements-solaires',
   'Source secondaire (Synasav), à confirmer sur le site des consultations publiques du ministère et sur Légifrance (adoption définitive).',
   'Vérifier le barème MaPrimeRénov'' de Renova pour le ballon thermodynamique et le solaire thermique au-delà du 1er septembre 2026.')
 ) AS v(titre, resume, dispositifs, type_texte, fiches, dpub, deff, url, note, impact)
WHERE o.id = '86a55ff0-1451-41c9-abaa-b8f82cf53af8'
  AND NOT EXISTS (SELECT 1 FROM public.veille_reglementaire x WHERE x.organisation_id = o.id AND x.titre = v.titre);
