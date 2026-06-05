
-- Enable pg_net for HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- News table
CREATE TABLE IF NOT EXISTS public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  status content_status NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO authenticated;
GRANT SELECT ON public.news TO anon;
GRANT ALL ON public.news TO service_role;

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published news viewable" ON public.news FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage news" ON public.news FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_news_updated_at BEFORE UPDATE ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Generic notify-on-publish trigger that calls the appropriate edge function
CREATE OR REPLACE FUNCTION public.notify_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_name TEXT;
  id_field TEXT;
  payload JSONB;
  url TEXT;
BEGIN
  -- Only fire when status transitions INTO 'published'
  IF NEW.status <> 'published' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'blog_posts' THEN
    fn_name := 'notify-new-blog'; id_field := 'post_id';
  ELSIF TG_TABLE_NAME = 'podcasts' THEN
    fn_name := 'notify-new-episode'; id_field := 'podcast_id';
  ELSIF TG_TABLE_NAME = 'news' THEN
    fn_name := 'notify-new-news'; id_field := 'news_id';
  ELSE
    RETURN NEW;
  END IF;

  -- Stamp published_at if missing
  IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;

  url := 'https://pypdsuyrktiopzfqcibd.supabase.co/functions/v1/' || fn_name;
  payload := jsonb_build_object(id_field, NEW.id);

  PERFORM net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cGRzdXlya3Rpb3B6ZnFjaWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjA2MDgsImV4cCI6MjA5NDUzNjYwOH0.94XS6Rzt7hzQNPF2gWRmsneboI6ycYIrHlQmFMe6fUM'
    ),
    body := payload
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_blog_publish_notify ON public.blog_posts;
CREATE TRIGGER tg_blog_publish_notify
  BEFORE INSERT OR UPDATE OF status ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_publish();

DROP TRIGGER IF EXISTS tg_podcast_publish_notify ON public.podcasts;
CREATE TRIGGER tg_podcast_publish_notify
  BEFORE INSERT OR UPDATE OF status ON public.podcasts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_publish();

DROP TRIGGER IF EXISTS tg_news_publish_notify ON public.news;
CREATE TRIGGER tg_news_publish_notify
  BEFORE INSERT OR UPDATE OF status ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_publish();
