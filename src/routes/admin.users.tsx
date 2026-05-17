import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,avatar_url,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const map = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = map.get(r.user_id) ?? [];
        arr.push(r.role);
        map.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: map.get(p.user_id) ?? [] }));
    },
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="font-display text-3xl flex items-center gap-2"><Users className="h-7 w-7" /> Users</h1>
      <div className="glass rounded-2xl divide-y divide-border/40">
        {q.data?.map((u: any) => (
          <div key={u.user_id} className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center text-sm font-semibold text-primary-foreground">
              {(u.display_name ?? "?")[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-medium">{u.display_name ?? "Listener"}</div>
              <div className="text-xs text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-1">
              {u.roles.map((r: string) => (
                <span key={r} className={`text-xs px-2 py-1 rounded-full ${r === "admin" ? "bg-gradient-gold text-primary-foreground" : "bg-secondary"}`}>{r}</span>
              ))}
            </div>
          </div>
        ))}
        {q.data?.length === 0 && <div className="p-10 text-center text-muted-foreground">No users yet.</div>}
      </div>
    </div>
  );
}
