-- 020_create_survey_analytics_functions.sql
-- Creates an RPC function to return timeseries counts of survey responses grouped by day

create or replace function public.agg_survey_responses_timeseries(p_form_id uuid, p_days integer default null)
returns table(day date, cnt bigint) language sql stable as $$
  select date_trunc('day', created_at)::date as day, count(*)::bigint as cnt
  from public.survey_responses
  where form_id = p_form_id
    and (p_days is null or created_at >= now() - (p_days || ' days')::interval)
  group by day
  order by day;
$$;

-- Grant execute to authenticated role if needed (adjust role as appropriate)
-- grant execute on function public.agg_survey_responses_timeseries(uuid, integer) to authenticated;

