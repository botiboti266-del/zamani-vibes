import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Headphones, Heart, Clock } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Sauti ya Zamani" }, { name: "robots", content: "noindex" }] }),
});

function Dashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  const history = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("listening_history")
        .select("*, podcast:podcasts(id,title,slug,cover_image,duration)")
        .eq("user_id", user!.id)
        .order("last_played_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-6 py-12">
      <div className="animate-fade-up">
        <span className="text-xs uppercase tracking-widest text-[color:var(--gold)]">Your space</span>
        <h1 className="font-display text-4xl md:text-5xl mt-1">Hey, {user.email}</h1>
      </div>

      <h2 className="font-display text-2xl mt-12 mb-4 flex items-center gap-2"><Clock className="h-5 w-5" /> Continue listening</h2>
      {history.data && history.data.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.data.map((h: any) => h.podcast && (
            <Link key={h.id} to="/podcasts/$slug" params={{ slug: h.podcast.slug }} className="card-3d glass rounded-2xl p-4 flex gap-4">
              {h.podcast.cover_image ? (
                <img src={h.podcast.cover_image} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : <div className="h-16 w-16 rounded-lg bg-gradient-card" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{h.podcast.title}</div>
                <div className="text-xs text-muted-foreground">{Math.floor(h.position_seconds / 60)} min in</div>
                <div className="h-1 bg-secondary rounded mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-gold" style={{ width: `${Math.min(100, (h.position_seconds / (h.podcast.duration || 1)) * 100)}%` }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
          <Headphones className="h-10 w-10 mx-auto mb-3" />
          Nothing in your history yet. <Link to="/podcasts" className="text-primary hover:underline">Browse podcasts</Link>
        </div>
      )}
    </div>
  );
}
