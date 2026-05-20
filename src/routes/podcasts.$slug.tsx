import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/components/player/player-context";
import { EpisodePlayer } from "@/components/player/episode-player";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Heart, MessageCircle, Headphones, Clock, FileText, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { renderMarkdown } from "@/lib/markdown";

export const Route = createFileRoute("/podcasts/$slug")({
  component: PodcastPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Sauti ya Zamani` },
      { property: "og:type", content: "article" },
    ],
  }),
});

function PodcastPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [tab, setTab] = useState<"notes" | "transcript">("notes");

  const q = useQuery({
    queryKey: ["podcast", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("podcasts")
        .select("*, category:podcast_categories(name,slug)")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const comments = useQuery({
    queryKey: ["comments", q.data?.id],
    enabled: !!q.data?.id,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("podcast_comments")
        .select("id,content,created_at,user_id")
        .eq("podcast_id", q.data!.id)
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      let profiles: any[] = [];
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,display_name,avatar_url")
          .in("user_id", ids);
        profiles = profs ?? [];
      }
      return (rows ?? []).map((r) => ({
        ...r,
        profile: profiles.find((p) => p.user_id === r.user_id) ?? null,
      }));
    },
  });

  const likes = useQuery({
    queryKey: ["likes", q.data?.id, user?.id],
    enabled: !!q.data?.id,
    queryFn: async () => {
      const c = await supabase.from("podcast_likes").select("id", { count: "exact", head: true }).eq("podcast_id", q.data!.id);
      let liked = false;
      if (user) {
        const m = await supabase.from("podcast_likes").select("id").eq("podcast_id", q.data!.id).eq("user_id", user.id).maybeSingle();
        liked = !!m.data;
      }
      return { count: c.count ?? 0, liked };
    },
  });

  useEffect(() => {
    if (!q.data?.id) return;
    const key = `syz-listened-${q.data.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase.from("podcasts").update({ listen_count: (q.data.listen_count ?? 0) + 1 }).eq("id", q.data.id).then(() => {});
  }, [q.data?.id]); // eslint-disable-line

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10">
          <div className="aspect-square rounded-3xl glass animate-pulse" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 rounded-xl bg-secondary animate-pulse" />
            <div className="h-4 w-full rounded bg-secondary animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-secondary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl mb-2">Episode not found</h1>
        <p className="text-muted-foreground mb-6">It may have been unpublished or moved.</p>
        <Link to="/podcasts" className="inline-block px-6 py-3 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine">Browse episodes</Link>
      </div>
    );
  }
  const p = q.data;
  const track: Track | null = p.audio_url ? { id: p.id, title: p.title, audioUrl: p.audio_url, coverImage: p.cover_image, slug: p.slug } : null;

  const toggleLike = async () => {
    if (!user) { toast.info("Sign in to like this episode"); return; }
    if (likes.data?.liked) {
      await supabase.from("podcast_likes").delete().eq("podcast_id", p.id).eq("user_id", user.id);
    } else {
      await supabase.from("podcast_likes").insert({ podcast_id: p.id, user_id: user.id });
    }
    likes.refetch();
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.info("Sign in to comment"); return; }
    if (!comment.trim()) return;
    const { error } = await supabase.from("podcast_comments").insert({ podcast_id: p.id, user_id: user.id, content: comment.trim() });
    if (error) toast.error("Couldn't post comment");
    else { setComment(""); comments.refetch(); toast.success("Posted"); }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-6 py-10">
      <div className="grid lg:grid-cols-[0.9fr_1.35fr] gap-8 items-start">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="aspect-square rounded-2xl overflow-hidden glass shadow-3d">
            {p.cover_image ? (
              <img src={p.cover_image} alt={p.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-card flex items-center justify-center"><Radio className="h-20 w-20 text-[color:var(--gold)]" /></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={toggleLike} className={`glass rounded-xl py-3 flex flex-col items-center gap-1 hover:bg-secondary transition ${likes.data?.liked ? "text-[color:var(--gold)]" : ""}`}>
              <Heart className={`h-4 w-4 ${likes.data?.liked ? "fill-current" : ""}`} />
              <span className="text-xs">{likes.data?.count ?? 0}</span>
            </button>
            <button onClick={share} className="glass rounded-xl py-3 flex flex-col items-center gap-1 hover:bg-secondary transition">
              <MessageCircle className="h-4 w-4" /><span className="text-xs">Share</span>
            </button>
          </div>
        </aside>

        <div className="space-y-6 animate-fade-up">
          {p.category && (
            <Link to="/podcasts" search={{ category: (p.category as any).slug } as never} className="text-xs uppercase tracking-widest text-[color:var(--gold)] hover:underline">
              {(p.category as any).name}
            </Link>
          )}
          <h1 className="font-display text-4xl md:text-5xl leading-tight">{p.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Headphones className="h-4 w-4" /> {p.listen_count ?? 0} listens</span>
            {p.duration ? <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {Math.floor(p.duration / 60)} min</span> : null}
            {p.published_at && <span>{new Date(p.published_at).toLocaleDateString()}</span>}
          </div>
          {p.summary && <p className="text-lg text-foreground/90 italic">{p.summary}</p>}
          {p.description && <p className="text-base text-muted-foreground whitespace-pre-wrap">{p.description}</p>}

          {track ? (
            <EpisodePlayer track={track} duration={p.duration} onShare={share} />
          ) : (
            <div className="glass rounded-2xl p-5 flex items-start gap-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5 text-[color:var(--gold)] mt-0.5" />
              <p>This episode is published, but audio has not been attached yet.</p>
            </div>
          )}

          {(p.show_notes || p.transcript) && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex border-b border-border/50">
                {p.show_notes && (
                  <button onClick={() => setTab("notes")} className={`px-5 py-3 text-sm font-medium inline-flex items-center gap-2 transition ${tab === "notes" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <FileText className="h-4 w-4" /> Show notes
                  </button>
                )}
                {p.transcript && (
                  <button onClick={() => setTab("transcript")} className={`px-5 py-3 text-sm font-medium inline-flex items-center gap-2 transition ${tab === "transcript" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <FileText className="h-4 w-4" /> Transcript
                  </button>
                )}
              </div>
              <div className="p-6">
                {tab === "notes" && p.show_notes && (
                  <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.show_notes) }} />
                )}
                {tab === "transcript" && p.transcript && (
                  <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap text-foreground/90 max-h-[500px] overflow-y-auto">{p.transcript}</div>
                )}
              </div>
            </div>
          )}

          {p.tags && p.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {p.tags.map((t: string) => (
                <span key={t} className="text-xs px-3 py-1 rounded-full bg-secondary">#{t}</span>
              ))}
            </div>
          )}

          <div className="mt-10">
            <h3 className="font-display text-2xl flex items-center gap-2 mb-4"><MessageCircle className="h-5 w-5" /> Conversation</h3>
            <form onSubmit={submitComment} className="mb-6">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={user ? "Share your thoughts..." : "Sign in to join the conversation"}
                disabled={!user}
                rows={3}
                className="w-full p-4 rounded-2xl glass border border-border resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              <div className="flex justify-end mt-2">
                <button disabled={!user || !comment.trim()} className="px-5 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine disabled:opacity-50">Post</button>
              </div>
            </form>
            <div className="space-y-4">
              {comments.data?.map((c: any) => (
                <div key={c.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center text-xs font-semibold text-primary-foreground">
                      {(c.profile?.display_name ?? "?")[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{c.profile?.display_name ?? "Listener"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
              {comments.data && comments.data.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Be the first to comment.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
