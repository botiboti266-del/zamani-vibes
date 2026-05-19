import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/vibes")({ component: AdminVibes });

function AdminVibes() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-vibes"],
    queryFn: async () => (await supabase.from("daily_vibes").select("*").order("date", { ascending: false }).limit(100)).data ?? [],
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-daily-vibe", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      if (d?.skipped) toast.info("Today's vibe already exists.");
      else toast.success("New vibe generated!");
      qc.invalidateQueries({ queryKey: ["admin-vibes"] });
      qc.invalidateQueries({ queryKey: ["vibes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to generate"),
  });

  const del = async (id: string) => {
    if (!confirm("Delete this vibe?")) return;
    await supabase.from("daily_vibes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-vibes"] });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl flex items-center gap-2"><Sparkles className="h-7 w-7 text-[color:var(--gold)]" /> Daily Vibes</h1>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine disabled:opacity-60"
        >
          {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate today's vibe
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        A new vibe is automatically generated daily at 06:00 UTC. Use the button to force-generate now (skipped if today already exists).
      </p>

      <div className="glass rounded-2xl divide-y divide-border/40">
        {q.data?.map((v: any) => (
          <div key={v.id} className="p-4 flex items-start gap-4">
            <div className="text-xs uppercase tracking-widest text-[color:var(--gold)] w-28 shrink-0 pt-1">{new Date(v.date).toLocaleDateString()}</div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg">{v.title}</div>
              <p className="text-sm text-muted-foreground line-clamp-2">{v.body}</p>
              {v.mood && <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-secondary">{v.mood}</span>}
            </div>
            <button onClick={() => del(v.id)} className="text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-secondary transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {q.data?.length === 0 && <div className="p-10 text-center text-muted-foreground">No vibes yet. Click "Generate today's vibe" above.</div>}
      </div>
    </div>
  );
}
