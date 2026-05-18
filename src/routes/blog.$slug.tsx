import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { renderMarkdown } from "@/lib/markdown";
import { useEffect } from "react";

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
    <article className="mx-auto max-w-3xl px-4 lg:px-6 py-12 animate-fade-up">
      <div className="text-xs uppercase tracking-widest text-[color:var(--gold)] mb-2">{p.reading_minutes ?? 1} min read</div>
      <h1 className="font-display text-4xl md:text-5xl leading-tight">{p.title}</h1>
      {p.published_at && <p className="mt-2 text-sm text-muted-foreground">{new Date(p.published_at).toLocaleDateString()}</p>}
      {p.cover_image && <img src={p.cover_image} alt={p.title} className="mt-8 w-full rounded-2xl shadow-elegant" />}
      {p.excerpt && <p className="mt-8 text-xl text-muted-foreground italic">{p.excerpt}</p>}
      <div className="mt-8 prose prose-invert max-w-none text-foreground/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.content) }} />
      {p.tags && p.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-10">
          {p.tags.map((t: string) => <span key={t} className="text-xs px-3 py-1 rounded-full bg-secondary">#{t}</span>)}
        </div>
      )}
    </article>
  );
}
