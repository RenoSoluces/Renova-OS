-- L'étape vue par l'apporteur se base sur le dossier qui a un parcours renseigné (le plus récent), et non sur un dossier vide
-- créé plus tard (ex. dossier créé automatiquement au partage avec un partenaire).
do $mig$
declare d text; d2 text;
begin
  d := pg_get_functiondef('public.mes_recommandations'::regproc);
  d2 := replace(d, 'order by d.created_at desc limit 1) dos on true', 'order by (d.parcours_etape is null), d.created_at desc limit 1) dos on true');
  if d2 = d then raise exception 'mes_recommandations : motif introuvable, migration annulée'; end if;
  execute d2;
end $mig$;
