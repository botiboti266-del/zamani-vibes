// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// We add the Netlify TanStack Start plugin alongside the Cloudflare output so the same
// project deploys to both Lovable (Workers) and Netlify (Functions) with SSR.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import netlify from "@netlify/vite-plugin-tanstack-start";

export default defineConfig({
  plugins: [netlify()],
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      outDir: ".output",
    },
    environments: {
      client: {
        build: {
          outDir: ".output/public",
        },
      },
      ssr: {
        build: {
          outDir: ".output/server",
        },
      },
    },
  },
});
