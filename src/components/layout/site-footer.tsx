import { Link } from "@tanstack/react-router";
import { Radio, Mail, Share2, AtSign, Camera, Video } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    setLoading(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.info("You're already subscribed");
      else toast.error("Couldn't subscribe — try again");
    } else {
      toast.success("Karibu! Check your inbox soon.");
      setEmail("");
    }
  };

  return (
    <footer className="mt-24 border-t border-border/50 glass">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2 space-y-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center shadow-3d">
              <Radio className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl">Sauti ya Zamani</span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-md">
            The home of old-school Bongo and Kenyan storytelling. Honest conversations,
            nostalgic interviews, and the music culture that shaped a generation.
          </p>
          <form onSubmit={subscribe} className="flex gap-2 max-w-md">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email for the weekly drop"
              className="flex-1 px-4 py-2 rounded-full bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <button disabled={loading} className="px-4 py-2 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold btn-shine disabled:opacity-60">
              {loading ? "..." : "Subscribe"}
            </button>
          </form>
        </div>

        <div>
          <h4 className="font-display text-base mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/podcasts" className="hover:text-primary">All Podcasts</Link></li>
            <li><Link to="/blog" className="hover:text-primary">Blog</Link></li>
            <li><Link to="/about" className="hover:text-primary">About</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-base mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-primary">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-primary">Terms</Link></li>
            <li className="flex items-center gap-1"><Mail className="h-3 w-3" /> omaryw003@gmail.com</li>
          </ul>
          <div className="flex gap-3 mt-4">
            {[Share2, AtSign, Camera, Video].map((I, i) => (
              <a key={i} href="#" className="p-2 rounded-full bg-secondary hover:bg-gradient-gold hover:text-primary-foreground transition">
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border/40 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sauti ya Zamani. Crafted with nostalgia for East Africa.
      </div>
    </footer>
  );
}
