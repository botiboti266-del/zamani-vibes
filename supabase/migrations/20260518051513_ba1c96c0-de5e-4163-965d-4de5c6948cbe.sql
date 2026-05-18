CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  private boolean NOT NULL DEFAULT false,
  updated_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public site settings are viewable" ON public.site_settings;
CREATE POLICY "Public site settings are viewable"
ON public.site_settings
FOR SELECT
USING (private = false OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage site settings" ON public.site_settings;
CREATE POLICY "Admins manage site settings"
ON public.site_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings (key);
CREATE INDEX IF NOT EXISTS idx_podcasts_transcript_search ON public.podcasts USING gin (to_tsvector('english', coalesce(transcript, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(show_notes, '') || ' ' || coalesce(description, '') || ' ' || title));

INSERT INTO public.site_settings (key, value, private)
VALUES
  ('homepage', '{"hero":{"headline":"Sauti ya Zamani","subheadline":"Old-school Bongo, Kenyan entertainment history, interviews, storytelling, and East African culture in one premium podcast home.","primaryCta":"Listen now","secondaryCta":"Read stories"},"featuredPodcastIds":[],"banner":{"enabled":true,"text":"New episodes and classic conversations every week.","linkLabel":"Browse episodes","linkUrl":"/podcasts"},"trendingPodcastIds":[]}'::jsonb, false),
  ('seo', '{"siteTitle":"Sauti ya Zamani","metaDescription":"Classic East African culture, old-school Bongo conversations, Kenyan entertainment history, storytelling, interviews, and nostalgic podcasts.","ogTitle":"Sauti ya Zamani","ogDescription":"Premium old-school Bongo and Kenyan podcast content.","ogImage":"","twitterHandle":"","canonicalUrl":"","sitemapEnabled":true,"robots":"User-agent: *\nAllow: /\nSitemap: /sitemap.xml"}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Admins view background music" ON storage.objects;
CREATE POLICY "Admins view background music"
ON storage.objects
FOR SELECT
USING (bucket_id = 'background-music' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins upload background music" ON storage.objects;
CREATE POLICY "Admins upload background music"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'background-music' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update background music" ON storage.objects;
CREATE POLICY "Admins update background music"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'background-music' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'background-music' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete background music" ON storage.objects;
CREATE POLICY "Admins delete background music"
ON storage.objects
FOR DELETE
USING (bucket_id = 'background-music' AND public.has_role(auth.uid(), 'admin'::app_role));