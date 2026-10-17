-- REPO SYNC COPY of SQL 2026-10-17-60. Already applied live to SLP (schema_migrations version 20261017161537,
-- name sql_2026_10_17_60_slp_secdef_views_lockdown) by Chief of Staff after Brian's approval, 8:14 to 8:15 AM AKDT
-- 2026-10-17. Statements below are byte-identical to the applied statements; only this header block is added.
--
-- WHY THIS FILE GOVERNS: supabase/migrations/20260919170000_da_annual_due_pending.sql (lines 24-26) drops and
-- re-creates public.da_clearinghouse_annual_due with no security_invoker and no revoke, so Supabase default
-- privileges hand ALL to anon and authenticated. That migration is already applied and is intentionally NOT edited.
-- This later migration is what governs the four views. Any future migration that re-creates one of these views
-- (or creates any new view) must include WITH (security_invoker = true) and REVOKE ALL ... FROM anon in the same
-- file. npm run check:secdef-views enforces this.
--
-- Idempotent: every statement is an ALTER or REVOKE, so a re-run is harmless. No BEGIN or COMMIT here because the
-- Supabase migration runner wraps each file in a transaction (matching the applied copy).
--
-- SLP (Supabase iypezirwdlqpptjpeeyf) SEC-A01: SECURITY DEFINER views lockdown.
-- DRAFT ONLY. NOT APPLIED. SLP is look-only: Brian must approve, after Claude's review, before anyone applies it.
-- Repo migration name if adopted: supabase/migrations/20261017160000_sql_2026_10_17_60_slp_secdef_views_lockdown.sql
-- Number 60: the highest used in slp-safety-portal (origin/main, all remote branches, open PRs #25 and #22) and in the
-- live schema_migrations list is 59 (sql_2026_10_13_59_inv_custom_dictionary). Checked 2026-10-17 about 8:10 AM AKDT.
--
-- Captured state before change (proposed-sql/capture/2026-10-17-60-slp-secdef-views-capture.json):
--   all four views: owner postgres (rolbypassrls = true), reloptions NULL (no security_invoker),
--   relacl {postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm}.
--   investigation_dashboard_view is auto-updatable (is_updatable YES, is_insertable_into YES), so with the owner's
--   RLS bypass anon can likely INSERT, UPDATE or DELETE incidents through it. Not tested (no writes were made).
--
-- Effect: views run with the caller's rights, so base-table RLS applies. anon loses every privilege on the views.
-- authenticated keeps SELECT only. service_role is unchanged (it bypasses RLS).
-- Readers in code (origin/main 19179e5): app/api/da/route.js:125, :184 use the service-role client (unaffected);
-- app/components/SailDashboard.js:42 is not imported anywhere (no live page affected). See 2026-10-17-60-BREAKAGE.md.

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter view public.da_clearinghouse_annual_due   set (security_invoker = true);
alter view public.lms_learner_course_summary    set (security_invoker = true);
alter view public.investigation_dashboard_view  set (security_invoker = true);
alter view public.sail_dashboard_stats          set (security_invoker = true);

revoke all on public.da_clearinghouse_annual_due  from anon;
revoke all on public.lms_learner_course_summary   from anon;
revoke all on public.investigation_dashboard_view from anon;
revoke all on public.sail_dashboard_stats         from anon;

-- authenticated keeps SELECT (DER and staff reads go through base-table RLS); write privileges on views are removed.
revoke insert, update, delete, truncate, references, trigger, maintain on public.da_clearinghouse_annual_due  from authenticated;
revoke insert, update, delete, truncate, references, trigger, maintain on public.lms_learner_course_summary   from authenticated;
revoke insert, update, delete, truncate, references, trigger, maintain on public.investigation_dashboard_view from authenticated;
revoke insert, update, delete, truncate, references, trigger, maintain on public.sail_dashboard_stats         from authenticated;

-- Self-check: any failure raises and rolls back the whole transaction.
do $$
declare
  v text;
  bad text := '';
begin
  foreach v in array array['da_clearinghouse_annual_due','lms_learner_course_summary',
                           'investigation_dashboard_view','sail_dashboard_stats'] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relname = v and c.relkind = 'v'
                      and 'security_invoker=true' = any (coalesce(c.reloptions, '{}'))) then
      bad := bad || v || ': security_invoker not set; ';
    end if;
    if has_table_privilege('anon', 'public.' || v, 'SELECT')
       or has_table_privilege('anon', 'public.' || v, 'INSERT')
       or has_table_privilege('anon', 'public.' || v, 'UPDATE')
       or has_table_privilege('anon', 'public.' || v, 'DELETE') then
      bad := bad || v || ': anon still has a privilege; ';
    end if;
    if exists (select 1 from pg_attribute a where a.attrelid = ('public.' || v)::regclass
                and a.attacl is not null and a.attacl::text ~ '(^|[{,])anon=') then
      bad := bad || v || ': anon column-level ACL remains; ';
    end if;
    if not has_table_privilege('authenticated', 'public.' || v, 'SELECT') then
      bad := bad || v || ': authenticated lost SELECT; ';
    end if;
    if has_table_privilege('authenticated', 'public.' || v, 'UPDATE')
       or has_table_privilege('authenticated', 'public.' || v, 'DELETE')
       or has_table_privilege('authenticated', 'public.' || v, 'INSERT') then
      bad := bad || v || ': authenticated still has a write privilege; ';
    end if;
    if not has_table_privilege('service_role', 'public.' || v, 'SELECT') then
      bad := bad || v || ': service_role lost SELECT; ';
    end if;
  end loop;
  -- Base tables must have RLS on, or security_invoker protects nothing.
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
                and c.relname in ('da_drivers','da_clearinghouse_queries','lms_users','lms_courses','lms_progress',
                                  'lms_quiz_attempts','lms_completions','lms_slides','incidents','sail_log')) then
    bad := bad || 'a base table has RLS disabled; ';
  end if;
  if bad <> '' then
    raise exception 'SEC-A01 self-check failed: %', bad;
  end if;
  raise notice 'SEC-A01 self-check passed: 4 views security_invoker, anon revoked, authenticated SELECT only';
end
$$;

