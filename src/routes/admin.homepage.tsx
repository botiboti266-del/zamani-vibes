import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Home, Star, Megaphone, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/homepage")({ component: Page });

interface Homepage {
  hero: { headline: string; subheadline: string; primaryCta: string; secondaryCta: string };
  featuredPodcastIds: string[];
  banner: { enabled: boolean; text: string; linkLabel: string; linkUrl: string };
  trendingPodcastIds: string[];
}

const DEFAULT: Homepage = {
  hero: { headline: "Sauti ya Zamani", subheadline: "", primaryCta: "Listen now", secondaryCta: "Read stories" },
  featuredPodcastIds: [],
  banner: { enabled: true, text: "", linkLabel: "Browse episodes", linkUrl: "/podcasts" },
  trendingPodcastIds: [],
};

function Page() {
  const [form, setForm] = useState<Homepage>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const podcasts = useQuery({
    queryKey: ["all-podcasts"],
    queryFn: async () => (await supabase.from("podcasts").select("id,title,status").order("created_at", { ascending: false })).data ?? [],
  });

  const settings = useQuery({
    queryKey: ["site-settings", "homepage"],
    queryFn: async () => (await supabase.from("site_settings").select("value").eq("key", "homepage").maybeSingle()).data,
  });

  useEffect(() => {
    if (settings.data?.value) setForm({ ...DEFAULT, ...(settings.data.value as any) });
  }, [settings.data]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({ key: "homepage", value: form as any }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Homepage saved");
  };

  const toggleId = (key: "featuredPodcastIds" | "trendingPodcastIds", id: string) => {
    setForm((f) => ({ ...f, [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] }));
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><Home className="h-7 w-7" /> Homepage editor</h1>
          <p className="text-sm text-muted-foreground">Control the hero, featured episodes, banner, and trending slots.</p>
        </div>
        <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-full bg-gradient-gold text-primary-foreground font-semibold inline-flex items-center gap-2 btn-shine disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>

      <Card icon={Star} title="Hero">
        <Input label="Headline" value={form.hero.headline} onChange={(v) => setForm({ ...form, hero: { ...form.hero, headline: v } })} />
        <Textarea label="Subheadline" value={form.hero.subheadline} onChange={(v) => setForm({ ...form, hero: { ...form.hero, subheadline: v } })} />
        <div className="grid md:grid-cols-2 gap-3">
          <Input label="Primary CTA label" value={form.hero.primaryCta} onChange={(v) => setForm({ ...form, hero: { ...form.hero, primaryCta: v } })} />
          <Input label="Secondary CTA label" value={form.hero.secondaryCta} onChange={(v) => setForm({ ...form, hero: { ...form.hero, secondaryCta: v } })} />
        </div>
      </Card>

      <Card icon={Megaphone} title="Top banner">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.banner.enabled} onChange={(e) => setForm({ ...form, banner: { ...form.banner, enabled: e.target.checked } })} /> Show banner above the hero
        </label>
        <Input label="Banner text" value={form.banner.text} onChange={(v) => setForm({ ...form, banner: { ...form.banner, text: v } })} />
        <div className="grid md:grid-cols-2 gap-3">
          <Input label="Link label" value={form.banner.linkLabel} onChange={(v) => setForm({ ...form, banner: { ...form.banner, linkLabel: v } })} />
          <Input label="Link URL" value={form.banner.linkUrl} onChange={(v) => setForm({ ...form, banner: { ...form.banner, linkUrl: v } })} />
        </div>
      </Card>

      <Card icon={Star} title="Featured episodes" subtitle="Up to 3 shown in the hero spotlight">
        <PodcastPicker
          items={podcasts.data ?? []}
          selected={form.featuredPodcastIds}
          onToggle={(id) => toggleId("featuredPodcastIds", id)}
          max={3}
        />
      </Card>

      <Card icon={TrendingUp} title="Trending slots" subtitle="Override the auto-trending row">
        <PodcastPicker
          items={podcasts.data ?? []}
          selected={form.trendingPodcastIds}
          onToggle={(id) => toggleId("trendingPodcastIds", id)}
          max={8}
        />
      </Card>
    </div>
  );
}

function Card({ icon: Icon, title, subtitle, children }: any) {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div>
        <h2 className="font-display text-lg flex items-center gap-2"><Icon className="h-4 w-4 text-[color:var(--gold)]" /> {title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}
function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}
function PodcastPicker({ items, selected, onToggle, max }: { items: any[]; selected: string[]; onToggle: (id: string) => void; max: number }) {
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
      <p className="text-xs text-muted-foreground">{selected.length} / {max} selected</p>
      {items.map((p) => {
        const on = selected.includes(p.id);
        return (
          <button
            type="button"
            key={p.id}
            onClick={() => onToggle(p.id)}
            disabled={!on && selected.length >= max}
            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition flex items-center justify-between ${on ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10" : "border-border hover:bg-secondary disabled:opacity-40"}`}
          >
            <span className="truncate">{p.title}</span>
            <span className="text-xs text-muted-foreground ml-2">{p.status}</span>
          </button>
        );
      })}
    </div>
  );
}
