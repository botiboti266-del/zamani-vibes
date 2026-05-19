
CREATE TABLE IF NOT EXISTS public.daily_vibes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  mood text,
  tags text[] DEFAULT '{}'::text[],
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_vibes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vibes are viewable by everyone"
  ON public.daily_vibes FOR SELECT USING (true);

CREATE POLICY "Admins manage vibes"
  ON public.daily_vibes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_daily_vibes_date ON public.daily_vibes (date DESC);

CREATE TRIGGER tg_daily_vibes_updated
  BEFORE UPDATE ON public.daily_vibes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
