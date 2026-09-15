-- ============================================================
-- Close the open endpoint on send-weekly-reports, and get its service-role
-- key out of the cron body.
--
-- Two problems, found while fixing the same class of bug on
-- send-training-reminders:
--
--   1. send-weekly-reports had NO inbound auth. Verifying a Supabase JWT is
--      not authentication when the anon key is published in the browser
--      bundle: a single POST would mail every client company's weekly safety
--      report to every recipient on the list. Unlike the reminder function it
--      has no dry-run mode, so there was no harmless way to trigger it.
--
--   2. The weekly-safety-reports cron job carried its service-role key inline
--      in cron.job.command. Any role that can read cron.job could read the
--      key, and a service-role key is total access to this project.
--
-- This migration fixes both by moving the job to the same shape the training
-- reminder jobs use: every credential resolved from Vault at fire time.
--
-- The existing key is lifted out of the current cron command IN THE DATABASE
-- and written straight to Vault. It is never returned to a client and never
-- passes through a transcript, a log, or a migration file.
--
-- The job's schedule is preserved exactly (Mondays 15:00 UTC). This migration
-- changes how the call is authenticated, not when it runs or what it sends.
--
-- ROLLOUT ORDER (same reasoning as the training reminder fix): cron first,
-- function second. A header the function ignores is harmless; a required
-- header the cron does not send is a silently broken Monday.
-- ============================================================

create or replace function public.setup_weekly_reports_cron(p_shared_secret text)
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_job        record;
  v_key        text;
  v_secret_id  uuid;
  v_name       text := 'weekly-safety-reports';
  v_url        text := 'https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-weekly-reports';
  v_schedule   text;
begin
  if p_shared_secret is null or length(p_shared_secret) < 20 then
    raise exception 'a shared secret of at least 20 characters is required';
  end if;

  select * into v_job from cron.job where jobname = v_name;
  if not found then
    raise exception 'cron job % not found', v_name;
  end if;

  -- Keep whatever schedule is actually in place rather than assuming one.
  v_schedule := v_job.schedule;

  -- Prefer a key already in Vault (re-running this must not need the old
  -- inlined value). Otherwise lift it out of the existing command.
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'weekly_reports_key';

  if v_key is null then
    v_key := substring(v_job.command from 'Bearer ([A-Za-z0-9._-]{20,})');
    if v_key is null then
      raise exception
        'no service-role key found in the % cron body and none in Vault - '
        'supply one by calling vault.create_secret(key, ''weekly_reports_key'') first', v_name;
    end if;
    perform vault.create_secret(v_key, 'weekly_reports_key',
      'service_role key used by the weekly safety report cron job');
  end if;

  select id into v_secret_id from vault.secrets where name = 'weekly_reports_shared_secret';
  if v_secret_id is null then
    perform vault.create_secret(p_shared_secret, 'weekly_reports_shared_secret',
      'x-weekly-reports-secret header value for the send-weekly-reports Edge Function');
  else
    perform vault.update_secret(v_secret_id, p_shared_secret);
  end if;

  perform cron.unschedule(v_name);

  perform cron.schedule(
    v_name,
    v_schedule,
    format($cron$
      select net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'weekly_reports_key'
          ),
          'x-weekly-reports-secret', (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'weekly_reports_shared_secret'
          )
        ),
        body    := '{}'::jsonb,
        timeout_milliseconds := 300000
      );
    $cron$, v_url)
  );

  return (
    select jsonb_build_object(
             'jobid', jobid, 'jobname', jobname, 'schedule', schedule, 'active', active,
             'sends_secret_header', command like '%x-weekly-reports-secret%',
             'reads_from_vault', command like '%decrypted_secrets%',
             -- The point of the exercise: no bearer token left in the body.
             'jwt_inlined', command ~ 'Bearer ey')
      from cron.job where jobname = v_name
  );
end;
$fn$;

create or replace function public.weekly_reports_cron_status()
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_job    jsonb;
  v_key    text;
  v_shared text;
begin
  select jsonb_build_object(
           'jobid', c.jobid, 'jobname', c.jobname, 'schedule', c.schedule, 'active', c.active,
           'sends_secret_header', c.command like '%x-weekly-reports-secret%',
           'reads_from_vault', c.command like '%decrypted_secrets%',
           'jwt_inlined', c.command ~ 'Bearer ey',
           'last_run', (
             select jsonb_build_object('status', d.status, 'start_time', d.start_time,
                      'return_message', left(coalesce(d.return_message, ''), 200))
               from cron.job_run_details d
              where d.jobid = c.jobid
              order by d.start_time desc limit 1)
         ) into v_job
    from cron.job c where c.jobname = 'weekly-safety-reports';

  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'weekly_reports_key';
  select decrypted_secret into v_shared
    from vault.decrypted_secrets where name = 'weekly_reports_shared_secret';

  return jsonb_build_object(
    'job', coalesce(v_job, 'null'::jsonb),
    'secret_present', v_key is not null,
    'secret_length', coalesce(length(v_key), 0),
    'shared_secret_present', v_shared is not null,
    'shared_secret_length', coalesce(length(v_shared), 0)
  );
end;
$fn$;

revoke all on function public.setup_weekly_reports_cron(text) from public, anon, authenticated;
revoke all on function public.weekly_reports_cron_status() from public, anon, authenticated;
grant execute on function public.setup_weekly_reports_cron(text) to service_role;
grant execute on function public.weekly_reports_cron_status() to service_role;
