-- Commission de l'apporteur à la signature d'un devis sur un prospect qu'il a apporté, selon sa matrice (commission_bareme),
-- en plus de celle du commercial. Ligne séparée (reference_type = 'devis_apporteur'), sans part société.
do $mig$
declare d text; d2 text;
begin
  d := pg_get_functiondef('public.fn_sync_commission_devis_signe'::regproc);
  d2 := replace(d, 'FUNCTION public.fn_sync_commission_devis_signe()', 'FUNCTION public.fn_sync_commission_devis_signe_apporteur()');
  d2 := replace(d2, 'SELECT p.commercial_id INTO v_com', 'SELECT p.apporteur_user_id INTO v_com');
  d2 := replace(d2, 'IF v_com IS NULL THEN RETURN NEW; END IF;', E'IF v_com IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles pa WHERE pa.id = v_com AND pa.role = ''apporteur'') THEN RETURN NEW; END IF;');
  d2 := replace(d2, E'  INSERT INTO public.commissions AS current_commission (', E'  IF v_m_com <= 0 THEN RETURN NEW; END IF;\n\n  INSERT INTO public.commissions AS current_commission (');
  d2 := replace(d2, E'v_com, ''devis_signe'', ''Devis signé — '' || COALESCE(NEW.numero, ''''),\n    ''devis'', NEW.id, v_m_com, v_m_soc, ''en_attente''',
                    E'v_com, ''devis_signe'', ''Devis signé (apporteur) — '' || COALESCE(NEW.numero, ''''),\n    ''devis_apporteur'', NEW.id, v_m_com, 0, ''en_attente''');
  if d2 = d or position('devis_apporteur' in d2) = 0 or position('p.apporteur_user_id INTO v_com' in d2) = 0
     or position('IF v_m_com <= 0 THEN RETURN NEW' in d2) = 0 or position('_apporteur()' in d2) = 0 or position('(apporteur) —' in d2) = 0 then
    raise exception 'fn_sync_commission_devis_signe_apporteur : motifs introuvables, migration annulée';
  end if;
  execute d2;
end
$mig$;
revoke all on function public.fn_sync_commission_devis_signe_apporteur() from public, anon, authenticated;

drop trigger if exists trg_sync_commission_devis_signe_apporteur on public.devis;
create trigger trg_sync_commission_devis_signe_apporteur after insert or update of statut on public.devis
  for each row when (new.origine_interne is distinct from true) execute function public.fn_sync_commission_devis_signe_apporteur();

create or replace function public.fn_delete_commission_devis()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  delete from commissions where reference_type in ('devis', 'devis_apporteur') and reference_id = old.id;
  return old;
end;
$$;

do $mig2$
declare d text; d2 text;
begin
  d := pg_get_functiondef('public.mes_recommandations'::regproc);
  d2 := replace(d, 'c.reference_type = ''devis''', 'c.reference_type in (''devis'', ''devis_apporteur'')');
  if d2 = d then raise exception 'mes_recommandations : motif introuvable, migration annulée'; end if;
  execute d2;
end
$mig2$;
