-- Analytics views for Supabase Dashboard querying.
-- These are read-only views over existing tables; no new data collection needed.

-- Daily active devices and total request count
create or replace view public.analytics_daily_active as
select
  date,
  count(distinct device_id) as unique_devices,
  sum(count) as total_requests
from public.usage
where device_id not like 'ip_%'
  and device_id not like 'assistant:%'
group by date
order by date desc;

-- Summary vs Assistant usage breakdown per day
create or replace view public.analytics_usage_by_bucket as
select
  date,
  count(distinct case
    when device_id not like 'assistant:%' and device_id not like 'ip_%'
    then device_id
  end) as summary_devices,
  sum(case
    when device_id not like 'assistant:%' and device_id not like 'ip_%'
    then count else 0
  end) as summary_requests,
  count(distinct case
    when device_id like 'assistant:%' and device_id not like 'assistant:ip_%'
    then replace(device_id, 'assistant:', '')
  end) as assistant_devices,
  sum(case
    when device_id like 'assistant:%' and device_id not like 'assistant:ip_%'
    then count else 0
  end) as assistant_requests
from public.usage
group by date
order by date desc;

-- Top articles by vote count
create or replace view public.analytics_top_voted_articles as
select
  url,
  count(*) as total_votes,
  sum(case when is_clickbait then 1 else 0 end) as clickbait_votes,
  sum(case when not is_clickbait then 1 else 0 end) as not_clickbait_votes
from public.article_votes
group by url
order by total_votes desc
limit 50;

-- Retention: devices active on more than one day
create or replace view public.analytics_retention as
select
  device_id,
  count(distinct date) as active_days,
  min(date) as first_seen,
  max(date) as last_seen
from public.usage
where device_id not like 'ip_%'
  and device_id not like 'assistant:%'
group by device_id
having count(distinct date) > 1
order by active_days desc;
