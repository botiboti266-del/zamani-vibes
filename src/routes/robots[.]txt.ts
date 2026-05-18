import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const { data } = await supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle();
        const robots = ((data?.value as any)?.robots as string) ?? "User-agent: *\nAllow: /\nSitemap: /sitemap.xml";
        return new Response(robots, {
          headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
