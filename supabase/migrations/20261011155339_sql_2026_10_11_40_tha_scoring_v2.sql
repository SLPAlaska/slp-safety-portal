-- SQL 2026-10-11 #40: THA scoring v2 (app/lib/thaScoring.js)
-- Additive only. Three nullable columns on tha_assessments so the honest
-- "risk left after controls" answer, the crew's stop-work trigger and the
-- scoring version that graded the THA are stored with it.
-- Old rows and old queued offline submissions (which do not send these
-- fields) keep working: every column is nullable with no default.
-- No grants change: tha_assessments already grants INSERT at table level and
-- RLS policy "Allow anonymous inserts" covers new columns.
alter table public.tha_assessments
  add column if not exists residual_risk text,
  add column if not exists stop_work_trigger text,
  add column if not exists scoring_version text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tha_assessments_residual_risk_chk') then
    alter table public.tha_assessments
      add constraint tha_assessments_residual_risk_chk
      check (residual_risk is null or residual_risk in ('Low', 'Medium', 'High'));
  end if;
end $$;

comment on column public.tha_assessments.residual_risk is 'Risk left after controls, picked by the crew lead: Low / Medium / High (THA scoring v2).';
comment on column public.tha_assessments.stop_work_trigger is 'The specific condition that stops this job, written by the crew (THA scoring v2).';
comment on column public.tha_assessments.scoring_version is 'Version of app/lib/thaScoring.js that produced quality_score / quality_grade. NULL = legacy scorer (pre 2026-10-11).';
