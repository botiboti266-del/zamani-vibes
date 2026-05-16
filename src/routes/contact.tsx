import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Phone, Mail, MessageCircle, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact — Sauti ya Zamani" },
      { name: "description", content: "Get in touch with Sauti ya Zamani. Phone, email, or send us a message." },
      { property: "og:title", content: "Contact Sauti ya Zamani" },
      { property: "og:description", content: "Reach the Sauti ya Zamani team — call, email, or WhatsApp." },
    ],
  }),
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().min(2, "Subject too short").max(200),
  message: z.string().trim().min(10, "Message too short").max(2000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    setLoading(false);
    if (error) toast.error("Couldn't send — try again");
    else {
      toast.success("Asante! We'll be in touch.");
      setForm({ name: "", email: "", subject: "", message: "" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-6 py-16">
      <div className="text-center space-y-3 animate-fade-up mb-12">
        <span className="text-xs uppercase tracking-widest text-[color:var(--gold)]">Reach out</span>
        <h1 className="font-display text-4xl md:text-5xl">Let's talk</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Got a story to share, a guest to recommend, or want to collaborate? We'd love to hear from you.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
        <div className="space-y-4">
          {[
            { icon: Phone, label: "Phone", value: "+254 725 409 996", href: "tel:+254725409996" },
            { icon: Mail, label: "Email", value: "omaryw003@gmail.com", href: "mailto:omaryw003@gmail.com" },
            { icon: MessageCircle, label: "WhatsApp", value: "+254 725 409 996", href: "https://wa.me/254725409996" },
          ].map((c, i) => (
            <a key={i} href={c.href} className="card-3d block glass rounded-2xl p-5 hover:bg-secondary transition">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-gold flex items-center justify-center shadow-3d">
                  <c.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</div>
                  <div className="font-display text-lg">{c.value}</div>
                </div>
              </div>
            </a>
          ))}
        </div>

        <form onSubmit={submit} className="glass rounded-3xl p-6 lg:p-8 space-y-4 animate-fade-up">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} className="input" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={255} className="input" />
            </Field>
          </div>
          <Field label="Subject">
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required maxLength={200} className="input" />
          </Field>
          <Field label="Message">
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required maxLength={2000} rows={6} className="input resize-none" />
          </Field>
          <button disabled={loading} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-gold text-primary-foreground font-semibold shadow-3d btn-shine hover:scale-[1.02] transition disabled:opacity-60">
            <Send className="h-4 w-4" /> {loading ? "Sending..." : "Send message"}
          </button>
        </form>
      </div>

      <style>{`.input{width:100%;padding:0.75rem 1rem;border-radius:0.75rem;background:var(--color-secondary);border:1px solid var(--color-border);color:var(--color-foreground);outline:none}.input:focus{box-shadow:0 0 0 2px var(--color-ring)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
