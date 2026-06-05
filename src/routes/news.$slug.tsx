import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { renderMarkdown } from "@/lib/markdown";
import { ArrowLeft, Calendar } from "lucide-react";

export const Route = createFileRoute("/news/$slug")({
  component: NewsPage,
  head: ({ params }) => ({
    meta: [{ title: `${params.slug} — Zamani Vibes News` }, { property: "og:type", content: "article" }],
  }),
});

function NewsPage() {
  const { slug } = Route.useParams();
  const q = useQuery({
    queryKey: ["news", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("news").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (q.isLoading) return <div className="mx-auto max-w-3xl px-4 py-20"><div className="h-12 w-3/4 rounded-xl bg-secondary animate-pulse" /></div>;
  if (!q.data) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><p className="text-muted-foreground">News item not found.</p><Link to="/news" className="text-[color:var(--gold)] underline mt-3 inline-block">← Back to news</Link></div>;

  const n = q.data;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      <Link to="/news" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-[color:var(--gold)]"><ArrowLeft className="h-4 w-4" /> Back to news</Link>
      <header className="mt-6 space-y-3">
        <div className="text-xs uppercase tracking-widest text-[color:var(--gold)] inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {n.published_at ? new Date(n.published_at).toLocaleDateString() : ""}</div>
        <h1 className="font-display text-4xl md:text-5xl">{n.title}</h1>
        {n.excerpt && <p className="text-muted-foreground text-lg">{n.excerpt}</p>}
      </header>
      {n.cover_image && <img src={n.cover_image} alt="" className="w-full rounded-2xl mt-6 aspect-video object-cover shadow-elegant" />}
      <div className="prose prose-invert mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(n.content || "") }} />
    </article>
  );
}
