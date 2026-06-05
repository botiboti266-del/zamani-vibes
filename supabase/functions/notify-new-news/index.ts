// Notify all confirmed newsletter subscribers about a newly published news item.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function esc(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
function html(p: { title: string; excerpt?: string; cover?: string; url: string }) {
  return `<div style="font-family:Inter,Arial,sans-serif;background:#0b0b0d;color:#f5f3ee;padding:32px;border-radius:16px;max-width:560px;margin:auto">
    <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#c9a84c">News • Zamani Vibes</div>
    <h1 style="font-family:Georgia,serif;font-size:28px;margin:8px 0 16px">${esc(p.title)}</h1>
    ${p.cover ? `<img src="${p.cover}" alt="" style="width:100%;border-radius:12px;margin-bottom:16px"/>` : ""}
    ${p.excerpt ? `<p style="font-size:15px;line-height:1.6;color:#d7d2c5">${esc(p.excerpt)}</p>` : ""}
    <p style="margin-top:24px"><a href="${p.url}" style="display:inline-block;background:linear-gradient(135deg,#f5c451,#b8860b);color:#0b0b0d;font-weight:700;padding:12px 22px;border-radius:999px;text-decoration:none">Read news →</a></p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { news_id } = await req.json();
    if (!news_id) return new Response(JSON.stringify({ error: "news_id required" }), { status: 400, headers: corsHeaders });

    const r = await fetch(`${SUPABASE_URL}/rest/v1/news?id=eq.${news_id}&select=title,slug,excerpt,cover_image`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const [item] = await r.json();
    if (!item) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });

    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?select=email&confirmed=eq.true`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const subs = (await sRes.json()) as { email: string }[];
    if (!subs.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: corsHeaders });

    const origin = req.headers.get("origin") ?? "https://safi-sauti-archive.lovable.app";
    const url = `${origin}/news/${item.slug}`;
    const body = html({ title: item.title, excerpt: item.excerpt, cover: item.cover_image, url });

    let sent = 0;
    for (let i = 0; i < subs.length; i += 40) {
      const batch = subs.slice(i, i + 40).map((s) => s.email);
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ to: batch, subject: `📰 News: ${item.title}`, html: body }),
      });
      if (resp.ok) sent += batch.length;
    }
    return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
