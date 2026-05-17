import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PodcastForm } from "@/components/admin/podcast-form";

export const Route = createFileRoute("/admin/podcasts/new")({
  component: () => (
    <div className="space-y-6 animate-fade-up">
      <Link to="/admin/podcasts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="font-display text-3xl">New podcast</h1>
      <PodcastForm />
    </div>
  ),
});
