import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Globe, Share2, FileText } from "lucide-react";

export const Route = createFileRoute("/admin/seo")({ component: Page });

interface Seo {
  siteTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterHandle: string;
  canonicalUrl: string;
  sitemapEnabled: boolean;
  robots: string;
}

const DEFAULT: Seo = {
  siteTitle: "Sauti ya Zamani",
  metaDescription: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterHandle: "",
  canonicalUrl: "",
  sitemapEnabled: true,
  robots: "User-agent: *\nAllow: /\nSitemap: /sitemap.xml",
};

function Page() {
  const [form, setForm] = useState<Seo>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const settings = useQuery({
    queryKey: ["site-settings", "seo"],
    queryFn: async () => (await supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle()).data,
  });

  useEffect(() => {
    if (settings.data?.value) setForm({ ...DEFAULT, ...(settings.data.value as any) });
  }, [settings.data]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({ key: "seo", value: form as any }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("SEO settings saved");
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><Globe className="h-7 w-7" /> SEO & site customization</h1>
          <p className="text-sm text-muted-foreground">Global metadata, social cards, sitemap, and crawler rules.</p>
        </div>
        <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-full bg-gradient-gold text-primary-foreground font-semibold inline-flex items-center gap-2 btn-shine disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>

      <Card icon={Globe} title="Global metadata">
        <Input label="Site title" value={form.siteTitle} onChange={(v) => setForm({ ...form, siteTitle: v })} />
        <Textarea label="Meta description" value={form.metaDescription} onChange={(v) => setForm({ ...form, metaDescription: v })} hint={`${form.metaDescription.length} / 160`} />
        <Input label="Canonical URL" value={form.canonicalUrl} onChange={(v) => setForm({ ...form, canonicalUrl: v })} placeholder="https://yourdomain.com" />
      </Card>

      <Card icon={Share2} title="Social sharing">
        <Input label="Open Graph title" value={form.ogTitle} onChange={(v) => setForm({ ...form, ogTitle: v })} />
        <Textarea label="Open Graph description" value={form.ogDescription} onChange={(v) => setForm({ ...form, ogDescription: v })} />
        <Input label="Open Graph / Twitter image URL" value={form.ogImage} onChange={(v) => setForm({ ...form, ogImage: v })} placeholder="https://..." />
        <Input label="Twitter handle" value={form.twitterHandle} onChange={(v) => setForm({ ...form, twitterHandle: v })} placeholder="@sautiyazamani" />
        {form.ogImage && <img src={form.ogImage} alt="" className="mt-3 max-h-40 rounded-xl border border-border" />}
      </Card>

      <Card icon={FileText} title="Sitemap & robots">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.sitemapEnabled} onChange={(e) => setForm({ ...form, sitemapEnabled: e.target.checked })} />
          Publish <code className="px-1.5 py-0.5 rounded bg-secondary text-xs">/sitemap.xml</code> for crawlers
        </label>
        <label className="block">
          <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">robots.txt</span>
          <textarea rows={6} value={form.robots} onChange={(e) => setForm({ ...form, robots: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
          <span className="text-xs text-muted-foreground mt-1 block">Served at <code>/robots.txt</code>.</span>
        </label>
      </Card>
    </div>
  );
}

function Card({ icon: Icon, title, children }: any) {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <h2 className="font-display text-lg flex items-center gap-2"><Icon className="h-4 w-4 text-[color:var(--gold)]" /> {title}</h2>
      {children}
    </div>
  );
}
function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}
function Textarea({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
        <span>{label}</span>{hint && <span className="normal-case tracking-normal">{hint}</span>}
      </span>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}
