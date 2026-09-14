-- Read-only health check for the weekly training reminder cron job.
--
-- Reports whether the job is scheduled and whether the Vault secret actually
-- decrypts, WITHOUT returning the key itself. Without this, a broken secret
-- fails silently: the job posts a null Authorization header, no email is sent,
-- and nothing surfaces until someone reads cron.job_run_details by hand.

create or replace function public.training_reminder_cron_status()
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_job_name text := 'send-training-reminders-weekly';
  v_job      jsonb;
  v_secret   text;
  v_last     jsonb;
begin
  select jsonb_build_object(
           'jobid', jobid, 'jobname', jobname,
           'schedule', schedule, 'active', active)
    into v_job
    from cron.job where jobname = v_job_name;

  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'training_reminders_key';

  select jsonb_build_object(
           'status', status, 'start_time', start_time,
           'return_message', left(coalesce(return_message, ''), 200))
    into v_last
    from cron.job_run_details
   where jobid = (select jobid from cron.job where jobname = v_job_name)
   order by start_time desc
   limit 1;

  return jsonb_build_object(
    'job', coalesce(v_job, 'null'::jsonb),
    'secret_present', v_secret is not null,
    'secret_length', coalesce(length(v_secret), 0),
    'secret_looks_like_jwt', coalesce(v_secret like 'ey%' and v_secret like '%.%.%', false),
    'last_run', coalesce(v_last, 'null'::jsonb)
  );
end;
$fn$;

revoke all on function public.training_reminder_cron_status() from public;
revoke all on function public.training_reminder_cron_status() from anon;
revoke all on function public.training_reminder_cron_status() from authenticated;
grant execute on function public.training_reminder_cron_status() to service_role;
