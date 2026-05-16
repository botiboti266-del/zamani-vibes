import { createFileRoute } from "@tanstack/react-router";
import founder from "@/assets/founder.jpg";
import { Radio, Heart, Mic, Music } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({
    meta: [
      { title: "About — Sauti ya Zamani" },
      { name: "description", content: "The story behind Sauti ya Zamani — preserving East African music culture and old-school stories." },
      { property: "og:title", content: "About Sauti ya Zamani" },
      { property: "og:description", content: "The story behind the platform that preserves old-school East African storytelling." },
      { property: "og:image", content: founder },
    ],
  }),
});

function About() {
  return (
    <div className="mx-auto max-w-5xl px-4 lg:px-6 py-16">
      <div className="grid md:grid-cols-[1fr_1.3fr] gap-10 items-center">
        <div className="relative card-3d">
          <div className="absolute -inset-4 bg-gradient-gold opacity-20 blur-3xl rounded-full" />
          <img
            src={founder}
            alt="Founder of Sauti ya Zamani"
            className="relative rounded-3xl shadow-3d w-full"
          />
        </div>

        <div className="space-y-6 animate-fade-up">
          <span className="text-xs uppercase tracking-widest text-[color:var(--gold)]">Our story</span>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
            Preserving the <span className="text-gradient-gold italic">sauti</span> of a generation.
          </h1>
          <p className="text-lg text-muted-foreground">
            Sauti ya Zamani was built to honor the voices, the rhythms, and the stories that shaped East African
            popular culture — from the golden era of Bongo Flava in Dar es Salaam to the rise of Genge and
            Kapuka in Nairobi.
          </p>
          <p className="text-muted-foreground">
            We record long-form interviews, dig into music history, and publish honest conversations about an
            era of African entertainment that deserves more than a footnote. Every podcast you hear here is
            original work — produced with permission, with care, and with respect for the artists whose
            culture we celebrate.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
        {[
          { icon: Radio, title: "Original podcasts", body: "100% rights-cleared episodes. No copyrighted songs uploaded — ever." },
          { icon: Mic, title: "Long-form interviews", body: "Real conversations with the people who lived the history." },
          { icon: Music, title: "Music culture deep-dives", body: "From riddims to recording studios — context that matters." },
          { icon: Heart, title: "Made with nostalgia", body: "A love letter to old-school Bongo, Genge, and Kapuka." },
        ].map((b, i) => (
          <div key={i} className="card-3d glass rounded-2xl p-6 space-y-3">
            <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center shadow-3d">
              <b.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="font-display text-lg">{b.title}</h3>
            <p className="text-sm text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
