import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Radio } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Sauti ya Zamani" }, { name: "robots", content: "noindex" }] }),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { user } = useAuth();

  useEffect(() => { if (user) nav({ to: "/dashboard" }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { display_name: name } },
      });
      if (error) toast.error(error.message);
      else toast.success("Account created — check your email if confirmation is required.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else { toast.success("Karibu tena!"); nav({ to: "/dashboard" }); }
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8 animate-fade-up">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center shadow-3d"><Radio className="h-5 w-5 text-primary-foreground" /></div>
          <span className="font-display text-2xl">Sauti ya Zamani</span>
        </Link>
        <h1 className="font-display text-3xl">{mode === "signin" ? "Welcome back" : "Join the listeners"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{mode === "signin" ? "Sign in to comment, like, and save your progress." : "Free forever. No copyrighted music — just stories."}</p>
      </div>

      <form onSubmit={submit} className="glass rounded-3xl p-6 space-y-4 shadow-elegant">
        {mode === "signup" && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" required className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        <button disabled={loading} className="w-full px-6 py-3 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine hover:scale-[1.02] transition disabled:opacity-60">
          {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-sm text-muted-foreground hover:text-primary transition">
          {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
