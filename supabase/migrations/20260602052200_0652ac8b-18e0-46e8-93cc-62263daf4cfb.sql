
-- Comment bot identities (pre-seeded synthetic users from KE/TZ/UG)
CREATE TABLE public.comment_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('KE','TZ','UG')),
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comment_bots TO anon, authenticated;
GRANT ALL ON public.comment_bots TO service_role;
ALTER TABLE public.comment_bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bots viewable" ON public.comment_bots FOR SELECT USING (true);
CREATE POLICY "Admins manage bots" ON public.comment_bots FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Per-podcast auto-comment schedule
CREATE TABLE public.podcast_comment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (interval_minutes >= 5),
  style_prompt TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_posted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.podcast_comment_schedules TO authenticated;
GRANT ALL ON public.podcast_comment_schedules TO service_role;
ALTER TABLE public.podcast_comment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schedules viewable" ON public.podcast_comment_schedules FOR SELECT USING (true);
CREATE POLICY "Admins manage schedules" ON public.podcast_comment_schedules FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER schedules_set_updated BEFORE UPDATE ON public.podcast_comment_schedules FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Allow bot-authored comments: make user_id nullable, add bot_id
ALTER TABLE public.podcast_comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.podcast_comments ADD COLUMN bot_id UUID REFERENCES public.comment_bots(id) ON DELETE SET NULL;

-- Seed bot identities (real EA names)
INSERT INTO public.comment_bots (display_name, country) VALUES
('Wanjiku Kamau','KE'),('Brian Otieno','KE'),('Mercy Wairimu','KE'),('Kevin Mwangi','KE'),
('Faith Achieng','KE'),('Daniel Kiprop','KE'),('Joyce Nyambura','KE'),('Samuel Maina','KE'),
('Esther Wambui','KE'),('Peter Onyango','KE'),
('Neema Mushi','TZ'),('Juma Salim','TZ'),('Aisha Hassan','TZ'),('Baraka Mwakasege','TZ'),
('Mariam Iddi','TZ'),('Hamisi Mbwana','TZ'),('Zawadi Komba','TZ'),('Salim Juma','TZ'),
('Halima Mwinyi','TZ'),('Rashidi Hamad','TZ'),
('Aine Tumusiime','UG'),('Brenda Nakato','UG'),('Joseph Okello','UG'),('Patience Nabirye','UG'),
('Moses Ssebunya','UG'),('Sandra Akello','UG'),('Ronald Lubega','UG'),('Hellen Namuli','UG'),
('Isaac Mugisha','UG'),('Sarah Nansubuga','UG');

-- pg_net + pg_cron may already be enabled; ensure
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
