import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/news/")({
  component: NewsList,
  head: () => ({
    meta: [
      { title: "News — Zamani Vibes" },
      { name: "description", content: "Latest news and announcements from Zamani Vibes." },
    ],
  }),
});

function NewsList() {
  const q = useQuery({
    queryKey: ["news-list"],
    queryFn: async () => (await supabase.from("news").select("id,title,slug,excerpt,cover_image,published_at,tags").eq("status", "published").order("published_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 lg:py-16">
      <header className="mb-10">
        <div className="text-xs uppercase tracking-widest text-[color:var(--gold)]">Latest</div>
        <h1 className="font-display text-4xl md:text-5xl mt-1">News</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Announcements, updates and stories from the Zamani Vibes studio.</p>
      </header>
      {q.isLoading && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-2xl bg-secondary animate-pulse" />)}</div>}
      {q.data?.length === 0 && <p className="text-muted-foreground text-center py-20">No news yet. Check back soon.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {q.data?.map((n: any) => (
          <Link key={n.id} to="/news/$slug" params={{ slug: n.slug }} className="glass rounded-2xl overflow-hidden hover:shadow-elegant transition group">
            {n.cover_image ? (
              <img src={n.cover_image} alt="" className="aspect-video w-full object-cover group-hover:scale-[1.02] transition" />
            ) : <div className="aspect-video w-full bg-gradient-gold" />}
            <div className="p-4 space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-[color:var(--gold)] inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {n.published_at ? new Date(n.published_at).toLocaleDateString() : ""}
              </div>
              <h2 className="font-display text-lg leading-snug">{n.title}</h2>
              {n.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{n.excerpt}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
