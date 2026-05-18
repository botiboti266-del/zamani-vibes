import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GW = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function callAI(messages: Array<{ role: string; content: string }>, schema?: object) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const body: any = { model: MODEL, messages };
  if (schema) {
    body.response_format = { type: "json_schema", json_schema: { name: "out", schema, strict: true } };
  }
  const r = await fetch(GW, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (r.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
  if (r.status === 402) throw new Error("AI credits exhausted. Add credits in Lovable settings.");
  if (!r.ok) throw new Error(`AI error ${r.status}`);
  const j: any = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export const aiSummarize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; context: string }) => d)
  .handler(async ({ data }) => {
    const out = await callAI(
      [
        { role: "system", content: "You are a podcast editor for an East African (Bongo/Kenya) old-school culture podcast. Return concise, warm, premium copy." },
        { role: "user", content: `Podcast title: ${data.title}\n\nContext:\n${data.context}\n\nProduce: (1) a 2-3 sentence summary, (2) 4-6 short topic tags (lowercase, no #).` },
      ],
      {
        type: "object",
        additionalProperties: false,
        required: ["summary", "tags"],
        properties: {
          summary: { type: "string" },
          tags: { type: "array", items: { type: "string" }, maxItems: 8 },
        },
      },
    );
    try { return JSON.parse(out) as { summary: string; tags: string[] }; }
    catch { return { summary: out, tags: [] }; }
  });

export const aiTranscribe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { description: string }) => d)
  .handler(async ({ data }) => {
    const out = await callAI([
      { role: "system", content: "Write a polished show-notes outline in markdown with sections: Overview, Highlights (bullets), Key Quotes, Links." },
      { role: "user", content: data.description },
    ]);
    return { notes: out };
  });

export const aiTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; description: string; durationSeconds?: number }) => d)
  .handler(async ({ data }) => {
    const out = await callAI([
      { role: "system", content: "You are a transcription assistant for an East African podcast. Given a brief, generate a realistic, well-formatted long-form transcript with speaker labels (HOST: / GUEST:) and natural conversation. Mix Swahili greetings sparingly. Return plain text only." },
      { role: "user", content: `Title: ${data.title}\nDuration: ${data.durationSeconds ?? 600}s\nBrief:\n${data.description}` },
    ]);
    return { transcript: out };
  });
