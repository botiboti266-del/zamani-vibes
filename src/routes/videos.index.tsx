import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard, type VideoCardData } from "@/components/video/video-card";
import { Film, Zap } from "lucide-react";

export const Route = createFileRoute("/videos/")({
  component: VideosPage,
  head: () => ({
    meta: [
      { title: "Video Shorts & Episodes — Sauti ya Zamani" },
      { name: "description", content: "Watch video shorts, podcast clips, and full episodes from Sauti ya Zamani." },
      { property: "og:title", content: "Video Shorts & Episodes — Sauti ya Zamani" },
      { property: "og:description", content: "Watch video shorts, podcast clips, and full episodes." },
    ],
  }),
});

function VideosPage() {
  const { data } = useQuery({
    queryKey: ["public-videos"],
    queryFn: async () => {
      const r = await (supabase as any).from("videos").select("*").eq("status", "published").order("published_at", { ascending: false });
      return (r.data ?? []) as VideoCardData[];
    },
  });
  const videos = data ?? [];
  const shorts = videos.filter((v) => v.is_short);
  const full = videos.filter((v) => !v.is_short);

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-6 py-12 space-y-12 animate-fade-up">
      <header>
        <span className="text-xs uppercase tracking-widest text-[color:var(--gold)]">Watch</span>
        <h1 className="font-display text-4xl md:text-5xl mt-1">Videos & Shorts</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">Visual stories, studio sessions and bite-sized shorts from across East Africa.</p>
      </header>

      {shorts.length > 0 && (
        <section>
          <h2 className="font-display text-2xl mb-4 flex items-center gap-2"><Zap className="h-5 w-5 text-[color:var(--gold)]" /> Shorts</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {shorts.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-2xl mb-4 flex items-center gap-2"><Film className="h-5 w-5 text-[color:var(--gold)]" /> All videos</h2>
        {full.length === 0 && shorts.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-muted-foreground">No videos published yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {full.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        )}
      </section>
    </div>
  );
}
