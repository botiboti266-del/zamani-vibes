import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Pause, Play, Volume2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/live")({
  component: LivePage,
  head: () => ({
    meta: [
      { title: "Live on Air — Sauti ya Zamani" },
      { name: "description", content: "Tune in live to the Sauti ya Zamani studio." },
    ],
  }),
});

function LivePage() {
  const { data } = useQuery({
    queryKey: ["site-settings", "live_stream"],
    queryFn: async () => (await supabase.from("site_settings").select("value").eq("key", "live_stream").maybeSingle()).data,
    refetchInterval: 15000,
  });
  const live = (data?.value as any) ?? { active: false, title: "", subtitle: "", stream_url: "", started_at: null };

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { try { await a.play(); setPlaying(true); } catch (e: any) { /* user gesture needed */ } }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 lg:px-6 py-16 animate-fade-up">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      {!live.active ? (
        <div className="glass rounded-3xl p-12 text-center">
          <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-display text-3xl">We're off air right now</h1>
          <p className="text-muted-foreground mt-2">No live broadcast at the moment. Catch up on episodes in the meantime.</p>
          <Link to="/podcasts" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine">Browse podcasts</Link>
        </div>
      ) : (
        <div className="glass rounded-3xl p-8 md:p-12 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 text-red-500 text-xs uppercase tracking-widest font-bold">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" /></span>
            On air
          </div>
          <h1 className="font-display text-4xl md:text-5xl">{live.title || "Live from the Studio"}</h1>
          {live.subtitle && <p className="text-muted-foreground">{live.subtitle}</p>}
          {live.started_at && (
            <p className="text-xs text-muted-foreground">Started {new Date(live.started_at).toLocaleTimeString()}</p>
          )}

          <div className="flex gap-1 justify-center items-end h-12">
            {[0.5,0.9,0.4,1,0.7,0.3,0.85,0.5,0.7,0.95,0.4,0.6].map((h,i) => (
              <span key={i} style={{ height: `${h*100}%`, animationDelay: `${i*0.1}s` }} className={`w-1.5 rounded-full ${playing ? "bg-gradient-gold animate-equalize" : "bg-muted"}`} />
            ))}
          </div>

          <div className="flex items-center justify-center gap-4">
            <button onClick={toggle} className="h-16 w-16 rounded-full bg-gradient-gold text-primary-foreground shadow-3d btn-shine inline-flex items-center justify-center hover:scale-105 transition">
              {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-0.5" />}
            </button>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Volume2 className="h-4 w-4" />
              <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
            </div>
          </div>

          <audio ref={audioRef} src={live.stream_url} preload="none" />
          <p className="text-xs text-muted-foreground">If playback doesn't start, tap play again — browsers require a tap to begin audio.</p>
        </div>
      )}
    </div>
  );
}
