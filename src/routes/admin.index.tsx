import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mic, FileText, Users, Inbox, Mail, Headphones } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [p, b, s, m, n, l] = await Promise.all([
        supabase.from("podcasts").select("id", { count: "exact", head: true }),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
        supabase.from("podcasts").select("listen_count"),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }),
      ]);
      const listens = (s.data ?? []).reduce((a: number, r: any) => a + (r.listen_count ?? 0), 0);
      return {
        podcasts: p.count ?? 0,
        posts: b.count ?? 0,
        listens,
        unread: m.count ?? 0,
        subs: n.count ?? 0,
        users: l.count ?? 0,
      };
    },
  });

  const recent = useQuery({
    queryKey: ["admin-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("podcasts")
        .select("id,title,slug,status,listen_count,created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Podcasts", icon: Mic, value: stats.data?.podcasts ?? 0, to: "/admin/podcasts" },
    { label: "Blog posts", icon: FileText, value: stats.data?.posts ?? 0, to: "/admin/blog" },
    { label: "Total listens", icon: Headphones, value: stats.data?.listens ?? 0, to: "/admin/analytics" },
    { label: "Unread messages", icon: Inbox, value: stats.data?.unread ?? 0, to: "/admin/messages" },
    { label: "Subscribers", icon: Mail, value: stats.data?.subs ?? 0, to: "/admin/subscribers" },
    { label: "Users", icon: Users, value: stats.data?.users ?? 0, to: "/admin/users" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl">Karibu, msanii.</h1>
        <p className="text-sm text-muted-foreground">Here's how Sauti ya Zamani is sounding today.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="glass rounded-2xl p-5 hover:shadow-elegant transition card-3d">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</div>
                <div className="font-display text-3xl mt-1">{c.value.toLocaleString()}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground">
                <c.icon className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">Recent podcasts</h2>
          <Link to="/admin/podcasts/new" className="text-xs px-4 py-2 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine">+ New podcast</Link>
        </div>
        <div className="glass rounded-2xl divide-y divide-border/40">
          {recent.data?.map((p: any) => (
            <Link key={p.id} to="/admin/podcasts/$id" params={{ id: p.id }} className="flex items-center justify-between p-4 hover:bg-secondary/50 transition">
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.status} · {p.listen_count ?? 0} listens</div>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
            </Link>
          ))}
          {recent.data?.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No podcasts yet. Create your first.</div>
          )}
        </div>
      </div>
    </div>
  );
}
