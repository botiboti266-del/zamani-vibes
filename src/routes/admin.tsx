import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin")({
  component: () => (
    <AdminGuard>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </AdminGuard>
  ),
  head: () => ({ meta: [{ title: "Admin — Sauti ya Zamani" }, { name: "robots", content: "noindex" }] }),
});
