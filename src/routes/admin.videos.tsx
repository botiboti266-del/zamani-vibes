import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Eye, X, Film, Tv2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { VideoPlayer } from "@/components/video/video-player";
import { detectSource, getThumbnail } from "@/lib/video-embed";

export const Route = createFileRoute("/admin/videos")({ component: VideosAdmin });

type Row = {
  id: string; title: string; slug: string; description: string | null;
  source_type: "upload" | "youtube" | "vimeo" | "url"; source_url: string;
  thumbnail: string | null; duration: number | null; is_short: boolean;
  status: string; scheduled_for: string | null; published_at: string | null;
  tags: string[] | null; view_count: number; created_at: string;
};

function VideosAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const q = useQuery({
    queryKey: ["admin-videos"],
    queryFn: async () => {
      const r = await (supabase as any).from("videos").select("*").order("created_at", { ascending: false });
      return (r.data ?? []) as Row[];
    },
  });

  const del = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    const { error } = await (supabase as any).from("videos").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-videos"] }); }
  };

  const save = async (status: "draft" | "scheduled" | "published") => {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.source_url?.trim()) return toast.error("Title and source URL required");
    const slug = editing.slug?.trim() || slugify(editing.title);
    const source_type = editing.source_type || detectSource(editing.source_url);
    const payload: any = {
      title: editing.title.trim(),
      slug,
      description: editing.description ?? null,
      source_type,
      source_url: editing.source_url.trim(),
      thumbnail: editing.thumbnail || getThumbnail(editing.source_url, source_type),
      duration: editing.duration ?? null,
      is_short: editing.is_short ?? false,
      tags: editing.tags ?? [],
      scheduled_for: status === "scheduled" ? editing.scheduled_for : null,
      status,
      published_at: status === "published" ? (editing.published_at ?? new Date().toISOString()) : editing.published_at ?? null,
    };
    const op = editing.id
      ? (supabase as any).from("videos").update(payload).eq("id", editing.id)
      : (supabase as any).from("videos").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Published" : "Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-videos"] });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><Film className="h-7 w-7" /> Videos</h1>
          <p className="text-sm text-muted-foreground">Manage videos and shorts from YouTube, Vimeo, or direct URLs. They appear under <em>Videos</em> on the public site.</p>
        </div>
        <button
          onClick={() => setEditing({ title: "", source_url: "", source_type: "youtube", is_short: false, tags: [] })}
          className="px-4 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine inline-flex items-center gap-1"
        ><Plus className="h-4 w-4" /> New video</button>
      </div>

      <div className="glass rounded-2xl divide-y divide-border/60">
        {q.isLoading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {q.data?.length === 0 && <div className="p-6 text-sm text-muted-foreground">No videos yet.</div>}
        {q.data?.map((v) => {
          const thumb = v.thumbnail || getThumbnail(v.source_url, v.source_type);
          return (
            <div key={v.id} className="p-4 flex items-center gap-4">
              <div className={`shrink-0 ${v.is_short ? "w-12 h-20" : "w-24 h-14"} bg-secondary rounded-md overflow-hidden`}>
                {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Film className="h-5 w-5 text-muted-foreground" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base truncate">{v.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-secondary uppercase tracking-widest">{v.source_type}</span>
                  <span className={`px-2 py-0.5 rounded-full ${v.status === "published" ? "bg-emerald-500/20 text-emerald-400" : v.status === "scheduled" ? "bg-amber-500/20 text-amber-400" : "bg-secondary"}`}>{v.status}</span>
                  {v.is_short && <span className="px-2 py-0.5 rounded-full bg-[color:var(--gold)]/20 text-[color:var(--gold)]">Short</span>}
                  <span>{v.view_count} views</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {v.status === "published" && (
                  <a href={`/videos/${v.slug}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-secondary" title="View"><Eye className="h-4 w-4" /></a>
                )}
                <button onClick={() => setEditing(v)} className="p-2 rounded-lg hover:bg-secondary"><Edit className="h-4 w-4" /></button>
                <button onClick={() => del(v.id)} className="p-2 rounded-lg hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && <Editor editing={editing} setEditing={setEditing} save={save} />}
    </div>
  );
}

function Editor({ editing, setEditing, save }: { editing: Partial<Row>; setEditing: (v: Partial<Row> | null) => void; save: (s: "draft" | "scheduled" | "published") => void }) {
  const [tagInput, setTagInput] = useState("");
  useEffect(() => {
    if (editing.source_url && !editing.source_type) {
      setEditing({ ...editing, source_type: detectSource(editing.source_url) });
    }
  }, [editing.source_url]);

  const url = editing.source_url || "";
  const type = editing.source_type || detectSource(url);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4">
        <div className="glass rounded-2xl max-w-3xl w-full p-6 space-y-4 my-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">{editing.id ? "Edit video" : "New video"}</h2>
            <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>

          <Field label="Title">
            <input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
          </Field>

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Slug">
              <input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
            </Field>
            <Field label="Source type">
              <select value={type} onChange={(e) => setEditing({ ...editing, source_type: e.target.value as any })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm">
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="upload">Uploaded / MP4</option>
                <option value="url">Other URL</option>
              </select>
            </Field>
          </div>

          <Field label={<span className="flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Source URL (YouTube, Vimeo, or .mp4)</span>}>
            <input value={url} onChange={(e) => setEditing({ ...editing, source_url: e.target.value, source_type: detectSource(e.target.value) })} placeholder="https://youtu.be/… or https://vimeo.com/… or https://…/video.mp4" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
          </Field>

          <Field label="Description">
            <textarea rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
          </Field>

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Thumbnail URL (optional)">
              <input value={editing.thumbnail || ""} onChange={(e) => setEditing({ ...editing, thumbnail: e.target.value })} placeholder="Auto-detected for YouTube" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
            </Field>
            <Field label="Duration (seconds, optional)">
              <input type="number" value={editing.duration ?? ""} onChange={(e) => setEditing({ ...editing, duration: e.target.value ? Number(e.target.value) : null })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!editing.is_short} onChange={(e) => setEditing({ ...editing, is_short: e.target.checked })} /> Mark as Short (vertical 9:16)
          </label>

          <Field label="Tags">
            <div className="flex flex-wrap items-center gap-1.5 px-2 py-2 rounded-xl bg-secondary border border-border">
              {(editing.tags || []).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background text-xs">
                  {t}
                  <button onClick={() => setEditing({ ...editing, tags: (editing.tags || []).filter((x) => x !== t) })}><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    setEditing({ ...editing, tags: [...(editing.tags || []), tagInput.trim()] });
                    setTagInput("");
                  }
                }}
                placeholder="Add tag…"
                className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none"
              />
            </div>
          </Field>

          <Field label="Schedule (optional)">
            <input type="datetime-local" value={editing.scheduled_for ? editing.scheduled_for.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
          </Field>

          {url && (
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Preview</div>
              <div className={`overflow-hidden rounded-xl ${editing.is_short ? "max-w-[200px] aspect-[9/16]" : "aspect-video"}`}>
                <VideoPlayer url={url} sourceType={type} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <button onClick={() => save("draft")} className="px-4 py-2 rounded-full bg-secondary text-sm">Save draft</button>
            <button onClick={() => save("scheduled")} disabled={!editing.scheduled_for} className="px-4 py-2 rounded-full bg-secondary text-sm disabled:opacity-50">Schedule</button>
            <button onClick={() => save("published")} className="px-5 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine inline-flex items-center gap-1"><Tv2 className="h-4 w-4" /> Publish</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
