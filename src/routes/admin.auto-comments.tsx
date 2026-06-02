import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Play, Pause, Save, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/auto-comments")({ component: AutoComments });

const SETTING_KEY = "auto_comment_style";

function AutoComments() {
  const qc = useQueryClient();
  const [style, setStyle] = useState("");

  const styleQ = useQuery({
    queryKey: ["site-setting", SETTING_KEY],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
      const s = ((data?.value as any)?.text ?? "") as string;
      setStyle(s);
      return s;
    },
  });

  const podcasts = useQuery({
    queryKey: ["pub-podcasts-ac"],
    queryFn: async () => (await supabase.from("podcasts").select("id,title,slug").eq("status", "published").order("published_at", { ascending: false })).data ?? [],
  });

  const schedules = useQuery({
    queryKey: ["comment-schedules"],
    queryFn: async () => (await supabase.from("podcast_comment_schedules").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const bots = useQuery({
    queryKey: ["comment-bots"],
    queryFn: async () => (await supabase.from("comment_bots").select("*").order("country").order("display_name")).data ?? [],
  });

  const recent = useQuery({
    queryKey: ["recent-bot-comments"],
    queryFn: async () => (await supabase.from("podcast_comments").select("id,content,created_at,bot_id,podcast_id,bot:comment_bots(display_name,country)").not("bot_id", "is", null).order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  const [newPodcast, setNewPodcast] = useState("");
  const [newInterval, setNewInterval] = useState(60);

  const saveStyle = async () => {
    const { error } = await supabase.from("site_settings").upsert({ key: SETTING_KEY, value: { text: style }, private: false }, { onConflict: "key" });
    if (error) toast.error(error.message); else { toast.success("Style saved"); qc.invalidateQueries({ queryKey: ["site-setting", SETTING_KEY] }); }
  };

  const addSchedule = async () => {
    if (!newPodcast) return;
    const { error } = await supabase.from("podcast_comment_schedules").insert({
      podcast_id: newPodcast, interval_minutes: newInterval, enabled: true, next_run_at: new Date().toISOString(),
    });
    if (error) toast.error(error.message); else { toast.success("Scheduled"); setNewPodcast(""); qc.invalidateQueries({ queryKey: ["comment-schedules"] }); }
  };

  const toggle = async (id: string, enabled: boolean) => {
    await supabase.from("podcast_comment_schedules").update({ enabled: !enabled }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["comment-schedules"] });
  };

  const updateInterval = async (id: string, v: number) => {
    await supabase.from("podcast_comment_schedules").update({ interval_minutes: v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["comment-schedules"] });
  };

  const removeSchedule = async (id: string) => {
    if (!confirm("Remove this schedule?")) return;
    await supabase.from("podcast_comment_schedules").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["comment-schedules"] });
  };

  const runNow = async () => {
    const r = await supabase.functions.invoke("run-comment-bots");
    if (r.error) toast.error(r.error.message); else toast.success(`Posted ${r.data?.processed ?? 0} comment(s)`);
    qc.invalidateQueries();
  };

  const deleteBotComment = async (id: string) => {
    await supabase.from("podcast_comments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["recent-bot-comments"] });
  };

  const podMap = new Map((podcasts.data ?? []).map((p: any) => [p.id, p.title]));

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><Bot className="h-7 w-7" /> Auto-comment bots</h1>
          <p className="text-sm text-muted-foreground">AI-generated listener voices from Kenya, Tanzania, and Uganda.</p>
        </div>
        <button onClick={runNow} className="px-4 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine inline-flex items-center gap-1">
          <Sparkles className="h-4 w-4" /> Run now
        </button>
      </div>

      <section className="glass rounded-2xl p-5">
        <h2 className="font-display text-lg mb-2">Brand voice / style prompt</h2>
        <textarea value={style} onChange={(e) => setStyle(e.target.value)} rows={4}
          placeholder="e.g. Warm, nostalgic, Swahili greetings, references to 90s East African music…"
          className="w-full p-3 rounded-xl glass border border-border text-sm" />
        <button onClick={saveStyle} className="mt-2 inline-flex items-center gap-1 px-4 py-2 rounded-full bg-secondary hover:bg-gradient-gold hover:text-primary-foreground text-sm font-semibold">
          <Save className="h-4 w-4" /> Save style
        </button>
      </section>

      <section className="glass rounded-2xl p-5 space-y-4">
        <h2 className="font-display text-lg">Schedules</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <select value={newPodcast} onChange={(e) => setNewPodcast(e.target.value)} className="px-3 py-2 rounded-lg bg-secondary text-sm">
            <option value="">Select podcast…</option>
            {(podcasts.data ?? []).filter((p: any) => !(schedules.data ?? []).some((s: any) => s.podcast_id === p.id)).map((p: any) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <label className="text-xs text-muted-foreground">Every
            <input type="number" min={5} value={newInterval} onChange={(e) => setNewInterval(Number(e.target.value))} className="ml-2 w-20 px-2 py-1 rounded bg-secondary text-sm" /> min
          </label>
          <button onClick={addSchedule} className="px-3 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-semibold">Add</button>
        </div>
        <ul className="divide-y divide-border/40">
          {(schedules.data ?? []).map((s: any) => (
            <li key={s.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{podMap.get(s.podcast_id) ?? s.podcast_id}</div>
                <div className="text-xs text-muted-foreground">Posted {s.total_posted} · next {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : "—"}</div>
              </div>
              <input type="number" min={5} value={s.interval_minutes} onChange={(e) => updateInterval(s.id, Number(e.target.value))} className="w-20 px-2 py-1 rounded bg-secondary text-sm" />
              <button onClick={() => toggle(s.id, s.enabled)} className={`px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1 ${s.enabled ? "bg-green-500/20 text-green-300" : "bg-secondary"}`}>
                {s.enabled ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
              </button>
              <button onClick={() => removeSchedule(s.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
          {(schedules.data ?? []).length === 0 && <li className="py-8 text-center text-muted-foreground text-sm">No schedules yet.</li>}
        </ul>
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="font-display text-lg mb-3">Bot identities ({bots.data?.length ?? 0})</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {(bots.data ?? []).map((b: any) => (
            <div key={b.id} className="px-3 py-2 rounded-lg bg-secondary text-sm flex items-center justify-between">
              <span>{b.display_name}</span>
              <span className="text-xs text-[color:var(--gold)]">{b.country}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="font-display text-lg mb-3">Recent auto-comments</h2>
        <ul className="divide-y divide-border/40">
          {(recent.data ?? []).map((c: any) => (
            <li key={c.id} className="py-3 flex items-start gap-3">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  <strong>{c.bot?.display_name}</strong> <span className="text-[color:var(--gold)]">{c.bot?.country}</span> · {new Date(c.created_at).toLocaleString()}
                </div>
                <p className="text-sm mt-1">{c.content}</p>
              </div>
              <button onClick={() => deleteBotComment(c.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
          {(recent.data ?? []).length === 0 && <li className="py-8 text-center text-muted-foreground text-sm">No auto-comments yet. Click "Run now" to test.</li>}
        </ul>
      </section>
    </div>
  );
}
