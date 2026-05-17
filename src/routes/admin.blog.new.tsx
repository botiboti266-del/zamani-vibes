import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BlogForm } from "@/components/admin/blog-form";

export const Route = createFileRoute("/admin/blog/new")({
  component: () => (
    <div className="space-y-6 animate-fade-up">
      <Link to="/admin/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="font-display text-3xl">New post</h1>
      <BlogForm />
    </div>
  ),
});
