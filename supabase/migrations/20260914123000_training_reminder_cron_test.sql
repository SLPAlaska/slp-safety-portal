-- End-to-end wiring check for the weekly training reminder cron job.
--
-- Fires the SAME pg_net request the cron job fires — same URL, same
-- Vault-resolved Authorization header, same timeout — differing only in that
-- the body hardcodes {"dry_run": true}. It therefore exercises the whole
-- pg_net -> Edge Function path without being able to send a single email.
--
-- pg_net is asynchronous: the post returns a request id and the response lands
-- in net._http_response later, so the result is read with a second call.

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
      )
    ),
    body    := '{"dry_run": true}'::jsonb,
    timeout_milliseconds := 300000
  ) into v_id;
  return v_id;
end;
$fn$;

create or replace function public.training_reminder_cron_test_result(p_id bigint)
returns jsonb
language plpgsql
security definer
as $fn$
declare
  r      record;
  v_json jsonb;
begin
  select * into r from net._http_response where id = p_id;
  if not found then
    return jsonb_build_object('pending', true,
      'note', 'no response row yet - pg_net is async, retry shortly');
  end if;

  begin
    v_json := r.content::jsonb;
  exception when others then
    v_json := null;
  end;

  return jsonb_build_object(
    'status_code',         r.status_code,
    'timed_out',           r.timed_out,
    'error_msg',           r.error_msg,
    'success',             v_json->'success',
    'dryRun',              v_json->'dryRun',
    'employeesTotal',      v_json->'employeesTotal',
    'employeesConsidered', v_json->'employeesConsidered',
    'truncated',           v_json->'truncated',
    'emailsSent',          v_json->'emailsSent',
    'resultCount',         jsonb_array_length(coalesce(v_json->'results', '[]'::jsonb)),
    'body_excerpt',        left(coalesce(r.content, ''), 200)
  );
end;
$fn$;

revoke all on function public.training_reminder_cron_test() from public, anon, authenticated;
revoke all on function public.training_reminder_cron_test_result(bigint) from public, anon, authenticated;
grant execute on function public.training_reminder_cron_test() to service_role;
grant execute on function public.training_reminder_cron_test_result(bigint) to service_role;
