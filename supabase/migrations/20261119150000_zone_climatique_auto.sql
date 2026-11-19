-- Zone climatique déduite automatiquement du code postal (H1, H2, H3).
-- Table département -> zone : src/lib/3cl/database/departementsZones.ts (arrêté du 31 mars 2021).
create or replace function public.zone_climatique_depuis_cp(p_cp text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select case
    when p_cp is null or btrim(p_cp) !~ '^\d{5}$' then null
    when left(btrim(p_cp), 3) = '975' then 'H1'         -- Saint-Pierre-et-Miquelon
    when left(btrim(p_cp), 2) = '97' then 'H3'          -- autres DROM
    when left(btrim(p_cp), 2) = '98' then null          -- COM du Pacifique : hors grille
    when left(btrim(p_cp), 2) = '20' then 'H3'          -- Corse
    else case left(btrim(p_cp), 2)
    WHEN '01' THEN 'H1'
    WHEN '02' THEN 'H1'
    WHEN '03' THEN 'H1'
    WHEN '04' THEN 'H2'
    WHEN '05' THEN 'H1'
    WHEN '06' THEN 'H3'
    WHEN '07' THEN 'H2'
    WHEN '08' THEN 'H1'
    WHEN '09' THEN 'H2'
    WHEN '10' THEN 'H1'
    WHEN '11' THEN 'H3'
    WHEN '12' THEN 'H2'
    WHEN '13' THEN 'H3'
    WHEN '14' THEN 'H1'
    WHEN '15' THEN 'H1'
    WHEN '16' THEN 'H2'
    WHEN '17' THEN 'H2'
    WHEN '18' THEN 'H2'
    WHEN '19' THEN 'H1'
    WHEN '2A' THEN 'H3'
    WHEN '2B' THEN 'H3'
    WHEN '21' THEN 'H1'
    WHEN '22' THEN 'H2'
    WHEN '23' THEN 'H1'
    WHEN '24' THEN 'H2'
    WHEN '25' THEN 'H1'
    WHEN '26' THEN 'H2'
    WHEN '27' THEN 'H1'
    WHEN '28' THEN 'H1'
    WHEN '29' THEN 'H2'
    WHEN '30' THEN 'H3'
    WHEN '31' THEN 'H2'
    WHEN '32' THEN 'H2'
    WHEN '33' THEN 'H2'
    WHEN '34' THEN 'H3'
    WHEN '35' THEN 'H2'
    WHEN '36' THEN 'H2'
    WHEN '37' THEN 'H2'
    WHEN '38' THEN 'H1'
    WHEN '39' THEN 'H1'
    WHEN '40' THEN 'H2'
    WHEN '41' THEN 'H2'
    WHEN '42' THEN 'H1'
    WHEN '43' THEN 'H1'
    WHEN '44' THEN 'H2'
    WHEN '45' THEN 'H1'
    WHEN '46' THEN 'H2'
    WHEN '47' THEN 'H2'
    WHEN '48' THEN 'H2'
    WHEN '49' THEN 'H2'
    WHEN '50' THEN 'H2'
    WHEN '51' THEN 'H1'
    WHEN '52' THEN 'H1'
    WHEN '53' THEN 'H2'
    WHEN '54' THEN 'H1'
    WHEN '55' THEN 'H1'
    WHEN '56' THEN 'H2'
    WHEN '57' THEN 'H1'
    WHEN '58' THEN 'H1'
    WHEN '59' THEN 'H1'
    WHEN '60' THEN 'H1'
    WHEN '61' THEN 'H1'
    WHEN '62' THEN 'H1'
    WHEN '63' THEN 'H1'
    WHEN '64' THEN 'H2'
    WHEN '65' THEN 'H2'
    WHEN '66' THEN 'H3'
    WHEN '67' THEN 'H1'
    WHEN '68' THEN 'H1'
    WHEN '69' THEN 'H1'
    WHEN '70' THEN 'H1'
    WHEN '71' THEN 'H1'
    WHEN '72' THEN 'H2'
    WHEN '73' THEN 'H1'
    WHEN '74' THEN 'H1'
    WHEN '75' THEN 'H1'
    WHEN '76' THEN 'H1'
    WHEN '77' THEN 'H1'
    WHEN '78' THEN 'H1'
    WHEN '79' THEN 'H2'
    WHEN '80' THEN 'H1'
    WHEN '81' THEN 'H2'
    WHEN '82' THEN 'H2'
    WHEN '83' THEN 'H3'
    WHEN '84' THEN 'H2'
    WHEN '85' THEN 'H2'
    WHEN '86' THEN 'H2'
    WHEN '87' THEN 'H1'
    WHEN '88' THEN 'H1'
    WHEN '89' THEN 'H1'
    WHEN '90' THEN 'H1'
    WHEN '91' THEN 'H1'
    WHEN '92' THEN 'H1'
    WHEN '93' THEN 'H1'
    WHEN '94' THEN 'H1'
    WHEN '95' THEN 'H1'
    end
  end
$$;

comment on function public.zone_climatique_depuis_cp(text) is
  'Zone climatique principale (H1/H2/H3) du département du code postal ; null si code postal absent ou invalide.';

-- Remplit la zone de la fiche prospect quand elle est vide, et la suit quand le code postal
-- change si elle avait été déduite de l’ancien code postal. Une zone saisie à la main
-- et différente de celle du code postal n’est jamais écrasée.
create or replace function public.fn_prospect_zone_climatique_auto()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.zone_climatique is null or btrim(new.zone_climatique) = '' then
    new.zone_climatique := public.zone_climatique_depuis_cp(new.code_postal);
  elsif tg_op = 'UPDATE'
    and new.code_postal is distinct from old.code_postal
    and new.zone_climatique is not distinct from old.zone_climatique
    and old.zone_climatique is not distinct from public.zone_climatique_depuis_cp(old.code_postal) then
    new.zone_climatique := coalesce(public.zone_climatique_depuis_cp(new.code_postal), new.zone_climatique);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prospect_zone_climatique_auto on public.prospects;
create trigger trg_prospect_zone_climatique_auto
  before insert or update of code_postal, zone_climatique on public.prospects
  for each row execute function public.fn_prospect_zone_climatique_auto();

-- Commission à la signature : la zone vient du devis (bloc logement), sinon de la fiche
-- prospect, sinon du code postal. Avant, une fiche sans zone donnait 0 € sur les combles.
do $mig$
declare
  v_def text := pg_get_functiondef('public.fn_sync_commission_devis_signe'::regproc);
begin
  if position('v_zone text;' in v_def) = 0 then
    v_def := replace(v_def, '  v_ssc_option text;', E'  v_ssc_option text;\n  v_zone text;');
    v_def := replace(v_def, '  IF v_com IS NULL THEN RETURN NEW; END IF;',
      E'  IF v_com IS NULL THEN RETURN NEW; END IF;\n\n'
      || E'  SELECT COALESCE(\n'
      || E'    NULLIF(upper(left(btrim(COALESCE(NEW.conformite_devis->''logement''->>''zone'', '''')), 2)), ''''),\n'
      || E'    NULLIF(upper(left(btrim(COALESCE(p.zone_climatique, '''')), 2)), ''''),\n'
      || E'    public.zone_climatique_depuis_cp(p.code_postal)\n'
      || E'  ) INTO v_zone\n'
      || E'  FROM public.prospects p WHERE p.id = NEW.prospect_id;');
    v_def := replace(v_def, 'COALESCE(pr.zone_climatique, ''?'')', 'COALESCE(v_zone, ''?'')');
    v_def := replace(v_def, 'pr.zone_climatique = ''H1''', 'v_zone = ''H1''');
    v_def := replace(v_def, 'pr.zone_climatique = ''H2''', 'v_zone = ''H2''');
    if position('pr.zone_climatique' in v_def) > 0 or position('v_zone text;' in v_def) = 0 then
      raise exception 'Remplacement incomplet dans fn_sync_commission_devis_signe';
    end if;
    execute v_def;
  end if;
end
$mig$;
