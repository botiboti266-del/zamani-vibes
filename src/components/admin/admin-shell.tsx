import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Mic, FileText, MessageSquare, Mail, Users,
  Tag, Music4, BarChart3, Inbox, Home, Globe, Sparkles, Headphones, Bot, Newspaper, Film, Radio,
} from "lucide-react";

const ITEMS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/homepage", label: "Homepage", icon: Home },
  { to: "/admin/podcasts", label: "Podcasts", icon: Mic },
  { to: "/admin/videos", label: "Videos", icon: Film },
  { to: "/admin/live", label: "Live on Air", icon: Radio },
  { to: "/admin/blog", label: "Blog", icon: FileText },
  { to: "/admin/news", label: "News", icon: Newspaper },
  { to: "/admin/vibes", label: "Daily Vibes", icon: Sparkles },
  { to: "/admin/studio", label: "Studio", icon: Music4 },
  { to: "/admin/comments", label: "Comments", icon: MessageSquare },
  { to: "/admin/auto-comments", label: "Auto-comments", icon: Bot },
  { to: "/admin/messages", label: "Inbox", icon: Inbox },
  { to: "/admin/subscribers", label: "Newsletter", icon: Mail },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/plays", label: "Plays", icon: Headphones },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/seo", label: "SEO", icon: Globe },
  { to: "/admin/users", label: "Users", icon: Users },
];


export function AdminShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8 grid lg:grid-cols-[220px_1fr] gap-6">
      <aside className="glass rounded-2xl p-3 h-fit sticky top-20">
        <div className="px-3 pt-2 pb-3">
          <div className="text-xs uppercase tracking-widest text-[color:var(--gold)]">Studio</div>
          <div className="font-display text-lg">Admin</div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {ITEMS.map((i) => {
            const active = i.exact ? loc.pathname === i.to : loc.pathname.startsWith(i.to);
            const Icon = i.icon;
            return (
              <Link
                key={i.to}
                to={i.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${active ? "bg-gradient-gold text-primary-foreground font-semibold" : "hover:bg-secondary"}`}
              >
                <Icon className="h-4 w-4" /> {i.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
