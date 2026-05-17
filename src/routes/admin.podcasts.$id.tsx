import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PodcastForm } from "@/components/admin/podcast-form";

export const Route = createFileRoute("/admin/podcasts/$id")({
  component: EditPodcast,
});

function EditPodcast() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["podcast-edit", id],
    queryFn: async () => (await supabase.from("podcasts").select("*").eq("id", id).maybeSingle()).data,
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <Link to="/admin/podcasts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="font-display text-3xl">Edit podcast</h1>
      {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : q.data ? <PodcastForm existing={q.data as any} /> : <p>Not found.</p>}
    </div>
  );
}
