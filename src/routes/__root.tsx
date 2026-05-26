import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  ScriptOnce,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { PlayerProvider } from "@/components/player/player-context";
import { StickyPlayer } from "@/components/player/sticky-player";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display text-gradient-gold">404</h1>
        <h2 className="mt-4 text-xl font-display">This frequency is silent</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're tuning into doesn't exist.
        </p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-gold text-primary-foreground px-5 py-2 text-sm font-semibold btn-shine">
          Back home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-display">Static on the line</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong loading this page.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-gradient-gold text-primary-foreground px-5 py-2 text-sm font-semibold btn-shine"
          >
            Try again
          </button>
          <a href="/" className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-secondary">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sauti ya Zamani — Old-School Bongo & Kenyan Podcasts" },
      { name: "description", content: "Old-school Bongo & Kenyan podcasts, interviews, and music culture stories. Tune into Sauti ya Zamani — the nostalgic sound of East Africa." },
      { name: "author", content: "Sauti ya Zamani" },
      { name: "theme-color", content: "#1a1428" },
      { property: "og:site_name", content: "Sauti ya Zamani" },
      { property: "og:title", content: "Sauti ya Zamani — Old-School Bongo & Kenyan Podcasts" },
      { property: "og:description", content: "Old-school Bongo & Kenyan podcasts, interviews, and music culture stories. Tune into Sauti ya Zamani — the nostalgic sound of East Africa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sauti ya Zamani — Old-School Bongo & Kenyan Podcasts" },
      { name: "twitter:description", content: "Old-school Bongo & Kenyan podcasts, interviews, and music culture stories. Tune into Sauti ya Zamani — the nostalgic sound of East Africa." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/413a6553-8cb3-4113-bbdf-508fa760856b/id-preview-dc59d5b3--fce6d363-a20a-4b61-ae94-407895bcb9e3.lovable.app-1779785351946.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/413a6553-8cb3-4113-bbdf-508fa760856b/id-preview-dc59d5b3--fce6d363-a20a-4b61-ae94-407895bcb9e3.lovable.app-1779785351946.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@300;400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeScript = `(function(){try{var t=localStorage.getItem('syz-theme')||'dark';document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ScriptOnce>{themeScript}</ScriptOnce>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        <div className="flex flex-col min-h-screen">
          <SiteHeader />
          <main className="flex-1 pb-32">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
        <WhatsAppButton />
        <StickyPlayer />
        <Toaster position="top-center" theme="dark" richColors closeButton />
      </PlayerProvider>
    </QueryClientProvider>
  );
}
