-- ============================================================
-- incident-alert-on-submit: move secrets out of the trigger, into Vault.
--
-- BEFORE: the trigger was a dashboard "Database Webhook"
-- (supabase_functions.http_request) whose static arguments carried, in plain
-- text, (a) the project service_role JWT as an Authorization header and
-- (b) the x-incident-alert-secret value. Trigger arguments are visible to any
-- role that can read pg_trigger / pg_get_triggerdef().
--
-- AFTER:
--   * The shared secret lives in Vault as 'incident_alert_shared_secret'.
--     It is generated INSIDE the database (gen_random_bytes) so the value never
--     appears in git, migrations, transcripts or logs.
--   * No service_role key is sent at all: send-incident-alert is deployed with
--     verify_jwt = false and authenticates on the shared secret only.
--   * The edge function verifies the header through
--     public.incident_alert_secret_matches(), a service_role-only RPC that
--     compares SHA-256 digests against Vault. Rotation is therefore a single
--     Vault update: rotate_incident_alert_secret().
--   * The trigger only POSTs when a report BECOMES Submitted (same rule the
--     function already enforced), so draft saves no longer make HTTP calls.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Rotate / create the secret. Returns length only, never the value.
create or replace function public.rotate_incident_alert_secret()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_id  uuid;
  v_new text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select id into v_id from vault.secrets where name = 'incident_alert_shared_secret';
  if v_id is null then
    perform vault.create_secret(
      v_new,
      'incident_alert_shared_secret',
      'x-incident-alert-secret header value for the send-incident-alert Edge Function (rotate with rotate_incident_alert_secret())'
    );
  else
    perform vault.update_secret(v_id, v_new);
  end if;
  return jsonb_build_object('rotated', true, 'length', length(v_new));
end;
$fn$;

revoke all on function public.rotate_incident_alert_secret() from public, anon, authenticated;
grant execute on function public.rotate_incident_alert_secret() to service_role;

-- 2. Verification RPC used by the edge function (service_role only).
create or replace function public.incident_alert_secret_matches(p_provided text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_secret text;
begin
  if p_provided is null or length(p_provided) < 20 then
    return false;
  end if;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'incident_alert_shared_secret';
  if v_secret is null then
    return false;  -- fail closed
  end if;
  return extensions.digest(p_provided, 'sha256') = extensions.digest(v_secret, 'sha256');
end;
$fn$;

revoke all on function public.incident_alert_secret_matches(text) from public, anon, authenticated;
grant execute on function public.incident_alert_secret_matches(text) to service_role;

-- 3. One place that builds the request (trigger + safe test both use it).
create or replace function public.incident_alert_post(p_payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'incident_alert_shared_secret';
  if v_secret is null then
    raise warning 'incident_alert_post: vault secret incident_alert_shared_secret missing; alert not sent';
    return null;
  end if;
  return net.http_post(
    url     := 'https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-incident-alert',
    body    := p_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-incident-alert-secret', v_secret
    ),
    timeout_milliseconds := 5000
  );
end;
$fn$;

revoke all on function public.incident_alert_post(jsonb) from public, anon, authenticated;
grant execute on function public.incident_alert_post(jsonb) to service_role;

-- 4. Trigger function. Never blocks the insert/update: any failure is a warning.
create or replace function public.incident_alert_on_submit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.status = 'Submitted'
     and (tg_op = 'INSERT' or old.status is distinct from 'Submitted') then
    begin
      perform public.incident_alert_post(jsonb_build_object(
        'type',       tg_op,
        'table',      tg_table_name,
        'schema',     tg_table_schema,
        'record',     to_jsonb(new),
        'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
      ));
    exception when others then
      raise warning 'incident_alert_on_submit: % (alert not sent, report saved)', sqlerrm;
    end;
  end if;
  return new;
end;
$fn$;

revoke all on function public.incident_alert_on_submit() from public, anon, authenticated;

drop trigger if exists "incident-alert-on-submit" on public.incidents;
create trigger "incident-alert-on-submit"
  after insert or update on public.incidents
  for each row execute function public.incident_alert_on_submit();
