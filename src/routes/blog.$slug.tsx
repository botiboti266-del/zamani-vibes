import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      if (!data) throw notFound();
      return data;
    },
  });
  if (!q.data) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Loading...</div>;
  const p = q.data;
  return (
    <article className="mx-auto max-w-3xl px-4 lg:px-6 py-12 animate-fade-up">
      <div className="text-xs uppercase tracking-widest text-[color:var(--gold)] mb-2">{p.reading_minutes ?? 1} min read</div>
      <h1 className="font-display text-4xl md:text-5xl leading-tight">{p.title}</h1>
      {p.published_at && <p className="mt-2 text-sm text-muted-foreground">{new Date(p.published_at).toLocaleDateString()}</p>}
      {p.cover_image && <img src={p.cover_image} alt={p.title} className="mt-8 w-full rounded-2xl shadow-elegant" />}
      {p.excerpt && <p className="mt-8 text-xl text-muted-foreground italic">{p.excerpt}</p>}
      <div className="mt-8 prose prose-invert max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">{p.content}</div>
    </article>
  );
}
