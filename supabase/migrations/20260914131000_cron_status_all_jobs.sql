-- Extend the status check to list EVERY cron job, not just the reminder ones,
-- so a stale or unexpected schedule is visible rather than filtered out.

create or replace function public.training_reminder_cron_status()
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_jobs   jsonb;
  v_all    jsonb;
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

  select jsonb_agg(jsonb_build_object(
           'jobid', jobid, 'jobname', jobname,
           'schedule', schedule, 'active', active) order by jobid)
    into v_all
    from cron.job;

  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'training_reminders_key';

  return jsonb_build_object(
    'reminder_jobs', coalesce(v_jobs, '[]'::jsonb),
    'reminder_job_count', jsonb_array_length(coalesce(v_jobs, '[]'::jsonb)),
    'all_cron_jobs', coalesce(v_all, '[]'::jsonb),
    'secret_present', v_secret is not null,
    'secret_length', coalesce(length(v_secret), 0)
  );
end;
$fn$;

revoke all on function public.training_reminder_cron_status() from public, anon, authenticated;
grant execute on function public.training_reminder_cron_status() to service_role;
