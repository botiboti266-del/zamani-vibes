// Auto-comment bot dispatcher. Called by pg_cron every 5 minutes.
// For each enabled schedule whose next_run_at <= now(), generates a
// brand-voice comment via Lovable AI Gateway and posts it as a random
// active bot from the configured EA country pool.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const GW = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function sb(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });
}

async function generateComment(podcastTitle: string, summary: string | null, style: string) {
  const r = await fetch(GW, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an East African podcast listener writing a short, authentic comment in English (with occasional Swahili greetings like "Asante", "Pole sana", "Hongera"). Keep it 1-3 sentences, warm, specific, and reflective of the episode. No emojis spam, no hashtags, no links. Brand voice: ${style || "Sauti ya Zamani — nostalgic old-school East African culture, premium and warm."}`,
        },
        {
          role: "user",
          content: `Episode title: ${podcastTitle}\nSummary: ${summary ?? "(no summary)"}\n\nWrite ONE short listener comment.`,
        },
      ],
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j: any = await r.json();
  return (j.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // 1. fetch due schedules with podcast info
    const dueRes = await sb(`podcast_comment_schedules?enabled=eq.true&next_run_at=lte.${new Date().toISOString()}&select=id,podcast_id,interval_minutes,style_prompt,total_posted`);
    const due = await dueRes.json();
    if (!Array.isArray(due) || due.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const botsRes = await sb(`comment_bots?active=eq.true&select=id,display_name`);
    const bots = await botsRes.json();
    if (!Array.isArray(bots) || bots.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "No active bots" }), { status: 400, headers: corsHeaders });
    }

    let processed = 0;
    for (const s of due) {
      try {
        const pRes = await sb(`podcasts?id=eq.${s.podcast_id}&select=title,summary,status`);
        const [pod] = await pRes.json();
        if (!pod || pod.status !== "published") continue;

        const content = await generateComment(pod.title, pod.summary, s.style_prompt);
        if (!content) continue;

        const bot = bots[Math.floor(Math.random() * bots.length)];
        await sb(`podcast_comments`, {
          method: "POST",
          body: JSON.stringify({ podcast_id: s.podcast_id, bot_id: bot.id, user_id: null, content }),
        });

        const next = new Date(Date.now() + s.interval_minutes * 60_000).toISOString();
        await sb(`podcast_comment_schedules?id=eq.${s.id}`, {
          method: "PATCH",
          body: JSON.stringify({ last_run_at: new Date().toISOString(), next_run_at: next, total_posted: (s.total_posted ?? 0) + 1 }),
        });
        processed++;
      } catch (e) {
        console.error("schedule failed", s.id, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
