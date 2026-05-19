// Notify all confirmed newsletter subscribers about a new published episode.
// Called from the admin UI or pg_cron when a podcast is published.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function emailHtml(p: { title: string; summary?: string; cover?: string; url: string }) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#0b0b0d;color:#f5f3ee;padding:32px;border-radius:16px;max-width:560px;margin:auto">
    <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#c9a84c">New episode • Sauti ya Zamani</div>
    <h1 style="font-family:Georgia,serif;font-size:28px;margin:8px 0 16px">${escapeHtml(p.title)}</h1>
    ${p.cover ? `<img src="${p.cover}" alt="" style="width:100%;border-radius:12px;margin-bottom:16px"/>` : ""}
    ${p.summary ? `<p style="font-size:15px;line-height:1.6;color:#d7d2c5">${escapeHtml(p.summary)}</p>` : ""}
    <p style="margin-top:24px"><a href="${p.url}" style="display:inline-block;background:linear-gradient(135deg,#f5c451,#b8860b);color:#0b0b0d;font-weight:700;padding:12px 22px;border-radius:999px;text-decoration:none">Listen now →</a></p>
    <p style="font-size:11px;color:#777;margin-top:32px">You're receiving this because you subscribed to Sauti ya Zamani.</p>
  </div>`;
}
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { podcast_id } = await req.json();
    if (!podcast_id) return new Response(JSON.stringify({ error: "podcast_id required" }), { status: 400, headers: corsHeaders });

    const pRes = await fetch(`${SUPABASE_URL}/rest/v1/podcasts?id=eq.${podcast_id}&select=title,slug,summary,cover_image`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const [podcast] = await pRes.json();
    if (!podcast) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });

    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?select=email&confirmed=eq.true`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const subs = (await sRes.json()) as { email: string }[];
    if (!subs.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: corsHeaders });

    const origin = req.headers.get("origin") ?? "https://sautiyazamani.lovable.app";
    const url = `${origin}/podcasts/${podcast.slug}`;
    const html = emailHtml({ title: podcast.title, summary: podcast.summary, cover: podcast.cover_image, url });

    // Send in batches of 40 to avoid rate-limits / single big to-list.
    const batches: string[][] = [];
    for (let i = 0; i < subs.length; i += 40) batches.push(subs.slice(i, i + 40).map((s) => s.email));
    let sent = 0;
    for (const batch of batches) {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ to: batch, subject: `🎙️ New episode: ${podcast.title}`, html }),
      });
      if (r.ok) sent += batch.length;
      else console.error("batch failed", await r.text());
    }
    return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
