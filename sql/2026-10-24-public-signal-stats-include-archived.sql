-- Statistik publik harus menghitung SEMUA signal selesai (profit + loss), termasuk yang sudah diarsipkan.
-- Cron internal_archive_old_finished_signals mengarsipkan signal berstatus INVALID (loss), sehingga filter
-- is_archived=false membuat loss menghilang dan winrate tampil 100%.
create or replace function public.public_signal_stats()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  with c as (
    select display_status,
      (created_at at time zone 'Asia/Jakarta')::date as d,
      case
        when status='INVALID' and coalesce(farthest_tp_level,0)=0
          then -abs(coalesce(running_point,max_running_point,0))*10
        else coalesce(max_running_point,running_point,0)*10
      end as pips
    from signals
    where display_status in ('profit','loss')
  ), dd as (select d, sum(pips) p from c group by d),
  cum as (select d, round(sum(p) over (order by d)) as cp from dd)
  select jsonb_build_object(
    'total_closed', (select count(*) from c),
    'profit', (select count(*) from c where display_status='profit'),
    'loss', (select count(*) from c where display_status='loss'),
    'winrate', (select case when count(*)=0 then 0 else round(100.0*count(*) filter (where display_status='profit')/count(*),1) end from c),
    'total_pips', (select coalesce(round(sum(pips)),0) from c),
    'since', (select min(d) from c),
    'series', (select coalesce(jsonb_agg(cp order by d),'[]'::jsonb) from cum),
    'updated_at', now());
$function$;
