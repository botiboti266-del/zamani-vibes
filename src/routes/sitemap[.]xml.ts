import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries = ["/", "/podcasts", "/blog", "/about", "/contact", "/privacy", "/terms"];

        const [{ data: podcasts }, { data: posts }] = await Promise.all([
          supabase.from("podcasts").select("slug,updated_at").eq("status", "published"),
          supabase.from("blog_posts").select("slug,updated_at").eq("status", "published"),
        ]);

        type Entry = { loc: string; lastmod?: string; changefreq: string; priority: string };
        const urls: Entry[] = [
          ...staticEntries.map((p): Entry => ({ loc: p, changefreq: "weekly", priority: p === "/" ? "1.0" : "0.7" })),
          ...(podcasts ?? []).map((p): Entry => ({ loc: `/podcasts/${p.slug}`, lastmod: p.updated_at, changefreq: "monthly", priority: "0.8" })),
          ...(posts ?? []).map((p): Entry => ({ loc: `/blog/${p.slug}`, lastmod: p.updated_at, changefreq: "monthly", priority: "0.6" })),
        ];

        const body = urls.map((u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ""}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
        ).join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
