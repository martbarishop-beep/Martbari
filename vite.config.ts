import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const hasValidSupabaseOrigin =
    Boolean(supabaseUrl) &&
    !supabaseUrl!.includes('placeholder') &&
    /^https?:\/\//i.test(supabaseUrl!);

  let supabaseOrigin = '';
  if (hasValidSupabaseOrigin && supabaseUrl) {
    try {
      supabaseOrigin = new URL(supabaseUrl).origin;
    } catch {
      supabaseOrigin = '';
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-supabase-preconnect',
        transformIndexHtml(html) {
          if (!supabaseOrigin || html.includes(supabaseOrigin)) {
            return html;
          }
          const tags = `    <link rel="preconnect" href="${supabaseOrigin}" crossorigin />\n    <link rel="dns-prefetch" href="${supabaseOrigin}" />\n`;
          return html.replace('</head>', `${tags}  </head>`);
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.png'],
        manifest: {
          id: '/',
          name: 'MartBari - Your One-Stop Online Shop',
          short_name: 'MartBari',
          description:
            'আপনার এক ঠিকানার অনলাইন শপ - Electronics, gadgets and home appliances in Bangladesh with Cash on Delivery.',
          theme_color: '#17263E',
          background_color: '#F5F7FA',
          display: 'standalone',
          start_url: '/bn',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === 'navigate' &&
                !/^\/sitemap.*\.xml$/i.test(url.pathname) &&
                url.pathname !== '/robots.txt' &&
                !url.pathname.startsWith('/admin'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'martbari-pages-v1',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 24 * 60 * 60,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
      // Copies src/assets into dist/ so root-relative URLs still resolve in production builds.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('recharts')) {
                return 'vendor-recharts';
              }
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'vendor-i18n';
              }
              return 'vendor-other';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
