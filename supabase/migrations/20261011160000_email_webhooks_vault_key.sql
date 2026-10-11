-- Email webhooks (alert-email-webhook, sail-assignment-email): stop storing the
-- service_role JWT in plaintext trigger arguments (pg_trigger.tgargs, schema dumps,
-- dashboard webhook UI). The key is now read at fire time from Vault
-- (training_reminders_key, the same entry the training-reminder cron jobs use).
--
-- Edge functions send-alert-email / send-sail-assignment-email are NOT changed.
-- Request is byte-for-byte equivalent to supabase_functions.http_request:
--   POST <url>, headers {Content-type: application/json, Authorization: Bearer <key>},
--   body {old_record, record, type, table, schema}, timeout 5000 ms,
--   and a supabase_functions.hooks log row.
-- Difference: a failure to queue the request (e.g. Vault entry missing) raises a
-- WARNING instead of aborting the INSERT, so an alert/SAIL row is never lost.

create or replace function public.email_webhook_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_url  text := tg_argv[0];
  v_key  text;
  v_req  bigint;
begin
  begin
    if v_url is null or v_url = '' then
      raise exception 'url argument is missing';
    end if;

    select ds.decrypted_secret
      into v_key
      from vault.decrypted_secrets ds
     where ds.name = 'training_reminders_key'
     limit 1;

    if v_key is null or v_key = '' then
      raise exception 'vault secret training_reminders_key is missing';
    end if;

    select net.http_post(
             url                  := v_url,
             body                 := jsonb_build_object(
                                       'old_record', case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
                                       'record',     to_jsonb(new),
                                       'type',       tg_op,
                                       'table',      tg_table_name,
                                       'schema',     tg_table_schema),
             params               := '{}'::jsonb,
             headers              := jsonb_build_object(
                                       'Content-type',  'application/json',
                                       'Authorization', 'Bearer ' || v_key),
             timeout_milliseconds := 5000)
      into v_req;

    insert into supabase_functions.hooks (hook_table_id, hook_name, request_id)
    values (tg_relid, tg_name, v_req);
  exception when others then
    raise warning 'email_webhook_post(%): % (row saved, email not queued)', tg_name, sqlerrm;
  end;
  return new;
end;
$function$;

revoke all on function public.email_webhook_post() from public, anon, authenticated;

-- Recreate both webhooks with the same name, table, timing and URL; no key in args.
drop trigger if exists "alert-email-webhook" on public.system_alerts;
create trigger "alert-email-webhook"
  after insert on public.system_alerts
  for each row
  execute function public.email_webhook_post('https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-alert-email');

drop trigger if exists "sail-assignment-email" on public.sail_assignment_notifications;
create trigger "sail-assignment-email"
  after insert on public.sail_assignment_notifications
  for each row
  execute function public.email_webhook_post('https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-sail-assignment-email');
