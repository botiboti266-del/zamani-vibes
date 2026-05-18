import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { Upload, Sparkles, Loader2, Image as ImageIcon, Mic } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface PodcastRow {
  id?: string;
  title: string;
  slug: string;
  description: string | null;
  show_notes: string | null;
  summary: string | null;
  transcript: string | null;
  cover_image: string | null;
  audio_url: string | null;
  duration: number | null;
  category_id: string | null;
  tags: string[];
  status: "draft" | "scheduled" | "published";
  scheduled_for: string | null;
  featured: boolean;
  trending: boolean;
}

const empty: PodcastRow = {
  title: "", slug: "", description: "", show_notes: "", summary: "", transcript: "",
  cover_image: null, audio_url: null, duration: 0, category_id: null,
  tags: [], status: "draft", scheduled_for: null, featured: false, trending: false,
};

export function PodcastForm({ existing }: { existing?: PodcastRow }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<PodcastRow>(existing ?? empty);
  const [tagsInput, setTagsInput] = useState((existing?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("podcast_categories").select("*").order("name")).data ?? [],
  });

  useEffect(() => {
    if (!existing && form.title) setForm((f) => ({ ...f, slug: slugify(f.title) }));
    // eslint-disable-next-line
  }, [form.title]);

  const uploadAudio = async (file: File) => {
    setUploadingAudio(true);
    const path = `${user!.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("podcast-audio").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { toast.error(error.message); setUploadingAudio(false); return; }
    const { data: pub } = supabase.storage.from("podcast-audio").getPublicUrl(path);
    setForm((f) => ({ ...f, audio_url: pub.publicUrl }));
    // detect duration
    const url = URL.createObjectURL(file);
    const a = new Audio(url);
    a.addEventListener("loadedmetadata", () => {
      setForm((f) => ({ ...f, duration: Math.round(a.duration) }));
      URL.revokeObjectURL(url);
    });
    setUploadingAudio(false);
    toast.success("Audio uploaded");
  };

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    const path = `${user!.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("podcast-covers").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { toast.error(error.message); setUploadingCover(false); return; }
    const { data: pub } = supabase.storage.from("podcast-covers").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image: pub.publicUrl }));
    setUploadingCover(false);
    toast.success("Cover uploaded");
  };

  const generateAI = async () => {
    if (!form.description && !form.show_notes) { toast.info("Add a description first."); return; }
    setAiBusy(true);
    try {
      const { aiSummarize } = await import("@/lib/ai.functions");
      const res = await aiSummarize({ data: { title: form.title, context: `${form.description ?? ""}\n\n${form.show_notes ?? ""}` } });
      setForm((f) => ({ ...f, summary: res.summary, tags: res.tags ?? f.tags }));
      setTagsInput((res.tags ?? form.tags).join(", "));
      toast.success("AI summary added");
    } catch (e: any) {
      toast.error(e?.message ?? "AI failed");
    } finally { setAiBusy(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      description: form.description,
      show_notes: form.show_notes,
      summary: form.summary,
      transcript: form.transcript,
      cover_image: form.cover_image,
      audio_url: form.audio_url,
      duration: form.duration,
      category_id: form.category_id,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      status: form.status,
      scheduled_for: form.scheduled_for || null,
      featured: form.featured,
      trending: form.trending,
      author_id: user!.id,
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };
    const op = existing?.id
      ? supabase.from("podcasts").update(payload).eq("id", existing.id)
      : supabase.from("podcasts").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(existing ? "Saved" : "Created"); nav({ to: "/admin/podcasts" }); }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Field label="Title">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} />
          </Field>
          <Field label="Slug">
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={input} />
          </Field>
          <Field label="Short description">
            <textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} />
          </Field>
          <Field label={<span className="flex items-center justify-between w-full"><span>Show notes (markdown)</span><button type="button" disabled={aiBusy} onClick={generateAI} className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-gold text-primary-foreground btn-shine disabled:opacity-50">{aiBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI summary</button></span>}>
            <textarea rows={10} value={form.show_notes ?? ""} onChange={(e) => setForm({ ...form, show_notes: e.target.value })} className={`${input} font-mono text-xs`} />
          </Field>
          {form.summary && (
            <Field label="AI summary">
              <textarea rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className={input} />
            </Field>
          )}
          <Field label={<span className="flex items-center justify-between w-full"><span>Transcript (searchable)</span><button type="button" disabled={aiBusy} onClick={async () => { setAiBusy(true); try { const { aiTranscript } = await import("@/lib/ai.functions"); const r = await aiTranscript({ data: { title: form.title, description: form.description ?? "", durationSeconds: form.duration ?? 0 } }); setForm((f) => ({ ...f, transcript: r.transcript })); toast.success("Transcript drafted"); } catch (e: any) { toast.error(e?.message ?? "AI failed"); } finally { setAiBusy(false); } }} className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-gold text-primary-foreground btn-shine disabled:opacity-50">{aiBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI draft</button></span>}>
            <textarea rows={8} value={form.transcript ?? ""} onChange={(e) => setForm({ ...form, transcript: e.target.value })} className={`${input} font-mono text-xs`} placeholder="HOST: Karibu...&#10;GUEST: Asante..." />
          </Field>
          <Field label="Tags (comma-separated)">
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className={input} placeholder="bongo, classics, interview" />
          </Field>
        </div>

        <div className="space-y-5">
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className={input}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </Field>
          {form.status === "scheduled" && (
            <Field label="Publish at">
              <input type="datetime-local" value={form.scheduled_for ?? ""} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} className={input} />
            </Field>
          )}
          <Field label="Category">
            <select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })} className={input}>
              <option value="">— Pick one —</option>
              {cats.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Cover image">
            {form.cover_image ? (
              <div className="relative aspect-square rounded-xl overflow-hidden glass">
                <img src={form.cover_image} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setForm({ ...form, cover_image: null })} className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-black/60 text-white">Remove</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 aspect-square rounded-xl border-2 border-dashed border-border cursor-pointer hover:bg-secondary/30 transition">
                {uploadingCover ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground">Upload cover</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
              </label>
            )}
          </Field>
          <Field label="Audio file">
            {form.audio_url ? (
              <div className="glass rounded-xl p-3 space-y-2">
                <audio ref={audioRef} src={form.audio_url} controls className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{form.duration ? `${Math.floor(form.duration / 60)}:${String(form.duration % 60).padStart(2, "0")}` : "—"}</span>
                  <button type="button" onClick={() => setForm({ ...form, audio_url: null, duration: 0 })} className="text-destructive">Replace</button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border cursor-pointer hover:bg-secondary/30 transition">
                {uploadingAudio ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground">Upload MP3 / WAV / M4A</span>
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAudio(e.target.files[0])} />
              </label>
            )}
          </Field>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.trending} onChange={(e) => setForm({ ...form, trending: e.target.checked })} /> Trending</label>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-border/40">
        <button type="button" onClick={() => nav({ to: "/admin/podcasts" })} className="px-5 py-2 rounded-full border border-border text-sm">Cancel</button>
        <button disabled={saving} className="px-6 py-2 rounded-full bg-gradient-gold text-primary-foreground font-semibold text-sm btn-shine inline-flex items-center gap-2 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}<Upload className="h-4 w-4" /> {existing ? "Save changes" : "Create podcast"}
        </button>
      </div>
    </form>
  );
}

const input = "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm";

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
