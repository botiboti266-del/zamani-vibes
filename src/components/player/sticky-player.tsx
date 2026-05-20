import { Link } from "@tanstack/react-router";
import { usePlayer } from "./player-context";
import { Play, Pause, SkipForward, SkipBack, Volume2, ExternalLink, Loader2 } from "lucide-react";

function fmt(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function StickyPlayer() {
  const p = usePlayer();
  if (!p.current) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 animate-fade-up">
      <div className="glass shadow-elegant rounded-2xl mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        {p.current.coverImage ? (
          <img
            src={p.current.coverImage}
            alt=""
            className="h-12 w-12 rounded-lg object-cover shadow-elegant"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-gradient-gold animate-spin-slow" />
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{p.current.title}</div>
          {p.error && <div className="text-xs text-destructive">{p.error}</div>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{fmt(p.position)}</span>
            <input
              type="range"
              min={0}
              max={p.duration || 0}
              value={p.position}
              onChange={(e) => p.seek(Number(e.target.value))}
              className="flex-1 accent-[color:var(--gold)] cursor-pointer"
            />
            <span className="tabular-nums">{fmt(p.duration)}</span>
          </div>
        </div>

        <button onClick={p.prev} className="p-2 rounded-full hover:bg-secondary transition" aria-label="Previous">
          <SkipBack className="h-4 w-4" />
        </button>

        <button
          onClick={p.toggle}
          className="h-11 w-11 rounded-full bg-gradient-gold text-primary-foreground flex items-center justify-center shadow-3d btn-shine hover:scale-105 transition"
          aria-label={p.playing ? "Pause" : "Play"}
        >
          {p.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : p.playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        <button onClick={p.next} className="p-2 rounded-full hover:bg-secondary transition" aria-label="Next">
          <SkipForward className="h-4 w-4" />
        </button>

        <select
          value={p.speed}
          onChange={(e) => p.setSpeed(Number(e.target.value))}
          className="hidden sm:block bg-secondary text-xs rounded-lg px-2 py-1 border border-border"
          aria-label="Playback speed"
        >
          {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
        </select>

        <div className="hidden md:flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <input
            type="range" min={0} max={1} step={0.01}
            value={p.volume}
            onChange={(e) => p.setVolume(Number(e.target.value))}
            className="w-20 accent-[color:var(--gold)]"
            aria-label="Volume"
          />
        </div>

        {p.current.slug && (
          <Link to="/podcasts/$slug" params={{ slug: p.current.slug }} className="p-2 rounded-full hover:bg-secondary transition" aria-label="Open episode details">
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
