import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Eye, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/podcasts/")({
  component: PodcastsList,
});


function PodcastsList() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-podcasts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("podcasts")
        .select("id,title,slug,status,listen_count,published_at,created_at, category:podcast_categories(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const del = async (id: string) => {
    if (!confirm("Delete this podcast permanently?")) return;
    const { error } = await supabase.from("podcasts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-podcasts"] }); }
  };

  const notify = async (id: string, title: string) => {
    if (!confirm(`Email all confirmed subscribers about "${title}"?`)) return;
    const t = toast.loading("Sending emails…");
    const r = await supabase.functions.invoke("notify-new-episode", { body: { podcast_id: id } });
    toast.dismiss(t);
    if (r.error) toast.error(r.error.message);
    else toast.success(`Sent to ${r.data?.sent ?? 0} subscriber(s)`);
  };


  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Podcasts</h1>
          <p className="text-sm text-muted-foreground">Drafts, scheduled, and published episodes.</p>
        </div>
        <Link to="/admin/podcasts/new" className="px-4 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine inline-flex items-center gap-1">
          <Plus className="h-4 w-4" /> New podcast
        </Link>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="text-left p-3">Title</th><th className="text-left p-3">Category</th><th className="text-left p-3">Status</th><th className="text-left p-3">Listens</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {q.data?.map((p: any) => (
              <tr key={p.id} className="hover:bg-secondary/30">
                <td className="p-3 font-medium">{p.title}</td>
                <td className="p-3 text-muted-foreground">{p.category?.name ?? "—"}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${p.status === "published" ? "bg-green-500/20 text-green-300" : p.status === "scheduled" ? "bg-blue-500/20 text-blue-300" : "bg-secondary"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{p.listen_count}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    {p.status === "published" && (
                      <>
                        <Link to="/podcasts/$slug" params={{ slug: p.slug }} className="p-2 rounded-lg hover:bg-secondary" title="View"><Eye className="h-4 w-4" /></Link>
                        <button onClick={() => notify(p.id, p.title)} className="p-2 rounded-lg hover:bg-secondary text-[color:var(--gold)]" title="Email subscribers"><Mail className="h-4 w-4" /></button>
                      </>
                    )}
                    <Link to="/admin/podcasts/$id" params={{ id: p.id }} className="p-2 rounded-lg hover:bg-secondary" title="Edit"><Edit className="h-4 w-4" /></Link>
                    <button onClick={() => del(p.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>

              </tr>
            ))}
            {q.data && q.data.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No podcasts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
