import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { PodcastForm } from "@/components/admin/podcast-form";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/podcasts/$id")({
  component: EditPodcast,
});

function EditPodcast() {
  const { id } = Route.useParams();
  const [sending, setSending] = useState(false);
  const q = useQuery({
    queryKey: ["podcast-edit", id],
    queryFn: async () => (await supabase.from("podcasts").select("*").eq("id", id).maybeSingle()).data,
  });

  const notify = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-new-episode", { body: { podcast_id: id } });
      if (error) throw error;
      toast.success(`Sent to ${data.sent ?? 0} subscribers`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <Link to="/admin/podcasts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back</Link>
        {q.data?.status === "published" && (
          <button onClick={notify} disabled={sending} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm hover:bg-secondary disabled:opacity-60">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Email subscribers
          </button>
        )}
      </div>
      <h1 className="font-display text-3xl">Edit podcast</h1>
      {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : q.data ? <PodcastForm existing={q.data as any} /> : <p>Not found.</p>}
    </div>
  );
}
