import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-4xl">Admin dashboard</h1>
      <p className="mt-4 text-muted-foreground">
        The full admin panel (podcast & blog CRUD, recording studio, analytics, comment moderation,
        media library, newsletter management) is shipped in Phase 2.
      </p>
    </div>
  ),
  head: () => ({ meta: [{ title: "Admin — Sauti ya Zamani" }, { name: "robots", content: "noindex" }] }),
});
