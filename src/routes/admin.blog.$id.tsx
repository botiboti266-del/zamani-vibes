import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BlogForm } from "@/components/admin/blog-form";

export const Route = createFileRoute("/admin/blog/$id")({
  component: EditPost,
});

function EditPost() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["post-edit", id],
    queryFn: async () => (await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle()).data,
  });
  return (
    <div className="space-y-6 animate-fade-up">
      <Link to="/admin/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="font-display text-3xl">Edit post</h1>
      {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : q.data ? <BlogForm existing={q.data as any} /> : <p>Not found.</p>}
    </div>
  );
}
