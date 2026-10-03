-- Atomic usage counters.
--
-- The edge function used to read a counter and then write count + 1, so
-- concurrent requests could read the same value and overshoot the limit.
-- consume_usage increments in a single statement and only while the counter
-- is below the limit; refund_usage gives a consumed unit back.
--
-- Only device_id, date and count are touched: the deployed usage table does
-- not have the updated_at column from the original create-table migration.

-- Returns the new count, or null when the counter is already at p_limit.
create or replace function public.consume_usage(p_key text, p_date date, p_limit integer)
returns integer
language sql
set search_path = ''
as $$
  insert into public.usage as u (device_id, date, count)
  select p_key, p_date, 1
  where p_limit > 0
  on conflict (device_id, date) do update
    set count = u.count + 1
    where u.count < p_limit
  returning u.count;
$$;

create or replace function public.refund_usage(p_key text, p_date date)
returns void
language sql
set search_path = ''
as $$
  update public.usage
  set count = greatest(count - 1, 0)
  where device_id = p_key
    and date = p_date;
$$;

-- Only the edge function (service role) may touch the counters.
revoke all on function public.consume_usage(text, date, integer) from public, anon, authenticated;
revoke all on function public.refund_usage(text, date) from public, anon, authenticated;
grant execute on function public.consume_usage(text, date, integer) to service_role;
grant execute on function public.refund_usage(text, date) to service_role;
