-- Separate "no query at all" from "query submitted, no result recorded".
--
-- The first version of this view excluded pending queries from
-- last_query_date, which is right - a submitted query with nothing back does
-- not satisfy 49 CFR 382.701 - but then labelled the driver 'never_queried'.
-- That conflated two findings that need different phone calls.
--
-- All 15 Pollard drivers the view called 'never_queried' in fact have a full
-- query on record, submitted between 2025-04-29 and 2026-03-16, with the
-- result never entered. That is a records problem on our side, not a driver
-- who was never checked, and it is a materially lighter finding than the
-- label implied.
--
-- due_status now has five values:
--   never_queried  no query row exists for this driver at all
--   query_pending  a query exists, no result recorded; the annual clock is
--                  NOT satisfied, but the query was run
--   overdue        last resolved query is more than 12 months old
--   due_soon       due within 30 days
--   current        in date
-- Dropped rather than replaced: `create or replace view` cannot insert new
-- columns before existing ones, and pending_count/pending_since sit in the
-- middle of the column list.
drop view if exists public.da_clearinghouse_annual_due;

create view public.da_clearinghouse_annual_due as
with resolved as (
  select driver_id, max(query_date) as last_query_date
    from public.da_clearinghouse_queries
   where result <> 'pending'
   group by driver_id
), pending as (
  select driver_id,
         count(*)            as pending_count,
         max(query_date)     as pending_since,
         bool_or(query_type = 'full') as pending_full_query
    from public.da_clearinghouse_queries
   where result = 'pending'
   group by driver_id
)
select
  d.id            as driver_id,
  d.client_id,
  d.full_name,
  d.active,
  r.last_query_date,
  (r.last_query_date + interval '12 months')::date        as next_due_date,
  ((r.last_query_date + interval '12 months')::date - current_date) as days_until_due,
  coalesce(p.pending_count, 0) as pending_count,
  p.pending_since,
  coalesce(p.pending_full_query, false) as pending_full_query,
  case
    when r.last_query_date is null and p.driver_id is null then 'never_queried'
    when r.last_query_date is null                          then 'query_pending'
    when (r.last_query_date + interval '12 months')::date < current_date then 'overdue'
    when (r.last_query_date + interval '12 months')::date - current_date <= 30 then 'due_soon'
    else 'current'
  end as due_status
from public.da_drivers d
left join resolved r on r.driver_id = d.id
left join pending  p on p.driver_id = d.id
where d.active;

comment on view public.da_clearinghouse_annual_due is
  'Annual limited-query tracking per 49 CFR 382.701. due_status is '
  'never_queried / query_pending / overdue / due_soon (within 30 days) / '
  'current. query_pending means a query WAS run but its result was never '
  'recorded: the annual clock is not satisfied, but this is a records gap on '
  'our side rather than an unchecked driver.';
