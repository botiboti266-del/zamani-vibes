import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePlayer } from "@/components/player/player-context";
import { Clock, Headphones, Heart, Play, Search, Trash2, ListMusic } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "My listening — Sauti ya Zamani" }, { name: "robots", content: "noindex" }] }),
});

function HistoryPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const player = usePlayer();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "in_progress" | "completed">("all");

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  const history = useQuery({
    queryKey: ["history-page", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("listening_history")
        .select("*, podcast:podcasts(id,title,slug,cover_image,audio_url,duration,listen_count)")
        .eq("user_id", user!.id)
        .order("last_played_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const likedQ = useQuery({
    queryKey: ["liked-page", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("podcast_likes")
        .select("created_at, podcast:podcasts(id,title,slug,cover_image,audio_url,duration)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!user) return null;

  const rowsAll = (history.data ?? []).filter((h: any) => h.podcast);
  const totalMinutes = Math.round(rowsAll.reduce((s, h: any) => s + (h.position_seconds || 0), 0) / 60);
  const completedCount = rowsAll.filter((h: any) => h.completed).length;

  const filtered = rowsAll.filter((h: any) => {
    if (tab === "in_progress" && h.completed) return false;
    if (tab === "completed" && !h.completed) return false;
    if (search && !h.podcast.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const resume = (h: any) => {
    if (!h.podcast.audio_url) { toast.error("No audio attached"); return; }
    player.play({
      id: h.podcast.id, title: h.podcast.title, audioUrl: h.podcast.audio_url,
      coverImage: h.podcast.cover_image, slug: h.podcast.slug,
    });
  };

  const queueAll = () => {
    const items = filtered.filter((h: any) => h.podcast.audio_url).slice(0, 30);
    if (items.length === 0) return;
    const [first, ...rest] = items as any[];
    player.play(
      { id: first.podcast.id, title: first.podcast.title, audioUrl: first.podcast.audio_url as string, coverImage: first.podcast.cover_image, slug: first.podcast.slug },
      rest.map((h: any) => ({ id: h.podcast.id, title: h.podcast.title, audioUrl: h.podcast.audio_url, coverImage: h.podcast.cover_image, slug: h.podcast.slug })),
    );
    toast.success(`Queued ${items.length} episodes`);
  };

  const clearLocal = (id: string) => {
    try { localStorage.removeItem(`syz-pos-${id}`); } catch {}
    toast.success("Local position cleared");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-6 py-10">
      <div className="animate-fade-up">
        <span className="text-xs uppercase tracking-widest text-[color:var(--gold)]">Your plays</span>
        <h1 className="font-display text-4xl md:text-5xl mt-1">Listening history</h1>
        <p className="text-muted-foreground mt-2">Everything you've tuned into. Resume anywhere — your spot follows you.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-8">
        <Stat icon={<Headphones className="h-5 w-5" />} label="Episodes touched" value={rowsAll.length} />
        <Stat icon={<Clock className="h-5 w-5" />} label="Minutes listened" value={totalMinutes} />
        <Stat icon={<Heart className="h-5 w-5" />} label="Liked" value={likedQ.data?.length ?? 0} />
      </div>

      <div className="mt-8 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your history..." className="w-full pl-11 pr-4 py-3 rounded-full glass border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2">
          {(["all", "in_progress", "completed"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm transition ${tab === t ? "bg-gradient-gold text-primary-foreground font-semibold" : "glass hover:bg-secondary"}`}>
              {t === "all" ? "All" : t === "in_progress" ? "In progress" : "Completed"}
            </button>
          ))}
          <button onClick={queueAll} className="px-4 py-2 rounded-full text-sm glass hover:bg-secondary inline-flex items-center gap-2"><ListMusic className="h-4 w-4" /> Play all</button>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl divide-y divide-border/40 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            Nothing here yet. <Link to="/podcasts" className="text-primary hover:underline">Browse episodes</Link>
          </div>
        ) : filtered.map((h: any) => {
          const pct = h.podcast.duration ? Math.min(100, (h.position_seconds / h.podcast.duration) * 100) : 0;
          return (
            <div key={h.id} className="p-3 flex items-center gap-3 hover:bg-secondary/40 transition">
              {h.podcast.cover_image ? <img src={h.podcast.cover_image} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg bg-gradient-card" />}
              <Link to="/podcasts/$slug" params={{ slug: h.podcast.slug }} className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{h.podcast.title}</div>
                <div className="text-xs text-muted-foreground">{Math.floor(h.position_seconds / 60)} min in · {new Date(h.last_played_at).toLocaleString()} {h.completed && "· ✓ completed"}</div>
                <div className="h-1 bg-secondary rounded mt-1.5 overflow-hidden">
                  <div className="h-full bg-gradient-gold" style={{ width: `${pct}%` }} />
                </div>
              </Link>
              <button onClick={() => resume(h)} className="h-9 w-9 rounded-full bg-gradient-gold text-primary-foreground inline-flex items-center justify-center btn-shine" aria-label="Resume">
                <Play className="h-4 w-4 ml-0.5" />
              </button>
              <button onClick={() => clearLocal(h.podcast.id)} className="h-9 w-9 rounded-full glass hover:bg-destructive/20 hover:text-destructive inline-flex items-center justify-center" aria-label="Clear local position">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {likedQ.data && likedQ.data.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl mb-4 flex items-center gap-2"><Heart className="h-5 w-5 text-[color:var(--gold)]" /> Liked episodes</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {likedQ.data.map((l: any) => l.podcast && (
              <Link key={l.podcast.id} to="/podcasts/$slug" params={{ slug: l.podcast.slug }} className="card-3d glass rounded-2xl p-4 flex gap-3">
                {l.podcast.cover_image ? <img src={l.podcast.cover_image} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg bg-gradient-card" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{l.podcast.title}</div>
                  <div className="text-xs text-muted-foreground">Liked {new Date(l.created_at).toLocaleDateString()}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-gradient-gold text-primary-foreground inline-flex items-center justify-center shadow-3d">{icon}</div>
      <div>
        <div className="text-2xl font-display">{value}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
