import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Search, Sun, Moon, Radio, LogOut, User as UserIcon } from "lucide-react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/podcasts", label: "Podcasts" },
  { to: "/vibes", label: "Vibes" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const t = getStoredTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const toggleTheme = () => {
    const n = theme === "dark" ? "light" : "dark";
    setTheme(n); applyTheme(n);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav({ to: "/podcasts", search: { q: q.trim() } as never });
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center shadow-3d group-hover:scale-110 transition">
            <Radio className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg">Sauti ya Zamani</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Old-School East Africa</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2 rounded-lg text-sm hover:bg-secondary transition"
              activeProps={{ className: "px-3 py-2 rounded-lg text-sm text-primary bg-secondary" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch} className="hidden lg:flex items-center flex-1 max-w-sm ml-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search podcasts..."
              className="w-full pl-9 pr-3 py-2 rounded-full bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto lg:ml-2">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-secondary transition" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin" className="text-xs px-3 py-2 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine">
                  Admin
                </Link>
              )}
              <Link to="/history" className="text-xs px-3 py-2 rounded-full hover:bg-secondary transition" title="My listening">
                History
              </Link>
              <Link to="/dashboard" className="p-2 rounded-full hover:bg-secondary transition" aria-label="Account">
                <UserIcon className="h-4 w-4" />
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="p-2 rounded-full hover:bg-secondary transition"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center text-xs px-4 py-2 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine hover:scale-105 transition"
            >
              Sign in
            </Link>
          )}

          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-full hover:bg-secondary transition" aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/50 px-4 py-3 space-y-1 animate-fade-up">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm hover:bg-secondary"
            >
              {n.label}
            </Link>
          ))}
          {!user && (
            <Link to="/auth" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm bg-gradient-gold text-primary-foreground font-semibold text-center">
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
