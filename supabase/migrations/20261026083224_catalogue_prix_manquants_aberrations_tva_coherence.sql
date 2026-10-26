-- Sauvegarde complète du catalogue avant modification des prix / TVA (accès bloqué : RLS sans politique)
create table if not exists public.catalogue_produits_sauvegarde_20261026 as select * from public.catalogue_produits;
alter table public.catalogue_produits_sauvegarde_20261026 enable row level security;

-- 1) Prix manquants (HT, cohérents avec les produits voisins ; marqués "prix_estime" à valider)
with prix(ref, p, fp) as (values
  ('MITSU-MUZ-LN60VG3-E1', 2950::numeric, null::numeric),
  ('MITSU-MXZ-2HA50VF3-E1', 1150, null),
  ('PANASONIC-BZ35CKE-SET', 800, null),
  ('PANASONIC-TZ20CKE-SET', 750, null),
  ('PANASONIC-TZ50CKE-SET', 1400, null),
  ('TOSHIBA-B18B2KVG-SET', 1100, null),
  ('TOSHIBA-B24B2KVG-SET', 1550, null),
  ('TOSHIBA-B18G3KVSG-SET', 1250, null),
  ('TOSHIBA-B22G3KVSG-SET', 1500, null),
  ('TOSHIBA-B24G3KVSG-SET', 1700, null),
  ('VMC-NATHER-MAESTRO-587657', 345, null),
  ('VMC-NATHER-MAESTRO-587656', 295, null),
  ('VMC-NATHER-MAESTRO-587653', 330, null),
  ('VMC-NATHER-MAESTRO-587654', 365, null),
  ('VMC-NATHER-MAESTRO-587655', 300, null),
  ('VMC_SIMPLE_FLUX_HYGROREGLABLE_HYGRO_A', 300, null),
  ('IQ-BATTERY-5P', 3420, 700),
  ('LUNA2000-S1', 3500, 700),
  ('COMPACT-GEN4', 540, 150),
  ('MODULE-SG-READY', 120, 60),
  ('SMARTPLUG-GEN4', 90, 0))
update public.catalogue_produits c
set prix_unitaire_ht = prix.p,
    forfait_pose_ht = coalesce(prix.fp, c.forfait_pose_ht),
    caracteristiques = coalesce(c.caracteristiques,'{}'::jsonb) || '{"prix_estime": true, "prix_estime_date": "2026-10-26"}'::jsonb
from prix where c.reference = prix.ref and c.actif and c.prix_unitaire_ht <= 0;

-- 2) Ballons "génériques" (≈ 2 840 € HT, double des modèles de marque équivalents)
update public.catalogue_produits c set
  prix_unitaire_ht = v.p,
  caracteristiques = coalesce(c.caracteristiques,'{}'::jsonb) || '{"prix_estime": true, "prix_estime_date": "2026-10-26"}'::jsonb
from (values ('BT_200L_MONO',1450::numeric),('BT_200L_SPLIT',1500),('BT_250L_MONO',1600),('BT200L',1450),('BT270L',1750),('THERMOR_150L',1250)) v(ref,p)
where c.reference = v.ref and c.actif and c.categorie='ballon_thermodynamique';

-- 3) PAC « 2 KW » RAK-18PEB : le modèle 18 correspond à une PAC de 5 kW
update public.catalogue_produits set
  nom = 'PAC air/air mono-split Hitachi RAK-18PEB 5 kW (unité intérieure et groupe extérieur)',
  tva_taux = 10
where actif and reference='RAK-18PEB' and nom ilike 'PAC 2 KW%';

-- 4) Références internes manquantes
update public.catalogue_produits set reference='GEN-MICRO-ONDULEUR-ENPHASE' where actif and coalesce(reference,'')='' and nom='Micro-onduleur (par panneau)';
update public.catalogue_produits set reference='GEN-VMC-DOUBLE-FLUX-ALDES' where actif and coalesce(reference,'')='' and nom='VMC double flux avec échangeur';

-- 5) TVA : alignement des lignes isolées sur le taux de leur famille
update public.catalogue_produits set tva_taux = 5.5 where actif and categorie='solaire_thermique' and tva_taux=20;
update public.catalogue_produits set tva_taux = 5.5 where actif and categorie='pac_air_eau' and tva_taux=20;
update public.catalogue_produits set tva_taux = 5.5 where actif and categorie='ite' and tva_taux=20;
update public.catalogue_produits set tva_taux = 5.5 where actif and categorie='rampants' and tva_taux=10;
update public.catalogue_produits set tva_taux = 10 where actif and categorie='pac_air_air' and tva_taux=20;
