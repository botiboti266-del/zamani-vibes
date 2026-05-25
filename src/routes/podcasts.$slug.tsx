import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/components/player/player-context";
import { usePlayer } from "@/components/player/player-context";
import { EpisodePlayer } from "@/components/player/episode-player";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertCircle, Heart, MessageCircle, Headphones, Clock, FileText, Radio, Reply,
  Share2, Link2, ListPlus, Play, ListMusic,
} from "lucide-react";
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

interface CommentRow {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
}

function PodcastPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const player = usePlayer();
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
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

  // other episodes for queue / autoplay
  const others = useQuery({
    queryKey: ["other-episodes", q.data?.id],
    enabled: !!q.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("podcasts")
        .select("id,title,slug,cover_image,audio_url,duration,listen_count,published_at")
        .eq("status", "published")
        .neq("id", q.data!.id)
        .order("published_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  const comments = useQuery({
    queryKey: ["comments", q.data?.id],
    enabled: !!q.data?.id,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("podcast_comments")
        .select("id,content,created_at,user_id,parent_id")
        .eq("podcast_id", q.data!.id)
        .order("created_at", { ascending: true });
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
      })) as CommentRow[];
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
  const url = typeof window !== "undefined" ? window.location.href : "";

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

  const submitReply = async (parentId: string) => {
    if (!user) { toast.info("Sign in to reply"); return; }
    if (!replyText.trim()) return;
    const { error } = await supabase.from("podcast_comments").insert({
      podcast_id: p.id, user_id: user.id, content: replyText.trim(), parent_id: parentId,
    });
    if (error) toast.error("Couldn't post reply");
    else { setReplyText(""); setReplyTo(null); comments.refetch(); toast.success("Reply posted"); }
  };

  const deleteComment = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("podcast_comments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { comments.refetch(); toast.success("Deleted"); }
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };
  const copyLink = async () => { await navigator.clipboard.writeText(url); toast.success("Link copied"); };
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(p.title)}&url=${encodeURIComponent(url)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${p.title} — ${url}`)}`;

  // queue of other episodes (excluding the one currently playing)
  const queueAll = () => {
    const ep = (others.data ?? []).filter((o: any) => o.audio_url);
    if (!track) return;
    player.play(track, ep.map((o: any) => ({ id: o.id, title: o.title, audioUrl: o.audio_url, coverImage: o.cover_image, slug: o.slug })));
    toast.success(`Playing ${p.title} + ${ep.length} queued`);
  };
  const enqueueOne = (o: any) => {
    if (!o.audio_url) return;
    player.enqueue({ id: o.id, title: o.title, audioUrl: o.audio_url, coverImage: o.cover_image, slug: o.slug });
    toast.success("Added to queue");
  };

  // build top-level comments + nested replies
  const all = comments.data ?? [];
  const topLevel = all.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => all.filter((c) => c.parent_id === id);

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
              <span className="text-xs">{likes.data?.count ?? 0} likes</span>
            </button>
            <button onClick={share} className="glass rounded-xl py-3 flex flex-col items-center gap-1 hover:bg-secondary transition">
              <Share2 className="h-4 w-4" /><span className="text-xs">Share</span>
            </button>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Share to</div>
            <div className="flex gap-2">
              <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="flex-1 h-9 rounded-lg bg-secondary hover:bg-gradient-gold hover:text-primary-foreground transition inline-flex items-center justify-center text-xs font-semibold" aria-label="Share on Twitter">𝕏</a>
              <a href={fbUrl} target="_blank" rel="noopener noreferrer" className="flex-1 h-9 rounded-lg bg-secondary hover:bg-gradient-gold hover:text-primary-foreground transition inline-flex items-center justify-center text-xs font-bold" aria-label="Share on Facebook">f</a>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1 h-9 rounded-lg bg-secondary hover:bg-gradient-gold hover:text-primary-foreground transition inline-flex items-center justify-center" aria-label="Share on WhatsApp"><MessageCircle className="h-4 w-4" /></a>
              <button onClick={copyLink} className="flex-1 h-9 rounded-lg bg-secondary hover:bg-gradient-gold hover:text-primary-foreground transition inline-flex items-center justify-center" aria-label="Copy link"><Link2 className="h-4 w-4" /></button>
            </div>
          </div>
          {track && others.data && others.data.length > 0 && (
            <button onClick={queueAll} className="w-full glass rounded-xl py-3 inline-flex items-center justify-center gap-2 hover:bg-secondary transition text-sm">
              <ListMusic className="h-4 w-4" /> Play & autoplay next {Math.min(others.data.length, 12)}
            </button>
          )}
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

          {/* Other episodes / queue */}
          {others.data && others.data.length > 0 && (
            <section className="mt-10">
              <div className="flex items-end justify-between mb-3">
                <h3 className="font-display text-2xl flex items-center gap-2"><ListMusic className="h-5 w-5" /> More episodes</h3>
                <span className="text-xs text-muted-foreground">{player.queue.length} in queue</span>
              </div>
              <ul className="glass rounded-2xl divide-y divide-border/40 overflow-hidden">
                {others.data.map((o: any) => (
                  <li key={o.id} className="p-3 flex items-center gap-3 hover:bg-secondary/40 transition">
                    {o.cover_image ? <img src={o.cover_image} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-gradient-card" />}
                    <Link to="/podcasts/$slug" params={{ slug: o.slug }} className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{o.title}</div>
                      <div className="text-xs text-muted-foreground">{o.duration ? `${Math.floor(o.duration / 60)} min` : "—"} · {o.listen_count ?? 0} listens</div>
                    </Link>
                    {o.audio_url && (
                      <>
                        <button
                          onClick={() => player.play({ id: o.id, title: o.title, audioUrl: o.audio_url, coverImage: o.cover_image, slug: o.slug })}
                          className="h-9 w-9 rounded-full bg-gradient-gold text-primary-foreground inline-flex items-center justify-center btn-shine"
                          aria-label="Play"
                        >
                          <Play className="h-4 w-4 ml-0.5" />
                        </button>
                        <button onClick={() => enqueueOne(o)} className="h-9 w-9 rounded-full glass hover:bg-secondary inline-flex items-center justify-center" aria-label="Add to queue">
                          <ListPlus className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Comments */}
          <div className="mt-10">
            <h3 className="font-display text-2xl flex items-center gap-2 mb-4"><MessageCircle className="h-5 w-5" /> Conversation ({all.length})</h3>
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
              {topLevel.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  replies={repliesOf(c.id)}
                  user={user}
                  replyTo={replyTo}
                  replyText={replyText}
                  setReplyTo={setReplyTo}
                  setReplyText={setReplyText}
                  onSubmitReply={() => submitReply(c.id)}
                  onDelete={deleteComment}
                />
              ))}
              {topLevel.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Be the first to comment.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment: c, replies, user, replyTo, replyText, setReplyTo, setReplyText, onSubmitReply, onDelete,
}: {
  comment: CommentRow;
  replies: CommentRow[];
  user: any;
  replyTo: string | null;
  replyText: string;
  setReplyTo: (id: string | null) => void;
  setReplyText: (s: string) => void;
  onSubmitReply: () => void;
  onDelete: (id: string) => void;
}) {
  const open = replyTo === c.id;
  return (
    <div className="glass rounded-2xl p-4">
      <CommentHeader c={c} />
      <p className="text-sm whitespace-pre-wrap mt-2">{c.content}</p>
      <div className="flex gap-3 mt-3 text-xs">
        <button onClick={() => setReplyTo(open ? null : c.id)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
          <Reply className="h-3.5 w-3.5" /> Reply
        </button>
        {user?.id === c.user_id && (
          <button onClick={() => onDelete(c.id)} className="text-muted-foreground hover:text-destructive">Delete</button>
        )}
      </div>
      {open && (
        <div className="mt-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={user ? "Write a reply..." : "Sign in to reply"}
            disabled={!user}
            rows={2}
            className="w-full p-3 rounded-xl bg-secondary border border-border resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 text-sm"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => { setReplyTo(null); setReplyText(""); }} className="px-3 py-1.5 rounded-full text-xs hover:bg-secondary">Cancel</button>
            <button onClick={onSubmitReply} disabled={!user || !replyText.trim()} className="px-4 py-1.5 rounded-full bg-gradient-gold text-primary-foreground text-xs font-semibold btn-shine disabled:opacity-50">Reply</button>
          </div>
        </div>
      )}
      {replies.length > 0 && (
        <div className="mt-4 pl-4 border-l-2 border-border/40 space-y-3">
          {replies.map((r) => (
            <div key={r.id} className="bg-secondary/40 rounded-xl p-3">
              <CommentHeader c={r} small />
              <p className="text-sm whitespace-pre-wrap mt-1.5">{r.content}</p>
              {user?.id === r.user_id && (
                <button onClick={() => onDelete(r.id)} className="text-xs text-muted-foreground hover:text-destructive mt-2">Delete</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentHeader({ c, small }: { c: CommentRow; small?: boolean }) {
  const size = small ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <div className="flex items-center gap-2">
      {c.profile?.avatar_url ? (
        <img src={c.profile.avatar_url} alt="" className={`${size} rounded-full object-cover`} />
      ) : (
        <div className={`${size} rounded-full bg-gradient-gold flex items-center justify-center font-semibold text-primary-foreground`}>
          {(c.profile?.display_name ?? "?")[0]?.toUpperCase() ?? "?"}
        </div>
      )}
      <div>
        <div className="text-sm font-semibold">{c.profile?.display_name ?? "Listener"}</div>
        <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
      </div>
    </div>
  );
}
