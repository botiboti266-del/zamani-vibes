import { getEmbedUrl, isDirectVideo, type VideoSourceType } from "@/lib/video-embed";

interface Props {
  url: string;
  sourceType?: VideoSourceType;
  poster?: string | null;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
}

export function VideoPlayer({ url, sourceType, poster, className, autoPlay, controls = true, loop }: Props) {
  if (!url) return null;
  if (isDirectVideo(url, sourceType)) {
    return (
      <video
        src={url}
        poster={poster ?? undefined}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        playsInline
        className={className ?? "w-full h-full bg-black rounded-xl"}
      />
    );
  }
  return (
    <iframe
      src={getEmbedUrl(url, sourceType)}
      title="Video player"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      className={className ?? "w-full h-full rounded-xl border-0 bg-black"}
    />
  );
}
