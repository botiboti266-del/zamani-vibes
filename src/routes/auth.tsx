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

async function sendBrandedEmail(payload: { to: string; subject: string; html: string }) {
  try {
    await supabase.functions.invoke("send-email", { body: payload });
  } catch (e) {
    console.warn("send-email failed", e);
  }
}

function welcomeHtml(name: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;background:#0b0b0d;color:#f5f3ee;padding:32px;border-radius:16px;max-width:560px;margin:auto">
    <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#c9a84c">Karibu</div>
    <h1 style="font-family:Georgia,serif;font-size:32px;margin:8px 0 16px">Welcome to Sauti ya Zamani, ${name}!</h1>
    <p style="font-size:15px;line-height:1.7;color:#d7d2c5">You've just joined a community that lives for old-school Bongo, Kenyan classics, and the stories behind the sound.</p>
    <p style="font-size:15px;line-height:1.7;color:#d7d2c5">Start with a featured episode, sip a chai, and rudi nyuma kidogo.</p>
    <p style="margin-top:24px"><a href="${typeof window !== "undefined" ? window.location.origin : ""}/podcasts" style="display:inline-block;background:linear-gradient(135deg,#f5c451,#b8860b);color:#0b0b0d;font-weight:700;padding:12px 22px;border-radius:999px;text-decoration:none">Browse episodes →</a></p>
  </div>`;
}
function resetHtml(link: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;background:#0b0b0d;color:#f5f3ee;padding:32px;border-radius:16px;max-width:560px;margin:auto">
    <h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 16px">Reset your password</h1>
    <p style="font-size:15px;line-height:1.7;color:#d7d2c5">You requested to reset your Sauti ya Zamani password. Click below — the link expires in 1 hour.</p>
    <p style="margin-top:24px"><a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#f5c451,#b8860b);color:#0b0b0d;font-weight:700;padding:12px 22px;border-radius:999px;text-decoration:none">Reset password</a></p>
    <p style="font-size:11px;color:#777;margin-top:32px">If you didn't request this, ignore this email.</p>
  </div>`;
}

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
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
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { display_name: name } },
        });
        if (error) throw error;
        await sendBrandedEmail({ to: email, subject: "Karibu to Sauti ya Zamani 🎙️", html: welcomeHtml(name || "friend") });
        toast.success("Account created — welcome email on the way!");
      } else if (mode === "reset") {
        const link = `${window.location.origin}/auth`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: link });
        if (error) throw error;
        await sendBrandedEmail({ to: email, subject: "Reset your Sauti ya Zamani password", html: resetHtml(link) });
        toast.success("Check your email for the reset link.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Karibu tena!");
        nav({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8 animate-fade-up">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center shadow-3d"><Radio className="h-5 w-5 text-primary-foreground" /></div>
          <span className="font-display text-2xl">Sauti ya Zamani</span>
        </Link>
        <h1 className="font-display text-3xl">
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Join the listeners" : "Reset password"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "signin" && "Sign in to comment, like, and save your progress."}
          {mode === "signup" && "Free forever. Stories that travel back in time."}
          {mode === "reset" && "Enter your email and we'll send you a reset link."}
        </p>
      </div>

      <form onSubmit={submit} className="glass rounded-3xl p-6 space-y-4 shadow-elegant">
        {mode === "signup" && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" required className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        {mode !== "reset" && (
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        )}
        <button disabled={loading} className="w-full px-6 py-3 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine hover:scale-[1.02] transition disabled:opacity-60">
          {loading ? "..." : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-muted-foreground hover:text-primary">
            {mode === "signin" ? "No account? Sign up" : mode === "signup" ? "Have an account? Sign in" : "Back to sign in"}
          </button>
          {mode === "signin" && (
            <button type="button" onClick={() => setMode("reset")} className="text-muted-foreground hover:text-primary">
              Forgot password?
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
