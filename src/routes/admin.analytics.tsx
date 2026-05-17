import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  component: Analytics,
});

function Analytics() {
  const top = useQuery({
    queryKey: ["analytics-top"],
    queryFn: async () => (await supabase.from("podcasts").select("title,listen_count").order("listen_count", { ascending: false }).limit(10)).data ?? [],
  });

  const growth = useQuery({
    queryKey: ["analytics-growth"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      const [u, s] = await Promise.all([
        supabase.from("profiles").select("created_at").gte("created_at", since),
        supabase.from("newsletter_subscribers").select("created_at").gte("created_at", since),
      ]);
      const days: Record<string, { day: string; users: number; subs: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400 * 1000).toISOString().slice(0, 10);
        days[d] = { day: d.slice(5), users: 0, subs: 0 };
      }
      (u.data ?? []).forEach((r: any) => { const d = r.created_at.slice(0, 10); if (days[d]) days[d].users++; });
      (s.data ?? []).forEach((r: any) => { const d = r.created_at.slice(0, 10); if (days[d]) days[d].subs++; });
      return Object.values(days);
    },
  });

  return (
    <div className="space-y-8 animate-fade-up">
      <h1 className="font-display text-3xl flex items-center gap-2"><BarChart3 className="h-7 w-7" /> Analytics</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-display text-lg mb-4">Top podcasts (listens)</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={top.data ?? []} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="title" width={120} stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => v.slice(0, 18)} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="listen_count" fill="url(#g1)" radius={6} />
                <defs><linearGradient id="g1" x1="0" x2="1"><stop offset="0%" stopColor="hsl(var(--primary))" /><stop offset="100%" stopColor="hsl(var(--accent))" /></linearGradient></defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-display text-lg mb-4">30-day growth</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={growth.data ?? []}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="subs" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
