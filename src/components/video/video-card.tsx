import { Link } from "@tanstack/react-router";
import { PlayCircle, Film } from "lucide-react";
import { getThumbnail } from "@/lib/video-embed";

export interface VideoCardData {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  thumbnail?: string | null;
  source_url: string;
  source_type: string;
  is_short?: boolean | null;
  duration?: number | null;
}

export function VideoCard({ video }: { video: VideoCardData }) {
  const thumb = video.thumbnail || getThumbnail(video.source_url, video.source_type as any);
  return (
    <Link
      to="/videos/$slug"
      params={{ slug: video.slug }}
      className="card-3d glass rounded-2xl overflow-hidden group block"
    >
      <div className={`relative bg-secondary ${video.is_short ? "aspect-[9/16]" : "aspect-video"}`}>
        {thumb ? (
          <img src={thumb} alt={video.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-card">
            <Film className="h-12 w-12 text-[color:var(--gold)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
        <PlayCircle className="absolute inset-0 m-auto h-14 w-14 text-white drop-shadow-lg opacity-0 group-hover:opacity-100 transition" />
        {video.is_short && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[color:var(--gold)] text-primary-foreground text-[10px] font-bold uppercase tracking-widest">Short</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-base line-clamp-2 group-hover:text-primary transition">{video.title}</h3>
        {video.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{video.description}</p>}
      </div>
    </Link>
  );
}
