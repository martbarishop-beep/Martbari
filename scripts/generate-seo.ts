import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  isDemoCategory,
  isDemoProduct,
} from '../src/config/demoCatalog';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SITE_ORIGIN = 'https://martbari.shop';

function resolveBuildSiteOrigin(): string {
  const candidates = [
    process.env.SITE_URL,
    process.env.VITE_SITE_URL,
    process.env.APP_URL,
  ];

  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed || trimmed.includes('placeholder')) continue;
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host.startsWith('127.') ||
        host.startsWith('ais-dev-') ||
        host.startsWith('ais-pre-')
      ) {
        continue;
      }
      if (host.startsWith('www.')) {
        parsed.hostname = host.slice(4);
      }
      parsed.protocol = 'https:';
      return parsed.origin;
    } catch {
      continue;
    }
  }

  return DEFAULT_SITE_ORIGIN;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const appUrl = resolveBuildSiteOrigin();

interface SeoProductEntry {
  id?: string;
  slug: string;
  sku?: string | null;
  updated_at?: string;
}

interface SeoCategoryEntry {
  id?: string;
  slug: string;
}

interface SeoPageEntry {
  slug: string;
  updated_at?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSeoFiles() {
  console.log(`Generating sitemap.xml and robots.txt for canonical origin: ${appUrl}`);

  let products: SeoProductEntry[] = [];
  let categories: SeoCategoryEntry[] = [];
  let pages: SeoPageEntry[] = [];
  let showDemoData = true;
  let connectedToSupabase = false;

  if (
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  ) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const settingsRes = await supabase
        .from('settings')
        .select('show_demo_data')
        .eq('id', 1)
        .maybeSingle();
      if (settingsRes.data && typeof settingsRes.data.show_demo_data === 'boolean') {
        showDemoData = settingsRes.data.show_demo_data;
      }

      const [cRes, pagesRes] = await Promise.all([
        supabase
          .from('categories')
          .select('id, slug')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('pages')
          .select('slug, updated_at')
          .eq('is_active', true),
      ]);

      if (cRes.data) {
        categories = (cRes.data as SeoCategoryEntry[]).filter(
          (c) => showDemoData || !isDemoCategory(c),
        );
      }
      if (pagesRes.data) {
        pages = pagesRes.data as SeoPageEntry[];
      }

      const fetchedProducts: SeoProductEntry[] = [];
      const batchSize = 1000;
      let offset = 0;
      while (true) {
        const { data: batch, error } = await supabase
          .from('public_products')
          .select('id, slug, sku, updated_at')
          .order('updated_at', { ascending: false })
          .range(offset, offset + batchSize - 1);
        if (error || !batch) break;
        for (const row of batch as SeoProductEntry[]) {
          if (showDemoData || !isDemoProduct(row)) {
            fetchedProducts.push(row);
          }
        }
        if (batch.length < batchSize) break;
        offset += batchSize;
      }

      products = fetchedProducts;
      connectedToSupabase = true;
      console.log(
        `Fetched ${products.length} products, ${categories.length} categories, and ${pages.length} pages from Supabase (show_demo_data=${showDemoData}).`,
      );
    } catch (err) {
      console.warn('Could not connect to Supabase during SEO build script. Using demo fallback entries.', err);
    }
  }

  if (!connectedToSupabase) {
    categories = DEMO_CATEGORIES.map((c) => ({ slug: c.slug }));
    products = DEMO_PRODUCTS.map((p) => ({ slug: p.slug, sku: p.sku }));
  }

  const pageLastMod = new Map<string, string>();
  for (const pg of pages) {
    if (pg.updated_at) pageLastMod.set(pg.slug, new Date(pg.updated_at).toISOString().slice(0, 10));
  }

  const today = new Date().toISOString().slice(0, 10);
  const staticUrls = [
    { loc: '', changefreq: 'daily', priority: '1.0', lastmod: today },
    { loc: '/shop', changefreq: 'hourly', priority: '0.9', lastmod: today },
    { loc: '/about', changefreq: 'monthly', priority: '0.5', lastmod: pageLastMod.get('about') },
    { loc: '/contact', changefreq: 'monthly', priority: '0.5', lastmod: undefined },
    { loc: '/return-policy', changefreq: 'monthly', priority: '0.4', lastmod: pageLastMod.get('return-policy') },
    { loc: '/privacy-policy', changefreq: 'monthly', priority: '0.4', lastmod: pageLastMod.get('privacy-policy') },
    { loc: '/terms', changefreq: 'monthly', priority: '0.4', lastmod: pageLastMod.get('terms') },
  ];

  const urlBlocks: string[] = [];

  for (const item of staticUrls) {
    for (const lang of ['bn', 'en'] as const) {
      const loc = `${appUrl}/${lang}${item.loc}`;
      urlBlocks.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <xhtml:link rel="alternate" hreflang="bn" href="${escapeXml(`${appUrl}/bn${item.loc}`)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${appUrl}/en${item.loc}`)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${appUrl}/bn${item.loc}`)}" />${item.lastmod ? `\n    <lastmod>${item.lastmod}</lastmod>` : ''}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`);
    }
  }

  for (const cat of categories) {
    const encoded = encodeURIComponent(cat.slug);
    for (const lang of ['bn', 'en'] as const) {
      const loc = `${appUrl}/${lang}/category/${encoded}`;
      urlBlocks.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <xhtml:link rel="alternate" hreflang="bn" href="${escapeXml(`${appUrl}/bn/category/${encoded}`)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${appUrl}/en/category/${encoded}`)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${appUrl}/bn/category/${encoded}`)}" />
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);
    }
  }

  for (const prod of products) {
    const encoded = encodeURIComponent(prod.slug);
    const lastmod = prod.updated_at ? new Date(prod.updated_at).toISOString().slice(0, 10) : today;
    for (const lang of ['bn', 'en'] as const) {
      const loc = `${appUrl}/${lang}/product/${encoded}`;
      urlBlocks.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <xhtml:link rel="alternate" hreflang="bn" href="${escapeXml(`${appUrl}/bn/product/${encoded}`)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${appUrl}/en/product/${encoded}`)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${appUrl}/bn/product/${encoded}`)}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlBlocks.join('\n')}
</urlset>`;

  const robotsTxt = `User-agent: *
Allow: /
Allow: /assets/
Disallow: /admin
Disallow: /admin/
Disallow: /cart
Disallow: /*/cart
Disallow: /checkout
Disallow: /*/checkout
Disallow: /order-success
Disallow: /*/order-success
Disallow: /track-order
Disallow: /*/track-order
Disallow: /font-test

Sitemap: ${appUrl}/sitemap.xml
`;

  const publicDir = path.resolve(__dirname, '../public');
  const distDir = path.resolve(__dirname, '../dist');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml);
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);

  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);
    fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt);
    // Keep dist/index.html untouched and avoid emitting nested dist/bn|en directories
    // that trigger Cloudflare trailing-slash redirects or flash unstyled pre-React HTML on reload.
  }

  console.log('SEO sitemap.xml and robots.txt generated cleanly.');
}

void generateSeoFiles();
