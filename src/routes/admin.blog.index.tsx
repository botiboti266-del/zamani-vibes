import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blog/")({
  component: BlogList,
});

function BlogList() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async () => (await supabase.from("blog_posts").select("id,title,slug,status,view_count,created_at, category:blog_categories(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const del = async (id: string) => {
    if (!confirm("Delete post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-blog"] }); }
  };
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-3xl">Blog</h1><p className="text-sm text-muted-foreground">Articles, drafts, and scheduled posts.</p></div>
        <Link to="/admin/blog/new" className="px-4 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine inline-flex items-center gap-1"><Plus className="h-4 w-4" /> New post</Link>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="text-left p-3">Title</th><th className="text-left p-3">Category</th><th className="text-left p-3">Status</th><th className="text-left p-3">Views</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {q.data?.map((p: any) => (
              <tr key={p.id} className="hover:bg-secondary/30">
                <td className="p-3 font-medium">{p.title}</td>
                <td className="p-3 text-muted-foreground">{p.category?.name ?? "—"}</td>
                <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${p.status === "published" ? "bg-green-500/20 text-green-300" : "bg-secondary"}`}>{p.status}</span></td>
                <td className="p-3 text-muted-foreground">{p.view_count}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    {p.status === "published" && <Link to="/blog/$slug" params={{ slug: p.slug }} className="p-2 rounded-lg hover:bg-secondary"><Eye className="h-4 w-4" /></Link>}
                    <Link to="/admin/blog/$id" params={{ id: p.id }} className="p-2 rounded-lg hover:bg-secondary"><Edit className="h-4 w-4" /></Link>
                    <button onClick={() => del(p.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No posts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
