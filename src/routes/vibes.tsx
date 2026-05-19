import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Calendar } from "lucide-react";

export const Route = createFileRoute("/vibes")({
  component: VibesPage,
  head: () => ({
    meta: [
      { title: "Daily Vibes — Sauti ya Zamani" },
      { name: "description", content: "A fresh dose of old-school East African nostalgia every single day. Written for the soul." },
      { property: "og:title", content: "Daily Vibes — Sauti ya Zamani" },
      { property: "og:description", content: "Old-school Bongo, Kenyan classics, sunset matatu memories. Sip and float." },
    ],
  }),
});

function VibesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["vibes"],
    queryFn: async () => (await supabase.from("daily_vibes").select("*").order("date", { ascending: false }).limit(60)).data ?? [],
  });

  const today = data?.[0];
  const archive = data?.slice(1) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 lg:px-6 py-12">
      <div className="text-center space-y-3 animate-fade-up">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs uppercase tracking-widest">
          <Sparkles className="h-3 w-3 text-[color:var(--gold)]" /> AI-curated daily
        </span>
        <h1 className="font-display text-5xl md:text-6xl"><span className="text-gradient-gold">Vibes</span> of the day</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Fresh old-school East African nostalgia, generated every morning at sunrise. Sip slowly.</p>
      </div>

      {isLoading ? (
        <div className="mt-12 h-96 rounded-3xl glass animate-pulse" />
      ) : !today ? (
        <div className="mt-12 glass rounded-3xl p-16 text-center">
          <p className="text-muted-foreground">Today's vibe is still brewing in the kettle. Check back soon.</p>
        </div>
      ) : (
        <article className="mt-12 glass rounded-3xl p-8 md:p-12 shadow-elegant animate-fade-up">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-[color:var(--gold)] mb-4">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(today.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
            {today.mood && <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground">{today.mood}</span>}
          </div>
          <h2 className="font-display text-4xl md:text-5xl leading-tight">{today.title}</h2>
          <div className="mt-6 prose prose-invert max-w-none text-lg text-foreground/90 leading-relaxed whitespace-pre-wrap">{today.body}</div>
          {today.tags && today.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8">
              {today.tags.map((t: string) => <span key={t} className="text-xs px-3 py-1 rounded-full bg-secondary">#{t}</span>)}
            </div>
          )}
        </article>
      )}

      {archive.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-2xl mb-6">Vibe archive</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {archive.map((v: any) => (
              <Link key={v.id} to="/vibes" className="card-3d glass rounded-2xl p-5 hover:bg-gradient-card transition group block">
                <div className="text-xs uppercase tracking-widest text-[color:var(--gold)] mb-2">{new Date(v.date).toLocaleDateString()} {v.mood && `• ${v.mood}`}</div>
                <h3 className="font-display text-lg group-hover:text-primary transition">{v.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{v.body}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
