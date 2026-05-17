import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/comments")({
  component: Comments,
});

function Comments() {
  const qc = useQueryClient();
  const podcasts = useQuery({
    queryKey: ["mod-podcast-comments"],
    queryFn: async () => (await supabase.from("podcast_comments").select("id,content,created_at,podcast:podcasts(title,slug)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const blog = useQuery({
    queryKey: ["mod-blog-comments"],
    queryFn: async () => (await supabase.from("blog_comments").select("id,content,created_at,post:blog_posts(title,slug)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const del = async (table: "podcast_comments" | "blog_comments", id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries(); }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div><h1 className="font-display text-3xl flex items-center gap-2"><MessageCircle className="h-7 w-7" /> Comment moderation</h1></div>
      <Section title="Podcast comments" items={podcasts.data ?? []} onDelete={(id) => del("podcast_comments", id)} hrefKey="podcast" />
      <Section title="Blog comments" items={blog.data ?? []} onDelete={(id) => del("blog_comments", id)} hrefKey="post" />
    </div>
  );
}

function Section({ title, items, onDelete, hrefKey }: any) {
  return (
    <section>
      <h2 className="font-display text-xl mb-3">{title}</h2>
      <div className="glass rounded-2xl divide-y divide-border/40">
        {items.map((c: any) => (
          <div key={c.id} className="p-4 flex items-start gap-3 justify-between">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">on "{c[hrefKey]?.title ?? "—"}" · {new Date(c.created_at).toLocaleString()}</div>
              <p className="text-sm mt-1 break-words">{c.content}</p>
            </div>
            <button onClick={() => onDelete(c.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive shrink-0"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {items.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No comments yet.</div>}
      </div>
    </section>
  );
}
