import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { useAuth } from "@/hooks/use-auth";
import { renderMarkdown } from "@/lib/markdown";
import { Loader2, Image as ImageIcon, Save, Eye } from "lucide-react";

interface PostRow {
  id?: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category_id: string | null;
  tags: string[];
  status: "draft" | "scheduled" | "published";
  seo_title: string | null;
  seo_description: string | null;
  featured: boolean;
  reading_minutes: number;
}

const empty: PostRow = {
  title: "", slug: "", excerpt: "", content: "", cover_image: null,
  category_id: null, tags: [], status: "draft", seo_title: "",
  seo_description: "", featured: false, reading_minutes: 1,
};

export function BlogForm({ existing }: { existing?: PostRow }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<PostRow>(existing ?? empty);
  const [tagsInput, setTagsInput] = useState((existing?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");

  const cats = useQuery({
    queryKey: ["blog-cats"],
    queryFn: async () => (await supabase.from("blog_categories").select("*").order("name")).data ?? [],
  });

  useEffect(() => {
    if (!existing && form.title) setForm((f) => ({ ...f, slug: slugify(f.title) }));
    // eslint-disable-next-line
  }, [form.title]);

  useEffect(() => {
    const words = form.content.split(/\s+/).filter(Boolean).length;
    setForm((f) => ({ ...f, reading_minutes: Math.max(1, Math.round(words / 200)) }));
    // eslint-disable-next-line
  }, [form.content]);

  const uploadCover = async (file: File) => {
    setUploading(true);
    const path = `${user!.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, file, { contentType: file.type });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("blog-images").getPublicUrl(path);
    setForm({ ...form, cover_image: pub.publicUrl });
    setUploading(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt,
      content: form.content,
      cover_image: form.cover_image,
      category_id: form.category_id,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      status: form.status,
      seo_title: form.seo_title,
      seo_description: form.seo_description,
      featured: form.featured,
      reading_minutes: form.reading_minutes,
      author_id: user!.id,
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };
    const op = existing?.id
      ? supabase.from("blog_posts").update(payload).eq("id", existing.id)
      : supabase.from("blog_posts").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(existing ? "Saved" : "Published"); nav({ to: "/admin/blog" }); }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Field label="Title"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} /></Field>
          <Field label="Slug"><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={input} /></Field>
          <Field label="Excerpt"><textarea rows={2} value={form.excerpt ?? ""} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className={input} /></Field>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="block text-xs uppercase tracking-widest text-muted-foreground">Content (markdown)</span>
              <div className="flex gap-1 text-xs">
                <button type="button" onClick={() => setTab("write")} className={`px-3 py-1 rounded-full ${tab === "write" ? "bg-gradient-gold text-primary-foreground" : "bg-secondary"}`}>Write</button>
                <button type="button" onClick={() => setTab("preview")} className={`px-3 py-1 rounded-full inline-flex items-center gap-1 ${tab === "preview" ? "bg-gradient-gold text-primary-foreground" : "bg-secondary"}`}><Eye className="h-3 w-3" /> Preview</button>
              </div>
            </div>
            {tab === "write" ? (
              <textarea rows={20} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={`${input} font-mono text-xs`} />
            ) : (
              <div className="glass rounded-xl p-6 prose prose-invert max-w-none min-h-[400px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }} />
            )}
            <div className="text-xs text-muted-foreground mt-1">{form.reading_minutes} min read</div>
          </div>
        </div>

        <div className="space-y-5">
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className={input}>
              <option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option>
            </select>
          </Field>
          <Field label="Category">
            <select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })} className={input}>
              <option value="">— Pick —</option>
              {cats.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Cover image">
            {form.cover_image ? (
              <div className="relative aspect-video rounded-xl overflow-hidden glass">
                <img src={form.cover_image} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setForm({ ...form, cover_image: null })} className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-black/60 text-white">Remove</button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-border cursor-pointer hover:bg-secondary/30">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground">Upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
              </label>
            )}
          </Field>
          <Field label="Tags"><input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className={input} /></Field>
          <Field label="SEO title"><input value={form.seo_title ?? ""} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} className={input} /></Field>
          <Field label="SEO description"><textarea rows={2} value={form.seo_description ?? ""} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} className={input} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-border/40">
        <button type="button" onClick={() => nav({ to: "/admin/blog" })} className="px-5 py-2 rounded-full border border-border text-sm">Cancel</button>
        <button disabled={saving} className="px-6 py-2 rounded-full bg-gradient-gold text-primary-foreground font-semibold text-sm btn-shine inline-flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {existing ? "Save" : "Create"}
        </button>
      </div>
    </form>
  );
}

const input = "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm";

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>{children}</label>;
}
