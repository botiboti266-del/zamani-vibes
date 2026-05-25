import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePlayer } from "@/components/player/player-context";
import { Headphones, Heart, Clock, Play, ListMusic, MessageCircle, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Sauti ya Zamani" }, { name: "robots", content: "noindex" }] }),
});

function Dashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const player = usePlayer();
  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  const history = useQuery({
    queryKey: ["dash-history", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase
      .from("listening_history")
      .select("*, podcast:podcasts(id,title,slug,cover_image,audio_url,duration)")
      .eq("user_id", user!.id)
      .order("last_played_at", { ascending: false })
      .limit(6)).data ?? [],
  });

  const liked = useQuery({
    queryKey: ["dash-liked", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase
      .from("podcast_likes")
      .select("podcast:podcasts(id,title,slug,cover_image,audio_url)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(6)).data ?? [],
  });

  const myComments = useQuery({
    queryKey: ["dash-comments", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase
      .from("podcast_comments")
      .select("id,content,created_at,podcast:podcasts(title,slug)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5)).data ?? [],
  });

  const featured = useQuery({
    queryKey: ["dash-featured"],
    queryFn: async () => (await supabase
      .from("podcasts")
      .select("id,title,slug,cover_image,audio_url,description")
      .eq("status", "published")
      .eq("featured", true)
      .order("published_at", { ascending: false })
      .limit(4)).data ?? [],
  });

  if (!user) return null;

  const totalMinutes = Math.round((history.data ?? []).reduce((s: number, h: any) => s + (h.position_seconds || 0), 0) / 60);

  const playOne = (p: any) => {
    if (!p?.audio_url) return;
    player.play({ id: p.id, title: p.title, audioUrl: p.audio_url, coverImage: p.cover_image, slug: p.slug });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-6 py-12">
      <div className="animate-fade-up">
        <span className="text-xs uppercase tracking-widest text-[color:var(--gold)]">Your space</span>
        <h1 className="font-display text-4xl md:text-5xl mt-1">Hey, {user.email}</h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-8">
        <Stat icon={<Headphones className="h-5 w-5" />} label="Episodes touched" value={history.data?.length ?? 0} />
        <Stat icon={<Clock className="h-5 w-5" />} label="Recent minutes" value={totalMinutes} />
        <Stat icon={<Heart className="h-5 w-5" />} label="Liked" value={liked.data?.length ?? 0} />
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        <Link to="/history" className="px-5 py-2.5 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine inline-flex items-center gap-2">
          <ListMusic className="h-4 w-4" /> Full listening history
        </Link>
        <Link to="/podcasts" className="px-5 py-2.5 rounded-full glass font-semibold hover:bg-secondary transition inline-flex items-center gap-2">
          Browse podcasts <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/vibes" className="px-5 py-2.5 rounded-full glass font-semibold hover:bg-secondary transition inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Today's vibe
        </Link>
      </div>

      <h2 className="font-display text-2xl mt-12 mb-4 flex items-center gap-2"><Clock className="h-5 w-5" /> Continue listening</h2>
      {history.data && history.data.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.data.map((h: any) => h.podcast && (
            <div key={h.id} className="card-3d glass rounded-2xl p-4 flex gap-4">
              {h.podcast.cover_image ? (
                <img src={h.podcast.cover_image} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : <div className="h-16 w-16 rounded-lg bg-gradient-card" />}
              <div className="flex-1 min-w-0">
                <Link to="/podcasts/$slug" params={{ slug: h.podcast.slug }} className="font-semibold truncate block hover:text-primary">{h.podcast.title}</Link>
                <div className="text-xs text-muted-foreground">{Math.floor(h.position_seconds / 60)} min in</div>
                <div className="h-1 bg-secondary rounded mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-gold" style={{ width: `${Math.min(100, (h.position_seconds / (h.podcast.duration || 1)) * 100)}%` }} />
                </div>
              </div>
              <button onClick={() => playOne(h.podcast)} className="h-9 w-9 rounded-full bg-gradient-gold text-primary-foreground inline-flex items-center justify-center btn-shine self-center" aria-label="Resume">
                <Play className="h-4 w-4 ml-0.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
          <Headphones className="h-10 w-10 mx-auto mb-3" />
          Nothing in your history yet. <Link to="/podcasts" className="text-primary hover:underline">Browse podcasts</Link>
        </div>
      )}

      {featured.data && featured.data.length > 0 && (
        <>
          <h2 className="font-display text-2xl mt-12 mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-[color:var(--gold)]" /> Featured for you</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.data.map((p: any) => (
              <div key={p.id} className="card-3d glass rounded-2xl overflow-hidden">
                <Link to="/podcasts/$slug" params={{ slug: p.slug }} className="block aspect-square relative">
                  {p.cover_image ? <img src={p.cover_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-card" />}
                  <button onClick={(e) => { e.preventDefault(); playOne(p); }} className="absolute bottom-2 right-2 h-10 w-10 rounded-full bg-gradient-gold text-primary-foreground inline-flex items-center justify-center shadow-3d btn-shine">
                    <Play className="h-4 w-4 ml-0.5" />
                  </button>
                </Link>
                <div className="p-3">
                  <Link to="/podcasts/$slug" params={{ slug: p.slug }} className="font-display text-base hover:text-primary line-clamp-2">{p.title}</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {myComments.data && myComments.data.length > 0 && (
        <>
          <h2 className="font-display text-2xl mt-12 mb-4 flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Your recent comments</h2>
          <div className="glass rounded-2xl divide-y divide-border/40">
            {myComments.data.map((c: any) => (
              <Link key={c.id} to="/podcasts/$slug" params={{ slug: c.podcast?.slug ?? "" }} className="block p-4 hover:bg-secondary/40 transition">
                <div className="text-xs text-muted-foreground">on "{c.podcast?.title ?? "—"}" · {new Date(c.created_at).toLocaleString()}</div>
                <p className="text-sm mt-1 line-clamp-2">{c.content}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-gradient-gold text-primary-foreground inline-flex items-center justify-center shadow-3d">{icon}</div>
      <div><div className="text-2xl font-display">{value}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div></div>
    </div>
  );
}
