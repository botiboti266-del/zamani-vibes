import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { renderMarkdown } from "@/lib/markdown";
import { useEffect } from "react";
import { ArrowLeft, Calendar, Clock, Eye } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  component: PostPage,
  head: ({ params }) => ({
    meta: [{ title: `${params.slug} — Sauti ya Zamani Blog` }, { property: "og:type", content: "article" }],
  }),
});

function PostPage() {
  const { slug } = Route.useParams();
  const q = useQuery({
    queryKey: ["post", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!q.data?.id) return;
    supabase.from("blog_posts").update({ view_count: (q.data.view_count ?? 0) + 1 }).eq("id", q.data.id).then(() => {});
  }, [q.data?.id]); // eslint-disable-line

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 space-y-4">
        <div className="h-12 w-3/4 rounded-xl bg-secondary animate-pulse" />
        <div className="h-4 w-full rounded bg-secondary animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-secondary animate-pulse" />
        <div className="aspect-video w-full rounded-2xl bg-secondary animate-pulse mt-6" />
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl mb-2">Post not found</h1>
        <Link to="/blog" className="inline-block mt-4 px-6 py-3 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine">Back to blog</Link>
      </div>
    );
  }
  const p = q.data;
  return (
    <article className="animate-fade-up">
      <header className="relative overflow-hidden border-b border-border/50">
        {p.cover_image && <img src={p.cover_image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <div className="mx-auto max-w-4xl px-4 lg:px-6 py-14 md:py-20">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to blog
          </Link>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest text-[color:var(--gold)] mb-3">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {p.reading_minutes ?? 1} min read</span>
            <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {p.view_count ?? 0} views</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl leading-tight">{p.title}</h1>
          {p.published_at && <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> {new Date(p.published_at).toLocaleDateString()}</p>}
          {p.excerpt && <p className="mt-8 text-xl text-foreground/80 italic max-w-3xl">{p.excerpt}</p>}
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 lg:px-6 py-10">
        {p.cover_image && <img src={p.cover_image} alt={p.title} className="mb-8 w-full rounded-2xl shadow-elegant" />}
        <div className="prose prose-invert max-w-none text-foreground/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.content) }} />
      </div>
      {p.tags && p.tags.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 lg:px-6 flex flex-wrap gap-2 pb-12">
          {p.tags.map((t: string) => <span key={t} className="text-xs px-3 py-1 rounded-full bg-secondary">#{t}</span>)}
        </div>
      )}
    </article>
  );
}
