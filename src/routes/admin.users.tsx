import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShieldCheck, ShieldOff, Mail, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

function UsersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,avatar_url,bio,created_at").order("created_at", { ascending: false }),
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

  const filtered = useMemo(() => {
    if (!q.data) return [];
    const s = search.trim().toLowerCase();
    if (!s) return q.data;
    return q.data.filter((u: any) =>
      (u.display_name ?? "").toLowerCase().includes(s) ||
      (u.user_id ?? "").toLowerCase().includes(s),
    );
  }, [q.data, search]);

  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    if (makeAdmin) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) toast.error(error.message); else toast.success("Promoted to admin");
    } else {
      if (userId === me?.id) { toast.error("You can't revoke your own admin role here."); return; }
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) toast.error(error.message); else toast.success("Admin revoked");
    }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const stats = {
    total: q.data?.length ?? 0,
    admins: q.data?.filter((u: any) => u.roles.includes("admin")).length ?? 0,
    last30: q.data?.filter((u: any) => new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 3600 * 1000)).length ?? 0,
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl flex items-center gap-2"><Users className="h-7 w-7" /> Users</h1>
        <div className="flex gap-2">
          <Stat label="Total" value={stats.total} />
          <Stat label="Admins" value={stats.admins} accent />
          <Stat label="New (30d)" value={stats.last30} />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or user id..."
          className="w-full pl-11 pr-4 py-3 rounded-full glass border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="glass rounded-2xl divide-y divide-border/40">
        {filtered.map((u: any) => {
          const isAdmin = u.roles.includes("admin");
          return (
            <div key={u.user_id} className="p-4 flex items-center gap-4 flex-wrap">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center text-sm font-semibold text-primary-foreground">
                  {(u.display_name ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{u.display_name ?? "Listener"}{u.user_id === me?.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</div>
                <div className="text-xs text-muted-foreground truncate">{u.user_id} · Joined {new Date(u.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                {u.roles.map((r: string) => (
                  <span key={r} className={`text-xs px-2 py-1 rounded-full ${r === "admin" ? "bg-gradient-gold text-primary-foreground" : "bg-secondary"}`}>{r}</span>
                ))}
                <button
                  onClick={() => toggleAdmin(u.user_id, !isAdmin)}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full glass hover:bg-secondary transition"
                  title={isAdmin ? "Revoke admin" : "Promote to admin"}
                >
                  {isAdmin ? <><ShieldOff className="h-3 w-3" /> Revoke</> : <><ShieldCheck className="h-3 w-3" /> Make admin</>}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="p-10 text-center text-muted-foreground">No users found.</div>}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-2">
        <Mail className="h-3 w-3" /> To delete or ban an account permanently, use the Supabase Auth dashboard (Authentication → Users).
      </p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`px-4 py-2 rounded-2xl glass ${accent ? "bg-gradient-card" : ""}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-xl">{value}</div>
    </div>
  );
}
