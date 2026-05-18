import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PodcastCard, type PodcastCardData } from "@/components/podcast/podcast-card";
import { ArrowRight, Sparkles, TrendingUp, Headphones, Radio } from "lucide-react";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Sauti ya Zamani — Old-School Bongo & Kenyan Podcasts" },
      { name: "description", content: "Stream nostalgic East African podcasts: old-school Bongo, Kenyan entertainment, music culture interviews and stories." },
      { property: "og:title", content: "Sauti ya Zamani — The Nostalgic Sound of East Africa" },
      { property: "og:description", content: "Old-school Bongo & Kenyan podcasts. Stories, interviews, music culture." },
      { property: "og:image", content: heroImg },
      { property: "twitter:image", content: heroImg },
    ],
  }),
});

async function fetchHome() {
  const [featured, trending, latest, categories, posts, settings] = await Promise.all([
    supabase.from("podcasts").select("id,title,slug,description,cover_image,audio_url,duration,listen_count,category:podcast_categories(name)")
      .eq("status", "published").eq("featured", true).order("published_at", { ascending: false }).limit(3),
    supabase.from("podcasts").select("id,title,slug,description,cover_image,audio_url,duration,listen_count,category:podcast_categories(name)")
      .eq("status", "published").eq("trending", true).order("listen_count", { ascending: false }).limit(6),
    supabase.from("podcasts").select("id,title,slug,description,cover_image,audio_url,duration,listen_count,category:podcast_categories(name)")
      .eq("status", "published").order("published_at", { ascending: false }).limit(8),
    supabase.from("podcast_categories").select("*").order("name"),
    supabase.from("blog_posts").select("id,title,slug,excerpt,cover_image,reading_minutes,published_at").eq("status", "published").order("published_at", { ascending: false }).limit(3),
    supabase.from("site_settings").select("value").eq("key", "homepage").maybeSingle(),
  ]);
  const cfg = (settings.data?.value as any) ?? {};
  return {
    featured: (featured.data ?? []) as PodcastCardData[],
    trending: (trending.data ?? []) as PodcastCardData[],
    latest: (latest.data ?? []) as PodcastCardData[],
    categories: categories.data ?? [],
    posts: posts.data ?? [],
    hero: cfg.hero ?? null,
    banner: cfg.banner ?? null,
  };
}

function Home() {
  const { data } = useQuery({ queryKey: ["home"], queryFn: fetchHome });
  const d = data ?? { featured: [], trending: [], latest: [], categories: [], posts: [], hero: null as any, banner: null as any };
  const hero = d.hero;
  const banner = d.banner;

  return (
    <div>
      {banner?.enabled && banner.text && (
        <a href={banner.linkUrl || "#"} className="block bg-gradient-gold text-primary-foreground text-center text-sm py-2.5 px-4 hover:opacity-95 transition">
          <span className="font-semibold">{banner.text}</span>
          {banner.linkLabel && <span className="ml-2 underline underline-offset-2">{banner.linkLabel} →</span>}
        </a>
      )}
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="" width={1920} height={1280} className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
        <div className="mx-auto max-w-7xl px-4 lg:px-6 pt-20 pb-24 lg:pt-28 lg:pb-32 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div className="space-y-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs uppercase tracking-widest">
              <Sparkles className="h-3 w-3 text-[color:var(--gold)]" /> Now streaming
            </span>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.95]">
              {hero?.headline ? (
                <span className="text-gradient-gold">{hero.headline}</span>
              ) : (
                <>The nostalgic <span className="text-gradient-gold italic">sauti</span><br />of <span className="text-gradient-gold">East Africa</span>.</>
              )}
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              {hero?.subheadline || "Old-school Bongo stories. Kenyan entertainment history. Long-form interviews with the voices that shaped a generation. Press play — rudi nyuma kidogo."}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/podcasts" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-gold text-primary-foreground font-semibold shadow-3d btn-shine hover:scale-105 transition">
                <Headphones className="h-4 w-4" /> {hero?.primaryCta || "Browse podcasts"}
              </Link>
              <Link to="/about" className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass font-semibold hover:bg-secondary transition">
                {hero?.secondaryCta || "Our story"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex gap-2 pt-2 items-end h-6">
              {[0.5,0.9,0.4,1,0.7,0.3,0.85,0.5].map((h,i) => (
                <span key={i} style={{ height: `${h*100}%`, animationDelay: `${i*0.12}s` }} className="w-1 bg-gradient-gold rounded-full animate-equalize" />
              ))}
              <span className="text-xs text-muted-foreground ml-3 pb-0.5">Live waveform</span>
            </div>
          </div>

          <div className="relative">
            {d.featured[0] && (
              <Link to="/podcasts/$slug" params={{ slug: d.featured[0].slug }} className="block card-3d rounded-3xl glass overflow-hidden shadow-3d animate-float-slow">
                <div className="aspect-square relative">
                  {d.featured[0].cover_image ? (
                    <img src={d.featured[0].cover_image} alt={d.featured[0].title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-card flex items-center justify-center"><Radio className="h-20 w-20 text-[color:var(--gold)]" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <span className="text-[10px] uppercase tracking-widest text-[color:var(--gold)]">Featured episode</span>
                    <h3 className="font-display text-2xl mt-1">{d.featured[0].title}</h3>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <Section title="Browse by mood" subtitle="Pick your wavelength">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {d.categories.map((c: any) => (
            <Link key={c.id} to="/podcasts" search={{ category: c.slug } as never} className="card-3d glass rounded-2xl p-5 hover:bg-gradient-card transition group">
              <div className="text-3xl mb-2">{c.icon ?? "🎧"}</div>
              <div className="font-display text-lg group-hover:text-primary transition">{c.name}</div>
              {c.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</div>}
            </Link>
          ))}
        </div>
      </Section>

      {/* Trending */}
      {d.trending.length > 0 && (
        <Section title={<><TrendingUp className="inline h-7 w-7 text-[color:var(--gold)]" /> Trending this week</>} subtitle="What everyone's tuned into">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {d.trending.slice(0, 4).map((p) => <PodcastCard key={p.id} podcast={p} />)}
          </div>
        </Section>
      )}

      {/* Latest */}
      <Section title="Latest episodes" subtitle="Freshly pressed" link={{ to: "/podcasts", label: "See all" }}>
        {d.latest.length === 0 ? (
          <EmptyState message="No episodes published yet. Check back soon." />
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {d.latest.map((p) => <PodcastCard key={p.id} podcast={p} />)}
          </div>
        )}
      </Section>

      {/* Blog */}
      {d.posts.length > 0 && (
        <Section title="From the blog" subtitle="Stories worth reading" link={{ to: "/blog", label: "Read more" }}>
          <div className="grid md:grid-cols-3 gap-5">
            {d.posts.map((p: any) => (
              <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="card-3d glass rounded-2xl overflow-hidden group">
                {p.cover_image && <img src={p.cover_image} alt={p.title} loading="lazy" className="aspect-video w-full object-cover" />}
                <div className="p-5">
                  <h3 className="font-display text-xl group-hover:text-primary transition">{p.title}</h3>
                  {p.excerpt && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.excerpt}</p>}
                  <div className="text-xs text-muted-foreground mt-3">{p.reading_minutes ?? 1} min read</div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, subtitle, children, link }: { title: React.ReactNode; subtitle?: string; children: React.ReactNode; link?: { to: string; label: string } }) {
  return (
    <section className="mx-auto max-w-7xl px-4 lg:px-6 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          {subtitle && <div className="text-xs uppercase tracking-widest text-[color:var(--gold)] mb-2">{subtitle}</div>}
          <h2 className="font-display text-3xl md:text-4xl">{title}</h2>
        </div>
        {link && (
          <Link to={link.to as any} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            {link.label} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <Radio className="h-10 w-10 mx-auto mb-3 text-muted-foreground animate-spin-slow" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
