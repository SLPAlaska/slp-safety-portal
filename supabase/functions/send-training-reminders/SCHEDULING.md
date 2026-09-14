# send-training-reminders — deploy & schedule

Weekly per-employee training reminder. See the header comment in `index.ts` for
what it computes and why.

## 1. Deploy

```bash
supabase functions deploy send-training-reminders
```

Reuses the `RESEND_API_KEY` secret that `send-weekly-reports` already uses. If
it is not set in this project:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## 2. Smoke test before scheduling

Dry run — computes everything, sends nothing:

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/send-training-reminders" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'
```

Send every email to one inbox instead of to employees:

```bash
  -d '{"test_email": "brian@slpalaska.com", "limit": 5}'
```

## 3. Schedule weekly (pg_cron + pg_net)

Run once in the SQL editor. Requires the `pg_cron` and `pg_net` extensions,
which Supabase provides.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Mondays at 08:00 America/Anchorage.
-- pg_cron schedules in UTC: AKDT (summer) = UTC-8 -> 16:00 UTC.
-- Alaska observes DST, so this drifts to 09:00 local in winter (AKST, UTC-9).
-- If a fixed local hour matters, use two jobs guarded on the local time, or
-- schedule hourly and early-return in SQL when the local hour is not 8.
select cron.schedule(
  'send-training-reminders-weekly',
  '0 16 * * 1',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-training-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
```

Replace `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>`. Prefer storing the key in
Vault and reading it via `vault.decrypted_secrets` rather than pasting it into
the job definition, since `cron.job` is readable by any role that can query it.

Verify and manage:

```sql
select jobid, jobname, schedule, active from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
select cron.unschedule('send-training-reminders-weekly');
```

## 4. Wall-clock limit — read this if you have many employees

Sends are paced at `SEND_DELAY_MS` (600 ms) to stay under Resend's rate limit,
so roughly 100 emails per minute. Edge Functions have a bounded execution time;
a large roster can exceed it in a single invocation.

The response always includes `employeesTotal`, `employeesConsidered`,
`truncated` and `nextOffset`, so a partial run is visible rather than silent.
If `truncated` is ever `true`, chunk it — either several cron jobs a few minutes
apart with different offsets:

```sql
body := '{"limit": 100, "offset": 0}'::jsonb    -- job 1
body := '{"limit": 100, "offset": 100}'::jsonb  -- job 2, +5 min
```

...or drive the chunking from a caller that loops on `nextOffset` until
`truncated` is `false`.

## Notes

- Employees with nothing actionable are skipped — no "all clear" email.
- All bulk reads are paginated. PostgREST caps a response at 1000 rows and
  enforces it server-side, so an unpaginated read of `lms_completions` (3,700+
  rows) silently drops most of them and every dropped completion reads as
  "never completed". See `pageAll` / `fetchByUsers` in `index.ts`.
- "Overdue" means a refresher genuinely lapsed. Training that was assigned but
  never started is its own "Not Yet Started" section, and the subject line
  reflects whichever sections are actually present.
- `company_admin` users are included; supervisors hold that role and take
  training too.
- The status rules in `index.ts` are a hand port of `app/lib/courseStatus.js`.
  Edge Functions bundle only their own directory and cannot import from `app/`,
  so if the shared helper's thresholds change, update the port as well.
