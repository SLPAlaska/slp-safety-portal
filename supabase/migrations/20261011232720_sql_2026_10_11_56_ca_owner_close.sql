-- SQL #56 (2026-10-11): CA owners and company admins can close their own
-- corrective actions from /corrective-actions (via /api/corrective-actions).
--
-- Additive only. The page used to write percent_complete / completion_notes /
-- completed_date / completed_by_email / updated_at, none of which existed, so
-- every save from that page failed. These two columns hold what the owner says
-- was done and who closed it. Writes go through the service-role API route,
-- which scopes by session (app/lib/caAccess.js); RLS is unchanged (staff-only).

alter table public.investigation_corrective_actions
  add column if not exists completion_notes text,
  add column if not exists completed_by_email text;

comment on column public.investigation_corrective_actions.completion_notes is
  'Append-only log of owner/staff close-out notes, each line stamped [date email -> status]. Written by /api/corrective-actions.';
comment on column public.investigation_corrective_actions.completed_by_email is
  'Verified sign-in email of whoever set the CA to a closed status via /api/corrective-actions.';
