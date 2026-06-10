
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'youtube' CHECK (source_type IN ('upload','youtube','vimeo','url')),
  source_url TEXT NOT NULL,
  thumbnail TEXT,
  duration INTEGER,
  is_short BOOLEAN NOT NULL DEFAULT false,
  status content_status NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  author_id UUID,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published videos"
  ON public.videos FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins manage videos"
  ON public.videos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX videos_status_published_at_idx ON public.videos (status, published_at DESC);
CREATE INDEX videos_is_short_idx ON public.videos (is_short);

INSERT INTO public.site_settings (key, value)
VALUES ('live_stream', jsonb_build_object(
  'active', false,
  'title', 'Live from the Studio',
  'subtitle', '',
  'stream_url', '',
  'started_at', null
))
ON CONFLICT (key) DO NOTHING;
