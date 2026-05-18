import { Link } from "@tanstack/react-router";
import { Play, Headphones } from "lucide-react";
import { usePlayer, type Track } from "@/components/player/player-context";

export interface PodcastCardData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  audio_url: string | null;
  duration: number | null;
  listen_count: number | null;
  category?: { name: string } | null;
}

function fmtDuration(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

export function PodcastCard({ podcast }: { podcast: PodcastCardData }) {
  const player = usePlayer();

  const onPlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!podcast.audio_url) return;
    const t: Track = {
      id: podcast.id,
      title: podcast.title,
      audioUrl: podcast.audio_url,
      coverImage: podcast.cover_image,
      slug: podcast.slug,
    };
    player.play(t);
  };

  return (
    <Link
      to="/podcasts/$slug"
      params={{ slug: podcast.slug }}
      className="card-3d group block rounded-2xl glass overflow-hidden"
    >
      <div className="aspect-square relative overflow-hidden">
        {podcast.cover_image ? (
          <img
            src={podcast.cover_image}
            alt={podcast.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-card flex items-center justify-center">
            <Headphones className="h-12 w-12 text-muted-foreground opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent pointer-events-none" />
        {podcast.audio_url && (
          <button
            onClick={onPlay}
            aria-label="Play"
            className="absolute bottom-3 right-3 h-12 w-12 rounded-full bg-gradient-gold text-primary-foreground flex items-center justify-center shadow-3d opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition btn-shine z-10"
          >
            <Play className="h-5 w-5 ml-0.5" />
          </button>
        )}
        {podcast.category?.name && (
          <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full glass pointer-events-none">
            {podcast.category.name}
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-display text-lg leading-tight line-clamp-2 group-hover:text-primary transition">
          {podcast.title}
        </h3>
        {podcast.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{podcast.description}</p>
        )}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span>{fmtDuration(podcast.duration)}</span>
          <span className="flex items-center gap-1"><Headphones className="h-3 w-3" /> {podcast.listen_count ?? 0}</span>
        </div>
      </div>
    </Link>
  );
}
