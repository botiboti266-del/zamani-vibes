
DO $$
BEGIN
  PERFORM cron.unschedule('run-comment-bots-5m');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'run-comment-bots-5m',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url:='https://pypdsuyrktiopzfqcibd.supabase.co/functions/v1/run-comment-bots',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cGRzdXlya3Rpb3B6ZnFjaWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjA2MDgsImV4cCI6MjA5NDUzNjYwOH0.94XS6Rzt7hzQNPF2gWRmsneboI6ycYIrHlQmFMe6fUM","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cGRzdXlya3Rpb3B6ZnFjaWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjA2MDgsImV4cCI6MjA5NDUzNjYwOH0.94XS6Rzt7hzQNPF2gWRmsneboI6ycYIrHlQmFMe6fUM"}'::jsonb,
    body:='{}'::jsonb
  );$$
);
