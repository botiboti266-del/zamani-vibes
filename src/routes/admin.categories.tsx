import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { Plus, Trash2, Tag } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: Cats,
});

function Cats() {
  return (
    <div className="space-y-10 animate-fade-up">
      <h1 className="font-display text-3xl flex items-center gap-2"><Tag className="h-7 w-7" /> Categories</h1>
      <Manager table="podcast_categories" title="Podcast categories" />
      <Manager table="blog_categories" title="Blog categories" />
    </div>
  );
}

function Manager({ table, title }: { table: "podcast_categories" | "blog_categories"; title: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const q = useQuery({
    queryKey: ["cats", table],
    queryFn: async () => (await supabase.from(table).select("*").order("name")).data ?? [],
  });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from(table).insert({ name: name.trim(), slug: slugify(name) });
    if (error) toast.error(error.message);
    else { setName(""); qc.invalidateQueries({ queryKey: ["cats", table] }); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete category?")) return;
    await supabase.from(table).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["cats", table] });
  };
  return (
    <section>
      <h2 className="font-display text-xl mb-3">{title}</h2>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="flex-1 px-4 py-2 rounded-xl bg-secondary border border-border text-sm" />
        <button className="px-4 py-2 rounded-xl bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Add</button>
      </form>
      <div className="glass rounded-2xl divide-y divide-border/40">
        {q.data?.map((c: any) => (
          <div key={c.id} className="p-3 flex items-center justify-between">
            <div><div className="font-medium text-sm">{c.name}</div><div className="text-xs text-muted-foreground">/{c.slug}</div></div>
            <button onClick={() => del(c.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {q.data?.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">None yet.</div>}
      </div>
    </section>
  );
}
