-- ============================================================
-- Close the open endpoint on send-training-reminders.
--
-- The function was reachable by anyone holding the Supabase anon key. That key
-- ships in the browser bundle, so it is public by construction: a single POST
-- with an empty body would have mailed every actionable employee across every
-- client company on this project. Verifying a JWT is not authentication when
-- the JWT is published.
--
-- Fix: the function now requires an x-training-reminder-secret header, the
-- same shared-secret pattern send-incident-alert already uses. The cron jobs
-- have to send it, which is what this migration is for.
--
-- The secret is NOT in this file. Migration SQL is committed to git and stored
-- in the remote migration-history table, so the value is supplied once over
-- the wire by calling set_training_reminder_shared_secret() as service_role,
-- exactly the way the service-role key already is. It lives in Vault and is
-- read back only inside the cron job body, so it never appears in cron.job —
-- which any role that can query it can read.
--
-- ORDER OF OPERATIONS when rolling this out (and when rotating):
--   1. set_training_reminder_shared_secret('<value>')   -- Vault
--   2. reschedule_training_reminder_cron()              -- cron bodies
--   3. supabase secrets set TRAINING_REMINDER_SECRET    -- the function's copy
--   4. deploy the function
-- Sending a header the function does not check yet is harmless; requiring a
-- header the cron does not send yet is a silently broken Monday.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. The shared secret, held in Vault
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_training_reminder_shared_secret(p_secret text)
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_secret_id uuid;
begin
  if p_secret is null or length(p_secret) < 20 then
    raise exception 'a shared secret of at least 20 characters is required';
  end if;

  select id into v_secret_id from vault.secrets where name = 'training_reminders_shared_secret';

  if v_secret_id is null then
    perform vault.create_secret(
      p_secret,
      'training_reminders_shared_secret',
      'x-training-reminder-secret header value for the send-training-reminders Edge Function'
    );
  else
    perform vault.update_secret(v_secret_id, p_secret);
  end if;

  -- Length only, never the value: this return lands in a client and in logs.
  return jsonb_build_object('stored', true, 'length', length(p_secret));
end;
$fn$;

-- ─────────────────────────────────────────────────────────────
-- 2. Rescheduling, split out so the cron bodies can be rewritten without
--    re-supplying the service-role key.
--
--    setup_training_reminder_cron(key) stores the key and then calls this, so
--    there is still one definition of what the schedule is.
-- ─────────────────────────────────────────────────────────────
create or replace function public.reschedule_training_reminder_cron()
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_url    text := 'https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-training-reminders';
  v_slices jsonb := jsonb_build_array(
    jsonb_build_object('n', 1, 'min', 0,  'off', 0,   'lim', 120),
    jsonb_build_object('n', 2, 'min', 5,  'off', 120, 'lim', 120),
    jsonb_build_object('n', 3, 'min', 10, 'off', 240, 'lim', 120)
  );
  v_s    jsonb;
  v_name text;
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'training_reminders_key') then
    raise exception 'training_reminders_key is not in Vault - call setup_training_reminder_cron(key) first';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'training_reminders_shared_secret') then
    raise exception 'training_reminders_shared_secret is not in Vault - call set_training_reminder_shared_secret(secret) first';
  end if;

  -- retire the previous single job, if this is an upgrade from that shape
  if exists (select 1 from cron.job where jobname = 'send-training-reminders-weekly') then
    perform cron.unschedule('send-training-reminders-weekly');
  end if;

  for v_s in select value from jsonb_array_elements(v_slices) loop
    v_name := 'send-training-reminders-weekly-' || (v_s->>'n');

    if exists (select 1 from cron.job where jobname = v_name) then
      perform cron.unschedule(v_name);
    end if;

    -- Both credentials are resolved from Vault at fire time. Neither the
    -- service-role key nor the shared secret is written into cron.job.
    perform cron.schedule(
      v_name,
      (v_s->>'min') || ' 16 * * 1',
      format($cron$
        select net.http_post(
          url     := %L,
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || (
              select decrypted_secret from vault.decrypted_secrets
              where name = 'training_reminders_key'
            ),
            'x-training-reminder-secret', (
              select decrypted_secret from vault.decrypted_secrets
              where name = 'training_reminders_shared_secret'
            )
          ),
          body    := %L::jsonb,
          timeout_milliseconds := 300000
        );
      $cron$,
        v_url,
        jsonb_build_object('limit', (v_s->>'lim')::int, 'offset', (v_s->>'off')::int)::text
      )
    );
  end loop;

  return (
    select jsonb_agg(jsonb_build_object(
             'jobid', jobid, 'jobname', jobname,
             'schedule', schedule, 'active', active,
             'sends_secret_header', command like '%x-training-reminder-secret%',
             'secret_value_inlined', command not like '%decrypted_secrets%') order by jobname)
      from cron.job
     where jobname like 'send-training-reminders-weekly%'
  );
end;
$fn$;

-- Keep the original entry point working; it now delegates the schedule.
create or replace function public.setup_training_reminder_cron(p_key text)
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_secret_id uuid;
begin
  if p_key is null or length(p_key) < 20 then
    raise exception 'a service-role key is required';
  end if;

  select id into v_secret_id from vault.secrets where name = 'training_reminders_key';
  if v_secret_id is null then
    perform vault.create_secret(p_key, 'training_reminders_key',
      'service_role key used by the weekly training reminder cron jobs');
  else
    perform vault.update_secret(v_secret_id, p_key);
  end if;

  return public.reschedule_training_reminder_cron();
end;
$fn$;

-- ─────────────────────────────────────────────────────────────
-- 3. The end-to-end test path has to carry the header too, or it stops
--    testing the thing the cron actually does.
-- ─────────────────────────────────────────────────────────────
create or replace function public.training_reminder_cron_test()
returns bigint
language plpgsql
security definer
as $fn$
declare
  v_id bigint;
begin
  select net.http_post(
    url     := 'https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-training-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'training_reminders_key'
      ),
      'x-training-reminder-secret', (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'training_reminders_shared_secret'
      )
    ),
    body    := '{"dry_run": true}'::jsonb,
    timeout_milliseconds := 300000
  ) into v_id;
  return v_id;
end;
$fn$;

-- ─────────────────────────────────────────────────────────────
-- 4. Status reporting: both secrets present, and no secret inlined into a
--    cron body. Lengths and booleans only, never values.
-- ─────────────────────────────────────────────────────────────
create or replace function public.training_reminder_cron_status()
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_jobs   jsonb;
  v_key    text;
  v_shared text;
begin
  select jsonb_agg(j order by j->>'jobname') into v_jobs
  from (
    select jsonb_build_object(
             'jobid', c.jobid, 'jobname', c.jobname,
             'schedule', c.schedule, 'active', c.active,
             'sends_secret_header', c.command like '%x-training-reminder-secret%',
             'reads_from_vault', c.command like '%decrypted_secrets%',
             'last_run', (
               select jsonb_build_object('status', d.status, 'start_time', d.start_time,
                        'return_message', left(coalesce(d.return_message, ''), 200))
                 from cron.job_run_details d
                where d.jobid = c.jobid
                order by d.start_time desc limit 1)
           ) as j
      from cron.job c
     where c.jobname like 'send-training-reminders-weekly%'
  ) s;

  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'training_reminders_key';
  select decrypted_secret into v_shared
    from vault.decrypted_secrets where name = 'training_reminders_shared_secret';

  return jsonb_build_object(
    'jobs', coalesce(v_jobs, '[]'::jsonb),
    'job_count', jsonb_array_length(coalesce(v_jobs, '[]'::jsonb)),
    'secret_present', v_key is not null,
    'secret_length', coalesce(length(v_key), 0),
    'shared_secret_present', v_shared is not null,
    'shared_secret_length', coalesce(length(v_shared), 0)
  );
end;
$fn$;

-- ─────────────────────────────────────────────────────────────
-- 5. None of these are for the browser. anon and authenticated are the roles
--    the public anon key maps to — the exact thing this migration exists to
--    lock out.
-- ─────────────────────────────────────────────────────────────
revoke all on function public.set_training_reminder_shared_secret(text) from public, anon, authenticated;
revoke all on function public.reschedule_training_reminder_cron() from public, anon, authenticated;
revoke all on function public.setup_training_reminder_cron(text) from public, anon, authenticated;
revoke all on function public.training_reminder_cron_test() from public, anon, authenticated;
revoke all on function public.training_reminder_cron_status() from public, anon, authenticated;

grant execute on function public.set_training_reminder_shared_secret(text) to service_role;
grant execute on function public.reschedule_training_reminder_cron() to service_role;
grant execute on function public.setup_training_reminder_cron(text) to service_role;
grant execute on function public.training_reminder_cron_test() to service_role;
grant execute on function public.training_reminder_cron_status() to service_role;
