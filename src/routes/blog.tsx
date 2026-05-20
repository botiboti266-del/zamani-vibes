import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog")({
  component: BlogRouteShell,
  head: () => ({
    meta: [
      { title: "Blog — Sauti ya Zamani" },
      { name: "description", content: "Stories, interviews, and reflections on East African music culture." },
      { property: "og:title", content: "Blog — Sauti ya Zamani" },
      { property: "og:description", content: "Stories, interviews, and reflections on East African music culture." },
    ],
  }),
});

function BlogRouteShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/blog") return <Outlet />;
  return <BlogIndex />;
}

function BlogIndex() {
  const { data } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => (await supabase.from("blog_posts").select("*").eq("status", "published").order("published_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-6 py-12">
      <div className="space-y-2 animate-fade-up">
        <span className="text-xs uppercase tracking-widest text-[color:var(--gold)]">Words</span>
        <h1 className="font-display text-4xl md:text-5xl">From the blog</h1>
        <p className="text-muted-foreground">Reading material between episodes.</p>
      </div>

      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.map((p) => (
          <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="card-3d glass rounded-2xl overflow-hidden group">
            {p.cover_image && <img src={p.cover_image} alt={p.title} loading="lazy" className="aspect-video w-full object-cover" />}
            <div className="p-5">
              <h2 className="font-display text-xl group-hover:text-primary transition">{p.title}</h2>
              {p.excerpt && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.excerpt}</p>}
              <div className="text-xs text-muted-foreground mt-3">{p.reading_minutes ?? 1} min read · {p.published_at && new Date(p.published_at).toLocaleDateString()}</div>
            </div>
          </Link>
        ))}
        {data && data.length === 0 && (
          <div className="md:col-span-3 glass rounded-2xl p-12 text-center text-muted-foreground">
            No posts published yet. Stories are brewing — come back soon.
          </div>
        )}
      </div>
    </div>
  );
}
