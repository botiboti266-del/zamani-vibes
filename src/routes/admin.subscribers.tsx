import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/subscribers")({
  component: Subs,
});

function Subs() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => (await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const del = async (id: string) => {
    if (!confirm("Remove subscriber?")) return;
    await supabase.from("newsletter_subscribers").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-subs"] });
    toast.success("Removed");
  };
  const exportCsv = () => {
    const rows = q.data ?? [];
    const csv = ["email,confirmed,created_at", ...rows.map((r: any) => `${r.email},${r.confirmed},${r.created_at}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "subscribers.csv";
    a.click();
  };
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl flex items-center gap-2"><Mail className="h-7 w-7" /> Newsletter</h1>
        <button onClick={exportCsv} className="px-4 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine inline-flex items-center gap-1"><Download className="h-4 w-4" /> Export CSV</button>
      </div>
      <div className="glass rounded-2xl divide-y divide-border/40">
        {q.data?.map((s: any) => (
          <div key={s.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{s.email}</div>
              <div className="text-xs text-muted-foreground">Joined {new Date(s.created_at).toLocaleDateString()}</div>
            </div>
            <button onClick={() => del(s.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {q.data?.length === 0 && <div className="p-10 text-center text-muted-foreground">No subscribers yet.</div>}
      </div>
    </div>
  );
}
