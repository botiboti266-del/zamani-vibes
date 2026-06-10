import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/video/video-player";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/videos/$slug")({
  component: VideoDetail,
});

function VideoDetail() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["video", slug],
    queryFn: async () => {
      const r = await (supabase as any).from("videos").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      return r.data;
    },
  });

  if (!isLoading && !data) throw notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 lg:px-6 py-10 animate-fade-up">
      <Link to="/videos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4" /> All videos
      </Link>
      {data && (
        <>
          <div className={`overflow-hidden rounded-2xl shadow-3d ${data.is_short ? "max-w-sm mx-auto aspect-[9/16]" : "aspect-video"}`}>
            <VideoPlayer url={data.source_url} sourceType={data.source_type} poster={data.thumbnail} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl mt-6">{data.title}</h1>
          {data.description && <p className="text-muted-foreground mt-3 whitespace-pre-line">{data.description}</p>}
          {data.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {data.tags.map((t: string) => (
                <span key={t} className="px-2.5 py-0.5 rounded-full bg-secondary text-xs">#{t}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
