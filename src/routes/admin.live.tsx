import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/live")({ component: LiveAdmin });

interface LiveState {
  active: boolean;
  title: string;
  subtitle: string;
  stream_url: string;
  started_at: string | null;
}

const DEFAULT: LiveState = { active: false, title: "Live from the Studio", subtitle: "", stream_url: "", started_at: null };

function LiveAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<LiveState>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["site-settings", "live_stream"],
    queryFn: async () => (await supabase.from("site_settings").select("value").eq("key", "live_stream").maybeSingle()).data,
  });

  useEffect(() => { if (q.data?.value) setForm({ ...DEFAULT, ...(q.data.value as any) }); }, [q.data]);

  const save = async (overrides?: Partial<LiveState>) => {
    setSaving(true);
    const next = { ...form, ...overrides };
    if (next.active && !next.started_at) next.started_at = new Date().toISOString();
    if (!next.active) next.started_at = null;
    const { error } = await supabase.from("site_settings").upsert({ key: "live_stream", value: next as any }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    setForm(next);
    qc.invalidateQueries({ queryKey: ["site-settings", "live_stream"] });
    qc.invalidateQueries({ queryKey: ["live-banner"] });
    toast.success(next.active ? "You are LIVE on air" : "Saved");
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div>
        <h1 className="font-display text-3xl flex items-center gap-2"><Radio className="h-7 w-7 text-red-500" /> Live broadcast</h1>
        <p className="text-sm text-muted-foreground">Switch the studio LIVE and listeners on the public site will see a pulsing icon that joins your stream.</p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/40">
          <div>
            <div className="font-display text-lg flex items-center gap-2">
              {form.active && <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>}
              {form.active ? "ON AIR" : "Off air"}
            </div>
            <div className="text-xs text-muted-foreground">
              {form.active ? `Started ${form.started_at ? new Date(form.started_at).toLocaleString() : ""}` : "Toggle to go live"}
            </div>
          </div>
          <button
            onClick={() => save({ active: !form.active })}
            disabled={saving || (!form.active && !form.stream_url)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 ${form.active ? "bg-destructive text-destructive-foreground" : "bg-gradient-gold text-primary-foreground btn-shine"} disabled:opacity-50`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            {form.active ? "Stop live" : "Go live"}
          </button>
        </div>

        <Field label="Live title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
        </Field>
        <Field label="Subtitle / show notes (optional)">
          <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
        </Field>
        <Field label="Stream URL (HLS .m3u8, Icecast, or direct audio stream)">
          <input value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} placeholder="https://stream.example.com/live.m3u8" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm" />
          <p className="text-xs text-muted-foreground mt-1">Paste the public listener URL from your encoder (OBS, BUTT, Restream, Icecast). Listeners click the on-air icon and the audio plays in their browser.</p>
        </Field>

        <div className="flex justify-end">
          <button onClick={() => save()} disabled={saving} className="px-5 py-2.5 rounded-full bg-secondary text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" /> Save settings
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
