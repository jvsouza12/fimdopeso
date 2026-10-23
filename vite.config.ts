// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [VitePWA({
      strategies: "generateSW", filename: "sw.js", outDir: "dist/client",
      injectRegister: null, registerType: "autoUpdate", manifest: false,
      devOptions: { enabled: false },
      workbox: {
        globDirectory: "dist/client", globPatterns: ["**/*.{js,css,png,webmanifest}"],
        maximumFileSizeToCacheInBytes: 5000000,
        navigateFallback: null, skipWaiting: true, clientsClaim: true,
        importScripts: ["/notification-events.js"],
        runtimeCaching: [
          { urlPattern: ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin &&
              !/^\/(?:~oauth|_serverFn|api|auth|reset-password)(?:\/|$)/.test(url.pathname),
            handler: "NetworkFirst", options: { cacheName: "nutriplan-pages", networkTimeoutSeconds: 4, expiration: { maxEntries: 30, maxAgeSeconds: 604800 } } },
          { urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/.*-[\w-]{8,}\.(?:js|css)$/.test(url.pathname),
            handler: "CacheFirst", options: { cacheName: "nutriplan-assets", expiration: { maxEntries: 150, maxAgeSeconds: 2592000 } } },
        ],
      },
    })],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
