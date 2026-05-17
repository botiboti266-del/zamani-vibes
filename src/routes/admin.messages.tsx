import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Mail, MailOpen, Inbox } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/messages")({
  component: Messages,
});

function Messages() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => (await supabase.from("contact_messages").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const mark = async (id: string, read: boolean) => {
    await supabase.from("contact_messages").update({ read }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete message?")) return;
    await supabase.from("contact_messages").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
    toast.success("Deleted");
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="font-display text-3xl flex items-center gap-2"><Inbox className="h-7 w-7" /> Inbox</h1>
      <div className="glass rounded-2xl divide-y divide-border/40">
        {q.data?.map((m) => (
          <div key={m.id} className={`p-4 ${!m.read ? "bg-secondary/30" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-xs text-muted-foreground">&lt;{m.email}&gt;</span>
                  {!m.read && <span className="text-[10px] uppercase tracking-widest text-[color:var(--gold)]">new</span>}
                </div>
                <div className="text-sm font-medium mt-0.5">{m.subject}</div>
                <p className="text-sm mt-2 text-muted-foreground whitespace-pre-wrap">{m.message}</p>
                <div className="text-xs text-muted-foreground mt-2">{new Date(m.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => mark(m.id, !m.read)} className="p-2 rounded-lg hover:bg-secondary" title={m.read ? "Mark unread" : "Mark read"}>
                  {m.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                </button>
                <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`} className="px-3 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-xs font-semibold">Reply</a>
                <button onClick={() => del(m.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {q.data?.length === 0 && <div className="p-10 text-center text-muted-foreground">No messages.</div>}
      </div>
    </div>
  );
}
