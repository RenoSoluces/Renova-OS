-- deposer_dossier : prend en charge les clients professionnels (type_prospect + raison_sociale).
do $mig$
declare d text; d2 text;
begin
  d := pg_get_functiondef('public.deposer_dossier'::regproc);
  d2 := replace(d, E'  v_nom_client text;\n', E'  v_nom_client text;\n  v_type text := case when p_donnees->>''type_prospect'' = ''professionnel'' then ''professionnel'' else ''particulier'' end;\n  v_raison text := nullif(left(trim(coalesce(p_donnees->>''raison_sociale'', '''')), 120), '''');\n');
  d2 := replace(d2, '''Nouveau'', ''particulier'',', '''Nouveau'', v_type,');
  d2 := replace(d2, E'fiches_cee,\n    tags, temperature', E'fiches_cee,\n    raison_sociale, tags, temperature');
  d2 := replace(d2, E'v_fiches,\n    array[''Dossier déposé'']', E'v_fiches,\n    v_raison, array[''Dossier déposé'']');
  if d2 = d or position('v_type,' in d2) = 0 or position('v_raison, array' in d2) = 0 or position('raison_sociale, tags' in d2) = 0 then
    raise exception 'deposer_dossier : motifs introuvables, migration annulée';
  end if;
  execute d2;
end
$mig$;
