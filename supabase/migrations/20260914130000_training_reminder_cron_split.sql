-- Split the weekly reminder into three offset jobs.
--
-- A single invocation had to send ~213 emails at 600ms pacing plus a Resend
-- round trip each — roughly 170-250s. That fits inside the 300s pg_net timeout
-- only barely, and Edge Functions enforce their own wall clock independently.
-- A mid-loop kill is the bad case: some employees mailed, some not, no response
-- returned, and no record of where it stopped, so a retry re-mails everyone
-- already contacted.
--
-- Three slices of 120 (covering all 352 active employees with an address, not
-- just the ~213 actionable ones — limit/offset index the full roster) keep each
-- run near 60-90s. Five minutes apart, so a slow slice cannot overlap the next.
--
-- Slicing depends on a stable sort; the function orders by (full_name, id) so
-- duplicate names cannot re-order between invocations.

create or replace function public.setup_training_reminder_cron(p_key text)
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_secret_id uuid;
  v_url    text := 'https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-training-reminders';
  v_slices jsonb := jsonb_build_array(
    jsonb_build_object('n', 1, 'min', 0,  'off', 0,   'lim', 120),
    jsonb_build_object('n', 2, 'min', 5,  'off', 120, 'lim', 120),
    jsonb_build_object('n', 3, 'min', 10, 'off', 240, 'lim', 120)
  );
  v_s    jsonb;
  v_name text;
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

  -- retire the previous single job
  if exists (select 1 from cron.job where jobname = 'send-training-reminders-weekly') then
    perform cron.unschedule('send-training-reminders-weekly');
  end if;

  for v_s in select value from jsonb_array_elements(v_slices) loop
    v_name := 'send-training-reminders-weekly-' || (v_s->>'n');

    if exists (select 1 from cron.job where jobname = v_name) then
      perform cron.unschedule(v_name);
    end if;

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
             'schedule', schedule, 'active', active) order by jobname)
      from cron.job
     where jobname like 'send-training-reminders-weekly%'
  );
end;
$fn$;

create or replace function public.training_reminder_cron_status()
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_jobs   jsonb;
  v_secret text;
begin
  select jsonb_agg(j order by j->>'jobname') into v_jobs
  from (
    select jsonb_build_object(
             'jobid', c.jobid, 'jobname', c.jobname,
             'schedule', c.schedule, 'active', c.active,
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

  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'training_reminders_key';

  return jsonb_build_object(
    'jobs', coalesce(v_jobs, '[]'::jsonb),
    'job_count', jsonb_array_length(coalesce(v_jobs, '[]'::jsonb)),
    'secret_present', v_secret is not null,
    'secret_length', coalesce(length(v_secret), 0)
  );
end;
$fn$;

revoke all on function public.setup_training_reminder_cron(text) from public, anon, authenticated;
revoke all on function public.training_reminder_cron_status() from public, anon, authenticated;
grant execute on function public.setup_training_reminder_cron(text) to service_role;
grant execute on function public.training_reminder_cron_status() to service_role;
