
-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.content_status AS ENUM ('draft', 'scheduled', 'published');

-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============== USER ROLES ==============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============== UPDATED_AT TRIGGER ==============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============== AUTO PROFILE + ROLE ON SIGNUP ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============== PODCAST CATEGORIES ==============
CREATE TABLE public.podcast_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.podcast_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by all" ON public.podcast_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.podcast_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============== PODCASTS ==============
CREATE TABLE public.podcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  show_notes TEXT,
  cover_image TEXT,
  audio_url TEXT,
  duration INTEGER DEFAULT 0,
  category_id UUID REFERENCES public.podcast_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  status content_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  listen_count INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  trending BOOLEAN NOT NULL DEFAULT false,
  transcript TEXT,
  summary TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_podcasts_status ON public.podcasts(status, published_at DESC);
CREATE INDEX idx_podcasts_category ON public.podcasts(category_id);
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published podcasts viewable by all" ON public.podcasts FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage podcasts" ON public.podcasts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_podcasts_updated_at BEFORE UPDATE ON public.podcasts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============== PODCAST LIKES ==============
CREATE TABLE public.podcast_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(podcast_id, user_id)
);
ALTER TABLE public.podcast_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by all" ON public.podcast_likes FOR SELECT USING (true);
CREATE POLICY "Users like for self" ON public.podcast_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike own" ON public.podcast_likes FOR DELETE USING (auth.uid() = user_id);

-- ============== PODCAST COMMENTS ==============
CREATE TABLE public.podcast_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.podcast_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.podcast_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by all" ON public.podcast_comments FOR SELECT USING (true);
CREATE POLICY "Users post own comments" ON public.podcast_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit own comments" ON public.podcast_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.podcast_comments FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============== LISTENING HISTORY ==============
CREATE TABLE public.listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, podcast_id)
);
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own history" ON public.listening_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own history" ON public.listening_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own history" ON public.listening_history FOR UPDATE USING (auth.uid() = user_id);

-- ============== BLOG CATEGORIES ==============
CREATE TABLE public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog categories viewable" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage blog categories" ON public.blog_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============== BLOG POSTS ==============
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  status content_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  reading_minutes INTEGER DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status, published_at DESC);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published posts viewable" ON public.blog_posts FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage posts" ON public.blog_posts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============== BLOG COMMENTS ==============
CREATE TABLE public.blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog comments viewable" ON public.blog_comments FOR SELECT USING (true);
CREATE POLICY "Users post blog comments" ON public.blog_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own blog comments" ON public.blog_comments FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============== CONTACT MESSAGES ==============
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit contact" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view contact" ON public.contact_messages FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update contact" ON public.contact_messages FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete contact" ON public.contact_messages FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============== NEWSLETTER SUBSCRIBERS ==============
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view subscribers" ON public.newsletter_subscribers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage subscribers" ON public.newsletter_subscribers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============== STORAGE BUCKETS ==============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('podcast-covers', 'podcast-covers', true),
  ('podcast-audio', 'podcast-audio', true),
  ('blog-images', 'blog-images', true),
  ('avatars', 'avatars', true),
  ('background-music', 'background-music', false)
ON CONFLICT (id) DO NOTHING;

-- Public read for public buckets
CREATE POLICY "Public read podcast covers" ON storage.objects FOR SELECT USING (bucket_id = 'podcast-covers');
CREATE POLICY "Public read podcast audio" ON storage.objects FOR SELECT USING (bucket_id = 'podcast-audio');
CREATE POLICY "Public read blog images" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Admin uploads to content buckets
CREATE POLICY "Admins upload covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'podcast-covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update covers" ON storage.objects FOR UPDATE USING (bucket_id = 'podcast-covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete covers" ON storage.objects FOR DELETE USING (bucket_id = 'podcast-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'podcast-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update audio" ON storage.objects FOR UPDATE USING (bucket_id = 'podcast-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete audio" ON storage.objects FOR DELETE USING (bucket_id = 'podcast-audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload blog images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update blog images" ON storage.objects FOR UPDATE USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete blog images" ON storage.objects FOR DELETE USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage bg music" ON storage.objects FOR ALL USING (bucket_id = 'background-music' AND public.has_role(auth.uid(), 'admin'));

-- Users manage own avatar (folder = user id)
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============== SEED CATEGORIES ==============
INSERT INTO public.podcast_categories (name, slug, description, icon) VALUES
  ('Old-School Bongo', 'old-school-bongo', 'Classic Bongo Flava and Swahili coast culture', '🎵'),
  ('Kenyan Entertainment', 'kenyan-entertainment', 'Genge, Kapuka, and Kenyan music history', '🎤'),
  ('Stories & Interviews', 'stories-interviews', 'Long-form interviews with East African legends', '🎙️'),
  ('Music Culture', 'music-culture', 'Deep dives into the sounds that shaped a generation', '🎶'),
  ('Nostalgia', 'nostalgia', 'Stories from back in the day', '📻')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_categories (name, slug, description) VALUES
  ('Culture', 'culture', 'East African culture and history'),
  ('Music', 'music', 'Music industry stories and reviews'),
  ('Interviews', 'interviews', 'Written interview transcripts')
ON CONFLICT (slug) DO NOTHING;
