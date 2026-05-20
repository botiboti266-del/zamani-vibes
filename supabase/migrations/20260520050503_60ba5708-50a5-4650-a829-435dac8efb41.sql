
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'generate-daily-vibe';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'generate-daily-vibe',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pypdsuyrktiopzfqcibd.supabase.co/functions/v1/generate-daily-vibe',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cGRzdXlya3Rpb3B6ZnFjaWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjA2MDgsImV4cCI6MjA5NDUzNjYwOH0.94XS6Rzt7hzQNPF2gWRmsneboI6ycYIrHlQmFMe6fUM"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
