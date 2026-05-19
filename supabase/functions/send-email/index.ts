// Generic Gmail SMTP sender using denomailer
// Used by signup welcome, password reset notice, new episode alerts.
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = Deno.env.get("GMAIL_USERNAME");
    const pass = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!user || !pass) {
      return new Response(JSON.stringify({ error: "GMAIL_USERNAME / GMAIL_APP_PASSWORD missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = (await req.json()) as Payload;
    if (!body?.to || !body?.subject || !body?.html) {
      return new Response(JSON.stringify({ error: "to, subject, html are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: user, password: pass },
      },
    });

    const tos = Array.isArray(body.to) ? body.to : [body.to];
    await client.send({
      from: `${body.from_name ?? "Sauti ya Zamani"} <${user}>`,
      to: tos,
      subject: body.subject,
      content: body.text ?? body.html.replace(/<[^>]+>/g, " "),
      html: body.html,
    });
    await client.close();

    return new Response(JSON.stringify({ ok: true, sent: tos.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
