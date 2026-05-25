import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Headphones, Clock, Users } from "lucide-react";

export const Route = createFileRoute("/admin/plays")({
  component: PlaysPage,
});

function PlaysPage() {
  const q = useQuery({
    queryKey: ["admin-plays"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("listening_history")
        .select("*, podcast:podcasts(title,slug,duration)")
        .order("last_played_at", { ascending: false })
        .limit(200);
      const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
      let profs: any[] = [];
      if (ids.length > 0) {
        const { data } = await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", ids);
        profs = data ?? [];
      }
      return (rows ?? []).map((r: any) => ({ ...r, profile: profs.find((p) => p.user_id === r.user_id) ?? null }));
    },
  });

  const rows = q.data ?? [];
  const uniqueUsers = new Set(rows.map((r: any) => r.user_id)).size;
  const totalMinutes = Math.round(rows.reduce((s: number, r: any) => s + (r.position_seconds || 0), 0) / 60);

  return (
    <div className="space-y-8 animate-fade-up">
      <h1 className="font-display text-3xl flex items-center gap-2"><Headphones className="h-7 w-7" /> User plays</h1>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat icon={<Headphones />} label="Recent plays" value={rows.length} />
        <Stat icon={<Users />} label="Unique listeners" value={uniqueUsers} />
        <Stat icon={<Clock />} label="Total minutes" value={totalMinutes} />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left p-3">Listener</th>
              <th className="text-left p-3">Episode</th>
              <th className="text-left p-3">Progress</th>
              <th className="text-left p-3">Last played</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => {
              const pct = r.podcast?.duration ? Math.min(100, (r.position_seconds / r.podcast.duration) * 100) : 0;
              return (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {r.profile?.avatar_url ? (
                        <img src={r.profile.avatar_url} className="h-7 w-7 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-gradient-gold text-primary-foreground inline-flex items-center justify-center text-xs font-semibold">
                          {(r.profile?.display_name ?? "?")[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <span className="truncate max-w-[180px]">{r.profile?.display_name ?? r.user_id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="p-3 max-w-[280px] truncate">{r.podcast?.title ?? "—"}{r.completed && <span className="ml-2 text-[color:var(--gold)] text-xs">✓</span>}</td>
                  <td className="p-3 w-[200px]">
                    <div className="h-1.5 bg-secondary rounded overflow-hidden">
                      <div className="h-full bg-gradient-gold" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{Math.floor(r.position_seconds / 60)} min</div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.last_played_at).toLocaleString()}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No plays yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <div className="h-11 w-11 rounded-xl bg-gradient-gold text-primary-foreground inline-flex items-center justify-center shadow-3d">{icon}</div>
      <div><div className="text-2xl font-display">{value}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div></div>
    </div>
  );
}
