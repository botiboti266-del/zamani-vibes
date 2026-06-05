import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Eye, Mail, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/admin/news")({ component: NewsAdmin });

type NewsRow = {
  id: string; title: string; slug: string; status: string;
  excerpt: string | null; content: string; cover_image: string | null;
  tags: string[] | null; scheduled_for: string | null; published_at: string | null;
  created_at: string;
};

function NewsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<NewsRow> | null>(null);

  const q = useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => (await supabase.from("news").select("*").order("created_at", { ascending: false })).data as NewsRow[] | null ?? [],
  });

  const del = async (id: string) => {
    if (!confirm("Delete news item?")) return;
    const { error } = await supabase.from("news").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-news"] }); }
  };

  const notify = async (id: string, title: string) => {
    if (!confirm(`Email all confirmed subscribers about "${title}"?`)) return;
    const t = toast.loading("Sending emails…");
    const r = await supabase.functions.invoke("notify-new-news", { body: { news_id: id } });
    toast.dismiss(t);
    if (r.error) toast.error(r.error.message);
    else toast.success(`Sent to ${r.data?.sent ?? 0} subscriber(s)`);
  };

  const save = async (status: "draft" | "scheduled" | "published") => {
    if (!editing) return;
    const slug = editing.slug?.trim() || slugify(editing.title || "");
    if (!editing.title || !slug) return toast.error("Title and slug required");
    const payload: any = {
      title: editing.title,
      slug,
      excerpt: editing.excerpt ?? null,
      content: editing.content ?? "",
      cover_image: editing.cover_image ?? null,
      tags: editing.tags ?? [],
      scheduled_for: status === "scheduled" ? editing.scheduled_for : null,
      status,
      published_at: status === "published" ? new Date().toISOString() : editing.published_at ?? null,
    };
    const op = editing.id
      ? supabase.from("news").update(payload).eq("id", editing.id)
      : supabase.from("news").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Published — subscribers being emailed" : "Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-news"] });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">News</h1>
          <p className="text-sm text-muted-foreground">Create, schedule, and publish news items. Publishing auto-emails subscribers.</p>
        </div>
        <button
          onClick={() => setEditing({ title: "", slug: "", content: "", excerpt: "", tags: [] })}
          className="px-4 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine inline-flex items-center gap-1"
        ><Plus className="h-4 w-4" /> New item</button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Scheduled / Published</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {q.data?.map((n) => (
              <tr key={n.id} className="hover:bg-secondary/30">
                <td className="p-3 font-medium">{n.title}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${n.status === "published" ? "bg-green-500/20 text-green-300" : n.status === "scheduled" ? "bg-blue-500/20 text-blue-300" : "bg-secondary"}`}>{n.status}</span>
                </td>
                <td className="p-3 text-muted-foreground text-xs">
                  {n.published_at ? new Date(n.published_at).toLocaleString() : n.scheduled_for ? `📅 ${new Date(n.scheduled_for).toLocaleString()}` : "—"}
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    {n.status === "published" && (
                      <Link to="/news/$slug" params={{ slug: n.slug }} className="p-2 rounded-lg hover:bg-secondary"><Eye className="h-4 w-4" /></Link>
                    )}
                    {n.status === "published" && (
                      <button onClick={() => notify(n.id, n.title)} className="p-2 rounded-lg hover:bg-secondary text-[color:var(--gold)]" title="Email subscribers"><Mail className="h-4 w-4" /></button>
                    )}
                    <button onClick={() => setEditing(n)} className="p-2 rounded-lg hover:bg-secondary"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => del(n.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No news items yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-3xl my-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{editing.id ? "Edit news" : "New news item"}</h2>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm sm:col-span-2">
                <span className="text-muted-foreground">Title</span>
                <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Slug</span>
                <input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Cover image URL</span>
                <input value={editing.cover_image ?? ""} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-muted-foreground">Excerpt</span>
                <textarea value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-muted-foreground">Content (Markdown)</span>
                <textarea value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={10} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border font-mono text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Tags (comma-separated)</span>
                <input
                  value={(editing.tags ?? []).join(", ")}
                  onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Schedule for</span>
                <input
                  type="datetime-local"
                  value={editing.scheduled_for ? new Date(editing.scheduled_for).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 justify-end">
              <button onClick={() => save("draft")} className="px-4 py-2 rounded-full bg-secondary text-sm">Save draft</button>
              <button onClick={() => save("scheduled")} disabled={!editing.scheduled_for} className="px-4 py-2 rounded-full bg-blue-500/20 text-blue-200 text-sm disabled:opacity-40">Schedule</button>
              <button onClick={() => save("published")} className="px-4 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine">Publish now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
