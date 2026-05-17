import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md text-center py-24 px-4">
        <ShieldAlert className="h-10 w-10 mx-auto text-[color:var(--gold)]" />
        <h1 className="mt-4 font-display text-3xl">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account isn't an admin yet. Ask the platform owner to grant you access.</p>
        <Link to="/" className="mt-6 inline-flex px-5 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine">Home</Link>
      </div>
    );
  }
  return <>{children}</>;
}
