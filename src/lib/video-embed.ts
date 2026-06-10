export type VideoSourceType = "upload" | "youtube" | "vimeo" | "url";

export function detectSource(url: string): VideoSourceType {
  if (!url) return "url";
  if (/youtu\.?be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url)) return "upload";
  return "url";
}

export function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

export function getEmbedUrl(url: string, type?: VideoSourceType): string {
  const t = type ?? detectSource(url);
  if (t === "youtube") {
    const id = getYoutubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : url;
  }
  if (t === "vimeo") {
    const id = getVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}?byline=0&portrait=0` : url;
  }
  return url;
}

export function getThumbnail(url: string, type?: VideoSourceType): string | null {
  const t = type ?? detectSource(url);
  if (t === "youtube") {
    const id = getYoutubeId(url);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  }
  return null;
}

export function isDirectVideo(url: string, type?: VideoSourceType): boolean {
  const t = type ?? detectSource(url);
  return t === "upload" || t === "url";
}
