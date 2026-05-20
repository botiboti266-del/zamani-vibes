import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PodcastCard, type PodcastCardData } from "@/components/podcast/podcast-card";
import { Search } from "lucide-react";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
});

export const Route = createFileRoute("/podcasts")({
  validateSearch: searchSchema,
  component: PodcastsRouteShell,
  head: () => ({
    meta: [
      { title: "All Podcasts — Sauti ya Zamani" },
      { name: "description", content: "Browse every episode: old-school Bongo, Kenyan stories, music culture interviews. Search by topic, tag, or transcript." },
      { property: "og:title", content: "All Podcasts — Sauti ya Zamani" },
      { property: "og:description", content: "Browse every Sauti ya Zamani episode." },
    ],
  }),
});

function PodcastsRouteShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/podcasts") return <Outlet />;
  return <PodcastsIndex />;
}

function PodcastsIndex() {
  const { q, category } = Route.useSearch();
  const [search, setSearch] = useState(q ?? "");
  const cats = useQuery({
    queryKey: ["cats"],
    queryFn: async () => (await supabase.from("podcast_categories").select("*").order("name")).data ?? [],
  });

  const list = useQuery({
    queryKey: ["podcasts", q, category],
    queryFn: async () => {
      let qb = supabase
        .from("podcasts")
        .select("id,title,slug,description,cover_image,audio_url,duration,listen_count,transcript,show_notes,category:podcast_categories(name,slug)")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (q) {
        const term = q.replace(/[%,()]/g, "");
        qb = qb.or(
          `title.ilike.%${term}%,description.ilike.%${term}%,show_notes.ilike.%${term}%,transcript.ilike.%${term}%,summary.ilike.%${term}%`,
        );
      }
      const { data } = await qb;
      let rows = (data ?? []) as PodcastCardData[];
      if (category) rows = rows.filter((p: any) => p.category?.slug === category);
      return rows;
    },
  });

  const nav = Route.useNavigate();
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nav({ search: (prev: typeof Route.types.fullSearchSchema) => ({ ...prev, q: search || undefined }) });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-6 py-12">
      <div className="space-y-2 animate-fade-up">
        <span className="text-xs uppercase tracking-widest text-[color:var(--gold)]">Episodes</span>
        <h1 className="font-display text-4xl md:text-5xl">All podcasts</h1>
        <p className="text-muted-foreground">Search titles, show notes, and full transcripts.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic, guest, or quote inside the transcript..."
            className="w-full pl-11 pr-4 py-3 rounded-full glass border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => nav({ search: { q } })} className={`px-4 py-2 rounded-full text-sm transition ${!category ? "bg-gradient-gold text-primary-foreground font-semibold" : "glass"}`}>All</button>
          {cats.data?.map((c) => (
            <button key={c.id} type="button" onClick={() => nav({ search: { q, category: c.slug } })} className={`px-4 py-2 rounded-full text-sm transition ${category === c.slug ? "bg-gradient-gold text-primary-foreground font-semibold" : "glass hover:bg-secondary"}`}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </form>

      <div className="mt-10">
        {list.isLoading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl glass animate-pulse" />
            ))}
          </div>
        ) : list.data && list.data.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {list.data.map((p) => <PodcastCard key={p.id} podcast={p} />)}
          </div>
        ) : (
          <div className="glass rounded-2xl p-16 text-center">
            <p className="text-muted-foreground">No episodes found{q ? ` for "${q}"` : ""}.</p>
            <Link to="/podcasts" className="mt-4 inline-block text-primary hover:underline">Clear filters</Link>
          </div>
        )}
      </div>
    </div>
  );
}
