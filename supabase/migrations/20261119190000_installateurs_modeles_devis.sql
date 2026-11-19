-- Modèles de devis par émetteur partenaire (type de travaux → société émettrice,
-- qualification RGE, assurance, fiches couvertes). Voir src/lib/devis/modelesEmetteur.ts.
alter table public.installateurs add column if not exists modeles_devis jsonb not null default '[]'::jsonb;
comment on column public.installateurs.modeles_devis is
  'Modèles de devis proposés à la création (clim, PV, isolation…) : [{code, libelle, emetteur?, pro:{rge, organisme, assurance, validite, fiches[]}}].';

-- Idehome, d'après ses devis (septembre et novembre 2026) : clim et PV sous QualiPAC / QualiPV
-- n° 48304 au nom d'IDEHOME FRANCE (SIRET 794 818 567 00065) ; isolation émise par
-- SARL ECO ENERGIE (Qualibat RGE Isolation E-E213754, décennale AXERIA IARD AIBX00008533).
update public.installateurs set modeles_devis = $json$[
  {"code":"clim","libelle":"Clim / PAC air-air",
   "emetteur":{"siret":"794 818 567 00065"},
   "pro":{"rge":"48304","organisme":"Qualit’EnR — QualiPAC","assurance":"QBE 031 0011520","validite":"2027-01-10","fiches":["BAR-TH-129"]}},
  {"code":"pv","libelle":"Photovoltaïque",
   "emetteur":{"siret":"794 818 567 00065"},
   "pro":{"rge":"48304","organisme":"Qualit’EnR — QualiPV","assurance":"QBE 031 0011520","validite":"2027-01-10","fiches":[]}},
  {"code":"iso","libelle":"Isolation",
   "emetteur":{"nom_affichage":"ECO ENERGIE","raison_sociale":"SARL ECO ENERGIE","forme_juridique":"SARL au capital de 30 000 €",
               "siret":"750 873 895 00031","numero_tva":"FR09750873895","adresse":"8 Rue Jean Mermoz","code_postal":"34430",
               "ville":"Saint-Jean-de-Védas","telephone":"09 70 26 97 59","email":"adv@ecoenergie-france.com","logo_url":""},
   "pro":{"rge":"E-E213754","organisme":"Qualibat — RGE Isolation","assurance":"AXERIA IARD n° AIBX00008533","validite":"","fiches":["BAR-EN-101"]}}
]$json$::jsonb
where nom = 'Idehome';
