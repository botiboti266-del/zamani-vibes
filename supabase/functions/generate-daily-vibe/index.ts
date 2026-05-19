// Daily AI-generated old-school vibe. Triggered by pg_cron.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "body", "mood", "tags"],
  properties: {
    title: { type: "string", description: "Short evocative title, max 60 chars" },
    body: { type: "string", description: "3-5 short paragraphs of warm, nostalgic old-school East African vibes (Bongo / Kenyan). Sprinkle Swahili occasionally. Make readers feel high on nostalgia." },
    mood: { type: "string", description: "One word mood, e.g. 'Sunset', 'Matatu', 'Sherehe'" },
    tags: { type: "array", items: { type: "string" }, maxItems: 6 },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Skip if today's vibe already exists
    const ex = await fetch(`${SUPABASE_URL}/rest/v1/daily_vibes?date=eq.${today}&select=id`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const existing = await ex.json();
    if (Array.isArray(existing) && existing.length > 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a poetic curator of old-school East African music culture (Bongo Flava classics, Kenyan Genge/Kapuka, Swahili oldies, matatu culture, 90s/2000s nostalgia). Write warm, sensory, evocative prose in English with occasional Swahili phrases. Never break character." },
          { role: "user", content: `Date: ${today}. Generate today's "Vibe of the Day" — a daily nostalgic piece readers can sip on like chai. Make them feel high on memories.` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "vibe", schema: SCHEMA, strict: true } },
      }),
    });
    if (!ai.ok) {
      const t = await ai.text();
      console.error("AI failure", ai.status, t);
      return new Response(JSON.stringify({ error: `AI ${ai.status}: ${t}` }), { status: 500, headers: corsHeaders });
    }
    const aij = await ai.json();
    const content = aij.choices?.[0]?.message?.content ?? "{}";
    const vibe = JSON.parse(content);

    const ins = await fetch(`${SUPABASE_URL}/rest/v1/daily_vibes`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        date: today,
        title: vibe.title,
        body: vibe.body,
        mood: vibe.mood,
        tags: vibe.tags ?? [],
      }),
    });
    if (!ins.ok) {
      const t = await ins.text();
      return new Response(JSON.stringify({ error: t }), { status: 500, headers: corsHeaders });
    }
    const row = await ins.json();
    return new Response(JSON.stringify({ ok: true, vibe: row[0] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
