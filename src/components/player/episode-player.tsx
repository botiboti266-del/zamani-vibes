import { Link } from "@tanstack/react-router";
import { Clock, Download, ExternalLink, Gauge, Pause, Play, Share2, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { usePlayer, type Track } from "./player-context";

function fmt(s: number | null | undefined) {
  if (!s || !isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = Math.floor(s % 60);
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}` : `${m}:${r.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function EpisodePlayer({
  track,
  duration,
  showDetailLink = false,
  onShare,
}: {
  track: Track;
  duration?: number | null;
  showDetailLink?: boolean;
  onShare?: () => void;
}) {
  const player = usePlayer();
  const active = player.current?.id === track.id;
  const playing = active && player.playing;
  const position = active ? player.position : 0;
  const total = active ? player.duration || duration || 0 : duration || 0;

  const toggle = () => {
    if (!active) player.play(track);
    else player.toggle();
  };

  return (
    <section className="glass rounded-2xl p-4 md:p-5 shadow-elegant">
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        {track.coverImage ? (
          <img src={track.coverImage} alt="" className="h-24 w-24 rounded-xl object-cover shadow-3d" />
        ) : (
          <div className="h-24 w-24 rounded-xl bg-gradient-gold shadow-3d" />
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmt(total || duration)}</span>
              <span className="inline-flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> {player.speed}x</span>
            </div>
            <h2 className="mt-1 truncate font-display text-2xl md:text-3xl">{track.title}</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-12 text-xs tabular-nums text-muted-foreground">{fmt(position)}</span>
            <input
              type="range"
              min={0}
              max={total || 0}
              value={Math.min(position, total || position)}
              onChange={(e) => player.seek(Number(e.target.value))}
              disabled={!active}
              className="min-w-0 flex-1 accent-[color:var(--gold)] disabled:opacity-50"
              aria-label="Episode progress"
            />
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{fmt(total)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <button onClick={player.prev} disabled={!active} className="h-10 w-10 rounded-full glass hover:bg-secondary disabled:opacity-40 inline-flex items-center justify-center" aria-label="Restart episode">
            <SkipBack className="h-4 w-4" />
          </button>
          <button onClick={toggle} className="h-12 w-12 rounded-full bg-gradient-gold text-primary-foreground shadow-3d btn-shine hover:scale-105 transition inline-flex items-center justify-center" aria-label={playing ? "Pause episode" : "Play episode"}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </button>
          <button onClick={player.next} disabled={!active || player.queue.length === 0} className="h-10 w-10 rounded-full glass hover:bg-secondary disabled:opacity-40 inline-flex items-center justify-center" aria-label="Next episode">
            <SkipForward className="h-4 w-4" />
          </button>
          <select value={player.speed} onChange={(e) => player.setSpeed(Number(e.target.value))} className="h-10 rounded-full bg-secondary px-3 text-xs border border-border" aria-label="Playback speed">
            {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
          </select>
          <label className="hidden sm:flex h-10 items-center gap-2 rounded-full glass px-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <input type="range" min={0} max={1} step={0.01} value={player.volume} onChange={(e) => player.setVolume(Number(e.target.value))} className="w-20 accent-[color:var(--gold)]" aria-label="Volume" />
          </label>
          {onShare && <button onClick={onShare} className="h-10 w-10 rounded-full glass hover:bg-secondary inline-flex items-center justify-center" aria-label="Share episode"><Share2 className="h-4 w-4" /></button>}
          <a href={track.audioUrl} download className="h-10 w-10 rounded-full glass hover:bg-secondary inline-flex items-center justify-center" aria-label="Download episode"><Download className="h-4 w-4" /></a>
          {showDetailLink && track.slug && (
            <Link to="/podcasts/$slug" params={{ slug: track.slug }} className="h-10 w-10 rounded-full glass hover:bg-secondary inline-flex items-center justify-center" aria-label="Open episode page">
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}