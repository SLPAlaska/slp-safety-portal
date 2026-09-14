-- Weekly schedule for the send-training-reminders Edge Function.
--
-- The service-role key is NOT in this file. Migration SQL is stored in the
-- remote migration-history table and committed to git, so the key is supplied
-- once over HTTPS by calling setup_training_reminder_cron() as service_role.
-- It is held in Supabase Vault and read back only inside the cron job body,
-- so it never appears in cron.job — which is readable by any role that can
-- query it.
--
-- Re-callable: it replaces the stored secret and reschedules the job, so it
-- doubles as the key-rotation path.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.setup_training_reminder_cron(p_key text)
returns jsonb
language plpgsql
security definer
as $fn$
declare
  v_secret_id uuid;
  v_job_name  text := 'send-training-reminders-weekly';
  v_url       text := 'https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-training-reminders';
begin
  if p_key is null or length(p_key) < 20 then
    raise exception 'a service-role key is required';
  end if;

  select id into v_secret_id from vault.secrets where name = 'training_reminders_key';

  if v_secret_id is null then
    perform vault.create_secret(
      p_key,
      'training_reminders_key',
      'service_role key used by the weekly training reminder cron job'
    );
  else
    perform vault.update_secret(v_secret_id, p_key);
  end if;

  if exists (select 1 from cron.job where jobname = v_job_name) then
    perform cron.unschedule(v_job_name);
  end if;

  -- Mondays 16:00 UTC = 08:00 AKDT. Alaska observes DST, so this lands at
  -- 09:00 local during AKST (winter).
  perform cron.schedule(v_job_name, '0 16 * * 1', $cron$
    select net.http_post(
      url     := 'https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-training-reminders',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'training_reminders_key'
        )
      ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 300000
    );
  $cron$);

  return (
    select jsonb_build_object(
      'jobid', jobid, 'jobname', jobname, 'schedule', schedule,
      'active', active, 'url', v_url
    )
    from cron.job where jobname = v_job_name
  );
end;
$fn$;

revoke all on function public.setup_training_reminder_cron(text) from public;
revoke all on function public.setup_training_reminder_cron(text) from anon;
revoke all on function public.setup_training_reminder_cron(text) from authenticated;
grant execute on function public.setup_training_reminder_cron(text) to service_role;
