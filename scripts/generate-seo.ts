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
import { PRODUCT_DEMO_IMAGES_BY_SLUG } from '../src/config/demoImages';

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
      // Ignore ephemeral AI Studio preview or localhost URLs so production canonical stays valid
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
  name_bn: string;
  name_en: string;
  short_desc_bn?: string | null;
  short_desc_en?: string | null;
  description_bn?: string | null;
  description_en?: string | null;
  price: number;
  sale_price?: number | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  stock?: number;
  track_stock?: boolean;
  seo_title_bn?: string | null;
  seo_title_en?: string | null;
  seo_desc_bn?: string | null;
  seo_desc_en?: string | null;
  updated_at?: string;
  image_url?: string | null;
}

interface SeoCategoryEntry {
  id?: string;
  slug: string;
  name_bn: string;
  name_en: string;
  image_url?: string | null;
  seo_title_bn?: string | null;
  seo_title_en?: string | null;
  seo_desc_bn?: string | null;
  seo_desc_en?: string | null;
}

interface SeoPageEntry {
  slug: string;
  title_bn: string;
  title_en: string;
  content_bn?: string | null;
  content_en?: string | null;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanText(raw: string | null | undefined, maxLength = 158): string {
  if (!raw) return '';
  const stripped = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (stripped.length <= maxLength) return stripped;
  const sliced = stripped.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

function computeActivePrice(p: SeoProductEntry): number {
  if (!p.sale_price || p.sale_price <= 0 || p.sale_price >= p.price) return Number(p.price);
  const now = Date.now();
  if (p.sale_starts_at && new Date(p.sale_starts_at).getTime() > now) return Number(p.price);
  if (p.sale_ends_at && new Date(p.sale_ends_at).getTime() < now) return Number(p.price);
  return Number(p.sale_price);
}

function findFontPreloadTags(distDir: string): string {
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) return '';
  const files = fs.readdirSync(assetsDir);

  const preloadFiles = [
    files.find((f) => f.startsWith('noto-sans-bengali-bengali-wght-normal') && f.endsWith('.woff2')),
    files.find((f) => f.startsWith('plus-jakarta-sans-latin-wght-normal') && f.endsWith('.woff2')),
  ].filter((f): f is string => Boolean(f));

  return preloadFiles
    .map(
      (file) =>
        `    <link rel="preload" as="font" type="font/woff2" href="/assets/${file}" crossorigin />`,
    )
    .join('\n');
}

interface PageRenderSpec {
  lang: 'bn' | 'en';
  subPath: string;
  title: string;
  description: string;
  ogType?: 'website' | 'product';
  ogImage?: string;
  extraMetaTags?: string[];
  jsonLdObjects: Array<Record<string, unknown>>;
  semanticBodyHtml: string;
}

function buildPrerenderedPageHtml(
  templateHtml: string,
  fontPreloadTags: string,
  spec: PageRenderSpec,
): string {
  const canonicalUrl = `${appUrl}/${spec.lang}${spec.subPath}`;
  const ogImage = spec.ogImage || `${appUrl}/pwa-512x512.png`;
  const ogLocale = spec.lang === 'bn' ? 'bn_BD' : 'en_US';

  let html = templateHtml
    .replace(/<html lang="[^"]*">/i, `<html lang="${spec.lang}">`)
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(spec.title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/gi, '')
    .replace(/<meta\s+name="robots"[\s\S]*?\/>/gi, '')
    .replace(/<link\s+rel="canonical"[\s\S]*?\/>/gi, '')
    .replace(/<link\s+rel="alternate"[\s\S]*?\/>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[\s\S]*?\/>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[\s\S]*?\/>/gi, '');

  const headTags = [
    fontPreloadTags,
    `    <meta name="description" content="${escapeHtml(spec.description)}" />`,
    `    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    `    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `    <link rel="alternate" hreflang="bn" href="${escapeHtml(`${appUrl}/bn${spec.subPath}`)}" />`,
    `    <link rel="alternate" hreflang="en" href="${escapeHtml(`${appUrl}/en${spec.subPath}`)}" />`,
    `    <link rel="alternate" hreflang="x-default" href="${escapeHtml(`${appUrl}/bn${spec.subPath}`)}" />`,
    `    <meta property="og:site_name" content="MartBari" />`,
    `    <meta property="og:locale" content="${ogLocale}" />`,
    `    <meta property="og:type" content="${spec.ogType || 'website'}" />`,
    `    <meta property="og:title" content="${escapeHtml(spec.title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(spec.description)}" />`,
    `    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `    <meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${escapeHtml(spec.title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(spec.description)}" />`,
    `    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
    ...(spec.extraMetaTags || []),
    ...spec.jsonLdObjects.map(
      (obj) => `    <script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`,
    ),
  ]
    .filter(Boolean)
    .join('\n');

  html = html
    .replace('</head>', `${headTags}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${spec.semanticBodyHtml}</div>`);

  return html;
}

function writeRouteHtml(distDir: string, routePath: string, html: string) {
  const clean = routePath.replace(/^\/+/, '');
  const dirPath = path.join(distDir, clean);
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.join(dirPath, 'index.html'), html);
}

const STATIC_POLICY_INFO: Record<
  string,
  { titleBn: string; titleEn: string; descBn: string; descEn: string }
> = {
  about: {
    titleBn: 'আমাদের সম্পর্কে',
    titleEn: 'About Us',
    descBn:
      'MartBari সম্পর্কে জানুন — বাংলাদেশের বিশ্বস্ত অনলাইন স্মার্ট গ্যাজেট, অডিও ও হোম অ্যাপ্লায়েন্স স্টোর।',
    descEn:
      'Learn about MartBari — your trusted online store in Bangladesh for smart gadgets, audio gear, and home appliances.',
  },
  contact: {
    titleBn: 'যোগাযোগ করুন',
    titleEn: 'Contact Us',
    descBn:
      'অর্ডার বা ডেলিভারি সংক্রান্ত সহায়তার জন্য MartBari এর সাথে ফোন, হোয়াটসঅ্যাপ বা ইমেইলে যোগাযোগ করুন।',
    descEn:
      'Contact MartBari customer support by phone, WhatsApp, or email for order and delivery help in Bangladesh.',
  },
  'return-policy': {
    titleBn: 'রিটার্ন ও রিফান্ড নীতিমালা',
    titleEn: 'Return & Refund Policy',
    descBn:
      'MartBari ৭ দিনের সহজ রিটার্ন, রিপ্লেসমেন্ট ও রিফান্ড নীতিমালা সম্পর্কে বিস্তারিত জানুন।',
    descEn:
      'Read MartBari 7-day return, replacement, and refund policy for electronics and gadgets in Bangladesh.',
  },
  'privacy-policy': {
    titleBn: 'গোপনীয়তা নীতিমালা',
    titleEn: 'Privacy Policy',
    descBn: 'MartBari গ্রাহকের ব্যক্তিগত তথ্য সুরক্ষা ও গোপনীয়তা নীতিমালা সম্পর্কে জানুন।',
    descEn: 'Learn how MartBari protects customer order details and personal information across Bangladesh.',
  },
  terms: {
    titleBn: 'শর্তাবলী',
    titleEn: 'Terms & Conditions',
    descBn: 'MartBari ওয়েবসাইট ব্যবহার, অর্ডার, মূল্য, ডেলিভারি ও ওয়ারেন্টি সংক্রান্ত শর্তাবলী।',
    descEn: 'Review MartBari terms and conditions covering orders, pricing in BDT, delivery, and warranty support.',
  },
};

async function generateSeoFiles() {
  console.log(`Generating SEO assets for canonical origin: ${appUrl}`);

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
          .select('id, slug, name_bn, name_en, image_url, seo_title_bn, seo_title_en, seo_desc_bn, seo_desc_en')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('pages')
          .select('slug, title_bn, title_en, content_bn, content_en, updated_at')
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

      // Paginate public_products cleanly (1000 rows per batch)
      const fetchedProducts: SeoProductEntry[] = [];
      const batchSize = 1000;
      let offset = 0;
      while (true) {
        const { data: batch, error } = await supabase
          .from('public_products')
          .select(
            'id, slug, sku, name_bn, name_en, short_desc_bn, short_desc_en, description_bn, description_en, price, sale_price, sale_starts_at, sale_ends_at, stock, track_stock, seo_title_bn, seo_title_en, seo_desc_bn, seo_desc_en, updated_at',
          )
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

      // Attach primary product image URLs for top products
      if (fetchedProducts.length > 0) {
        const ids = fetchedProducts.slice(0, 500).map((p) => p.id).filter((id): id is string => Boolean(id));
        if (ids.length > 0) {
          const { data: imgs } = await supabase
            .from('product_images')
            .select('product_id, image_url, sort_order')
            .in('product_id', ids)
            .order('sort_order', { ascending: true });
          const imgMap = new Map<string, string>();
          for (const img of (imgs as Array<{ product_id: string; image_url: string }>) || []) {
            if (!imgMap.has(img.product_id)) imgMap.set(img.product_id, img.image_url);
          }
          for (const p of fetchedProducts) {
            if (p.id && imgMap.has(p.id)) p.image_url = imgMap.get(p.id) || null;
          }
        }
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
    categories = DEMO_CATEGORIES.map((c) => ({
      slug: c.slug,
      name_bn: c.name_bn,
      name_en: c.name_en,
      image_url: c.image_url,
    }));
    products = DEMO_PRODUCTS.map((p) => ({
      slug: p.slug,
      sku: p.sku,
      name_bn: p.name_bn,
      name_en: p.name_en,
      short_desc_bn: p.short_desc_bn,
      short_desc_en: p.short_desc_en,
      description_bn: p.description_bn,
      description_en: p.description_en,
      price: p.price,
      sale_price: p.sale_price,
      stock: p.stock,
      track_stock: true,
      image_url: PRODUCT_DEMO_IMAGES_BY_SLUG[p.slug]?.[0] || null,
    }));
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

    const distIndexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(distIndexPath)) {
      const templateHtml = fs.readFileSync(distIndexPath, 'utf-8');
      const fontPreloadTags = findFontPreloadTags(distDir);

      // Keep dist/index.html as a clean, neutral SPA fallback (never poison dynamic routes with a /bn canonical)
      if (fontPreloadTags && !templateHtml.includes('rel="preload" as="font"')) {
        fs.writeFileSync(distIndexPath, templateHtml.replace('</head>', `${fontPreloadTags}\n  </head>`));
      }

      // Generate prerendered static HTML files for key storefront routes (/bn, /en, /shop, /about, /contact, policies, categories, products)
      for (const lang of ['bn', 'en'] as const) {
        const homeTitle =
          lang === 'bn'
            ? 'মার্টবাড়ি — আপনার এক ঠিকানার অনলাইন শপ | গ্যাজেট ও হোম অ্যাপ্লায়েন্স'
            : 'MartBari — Your One-Stop Online Shop in Bangladesh';
        const homeDesc =
          lang === 'bn'
            ? 'স্মার্ট ওয়াচ, এএনসি হেডফোন, ট্রু ওয়্যারলেস ইয়ারবাডস ও হোম অ্যাপ্লায়েন্স — সারা বাংলাদেশে দ্রুত ক্যাশ অন ডেলিভারি।'
            : 'Shop AMOLED smart watches, ANC headphones, wireless earbuds, lighting, and home appliances with Cash on Delivery all over Bangladesh.';

        const homeJsonLd = [
          {
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': `${appUrl}/#organization`,
                name: 'MartBari',
                url: appUrl,
                logo: { '@type': 'ImageObject', url: `${appUrl}/pwa-512x512.png`, width: 512, height: 512 },
              },
              {
                '@type': 'WebSite',
                '@id': `${appUrl}/#website`,
                url: `${appUrl}/${lang}`,
                name: lang === 'bn' ? 'মার্টবাড়ি (MartBari)' : 'MartBari',
                inLanguage: lang,
                publisher: { '@id': `${appUrl}/#organization` },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: { '@type': 'EntryPoint', urlTemplate: `${appUrl}/${lang}/shop?q={search_term_string}` },
                  'query-input': 'required name=search_term_string',
                },
              },
            ],
          },
          ...(products.length > 0
            ? [
                {
                  '@context': 'https://schema.org',
                  '@type': 'ItemList',
                  name: lang === 'bn' ? 'জনপ্রিয় গ্যাজেট ও ইলেকট্রনিক্স' : 'Featured Electronics & Gadgets',
                  numberOfItems: Math.min(products.length, 10),
                  itemListElement: products.slice(0, 10).map((p, idx) => ({
                    '@type': 'ListItem',
                    position: idx + 1,
                    url: `${appUrl}/${lang}/product/${encodeURIComponent(p.slug)}`,
                    name: lang === 'bn' ? p.name_bn : p.name_en,
                  })),
                },
              ]
            : []),
        ];

        const prodLinks = products
          .slice(0, 12)
          .map(
            (p) =>
              `<li><a href="/${lang}/product/${escapeHtml(p.slug)}">${escapeHtml(lang === 'bn' ? p.name_bn : p.name_en)}</a> — ৳${computeActivePrice(p)}</li>`,
          )
          .join('');

        writeRouteHtml(
          distDir,
          lang,
          buildPrerenderedPageHtml(templateHtml, fontPreloadTags, {
            lang,
            subPath: '',
            title: homeTitle,
            description: homeDesc,
            jsonLdObjects: homeJsonLd,
            semanticBodyHtml: `<main style="max-width:1280px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif"><h1>${escapeHtml(homeTitle)}</h1><p>${escapeHtml(homeDesc)}</p>${prodLinks ? `<ul>${prodLinks}</ul>` : ''}<p><a href="/${lang}/shop">${lang === 'bn' ? 'সব পণ্য দেখুন' : 'Explore All Products'}</a></p></main>`,
          }),
        );

        // Shop page
        const shopTitle =
          lang === 'bn' ? 'সব পণ্য ও গ্যাজেট — মার্টবাড়ি (MartBari)' : 'Shop All Electronics & Gadgets — MartBari';
        const shopDesc =
          lang === 'bn'
            ? 'MartBari থেকে স্মার্ট ওয়াচ, হেডফোন, ইয়ারবাডস ও হোম অ্যাপ্লায়েন্স অনলাইনে কিনুন। সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি।'
            : 'Explore AMOLED smart watches, ANC headphones, wireless earbuds, and home appliances at MartBari.';
        writeRouteHtml(
          distDir,
          `${lang}/shop`,
          buildPrerenderedPageHtml(templateHtml, fontPreloadTags, {
            lang,
            subPath: '/shop',
            title: shopTitle,
            description: shopDesc,
            jsonLdObjects: [
              {
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: lang === 'bn' ? 'সব পণ্য' : 'All Products',
                description: shopDesc,
                url: `${appUrl}/${lang}/shop`,
                inLanguage: lang,
              },
            ],
            semanticBodyHtml: `<main style="max-width:1280px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif"><h1>${escapeHtml(shopTitle)}</h1><p>${escapeHtml(shopDesc)}</p>${prodLinks ? `<ul>${prodLinks}</ul>` : ''}</main>`,
          }),
        );

        // Policy & Contact pages
        for (const [slug, info] of Object.entries(STATIC_POLICY_INFO)) {
          const dbPage = pages.find((p) => p.slug === slug);
          const pTitle = dbPage
            ? lang === 'bn'
              ? dbPage.title_bn
              : dbPage.title_en
            : lang === 'bn'
            ? info.titleBn
            : info.titleEn;
          const pDesc = dbPage
            ? cleanText(lang === 'bn' ? dbPage.content_bn : dbPage.content_en, 158) ||
              (lang === 'bn' ? info.descBn : info.descEn)
            : lang === 'bn'
            ? info.descBn
            : info.descEn;

          writeRouteHtml(
            distDir,
            `${lang}/${slug}`,
            buildPrerenderedPageHtml(templateHtml, fontPreloadTags, {
              lang,
              subPath: `/${slug}`,
              title: `${pTitle} — MartBari`,
              description: pDesc,
              jsonLdObjects: [
                {
                  '@context': 'https://schema.org',
                  '@type': slug === 'about' ? 'AboutPage' : slug === 'contact' ? 'ContactPage' : 'WebPage',
                  name: pTitle,
                  description: pDesc,
                  url: `${appUrl}/${lang}/${slug}`,
                  inLanguage: lang,
                },
              ],
              semanticBodyHtml: `<main style="max-width:960px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif"><h1>${escapeHtml(pTitle)}</h1><p>${escapeHtml(pDesc)}</p></main>`,
            }),
          );
        }

        // Category pages
        for (const cat of categories) {
          const cName = lang === 'bn' ? cat.name_bn : cat.name_en;
          const cTitle =
            (lang === 'bn' ? cat.seo_title_bn : cat.seo_title_en) || `${cName} — MartBari`;
          const cDesc = cleanText(
            (lang === 'bn' ? cat.seo_desc_bn : cat.seo_desc_en) ||
              (lang === 'bn'
                ? `${cName} ক্যাটাগরির সেরা মানের পণ্য কিনুন MartBari থেকে। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।`
                : `Browse ${cName} products online at MartBari with fast Cash on Delivery across Bangladesh.`),
            158,
          );
          const encoded = encodeURIComponent(cat.slug);
          writeRouteHtml(
            distDir,
            `${lang}/category/${cat.slug}`,
            buildPrerenderedPageHtml(templateHtml, fontPreloadTags, {
              lang,
              subPath: `/category/${encoded}`,
              title: cTitle,
              description: cDesc,
              ogImage:
                cat.image_url && /^https?:\/\//i.test(cat.image_url)
                  ? cat.image_url
                  : `${appUrl}/pwa-512x512.png`,
              jsonLdObjects: [
                {
                  '@context': 'https://schema.org',
                  '@type': 'CollectionPage',
                  name: cName,
                  description: cDesc,
                  url: `${appUrl}/${lang}/category/${encoded}`,
                  inLanguage: lang,
                },
              ],
              semanticBodyHtml: `<main style="max-width:1280px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif"><h1>${escapeHtml(cName)}</h1><p>${escapeHtml(cDesc)}</p></main>`,
            }),
          );
        }

        // Product pages (up to 500 static prerendered at build time; Cloudflare Pages Middleware handles unlimited dynamically)
        for (const prod of products.slice(0, 500)) {
          const pName = lang === 'bn' ? prod.name_bn : prod.name_en;
          const activePrice = computeActivePrice(prod);
          const isOutOfStock = Boolean(prod.track_stock && (prod.stock ?? 1) <= 0);
          const pTitle =
            (lang === 'bn' ? prod.seo_title_bn : prod.seo_title_en) ||
            `${pName} — ৳${activePrice.toLocaleString('en-US')} | MartBari`;
          const pDesc = cleanText(
            (lang === 'bn' ? prod.seo_desc_bn : prod.seo_desc_en) ||
              (lang === 'bn'
                ? prod.short_desc_bn || prod.description_bn
                : prod.short_desc_en || prod.description_en) ||
              `${pName} — ৳${activePrice}`,
            158,
          );
          const encoded = encodeURIComponent(prod.slug);
          const productUrl = `${appUrl}/${lang}/product/${encoded}`;
          const ogImg =
            prod.image_url && /^https?:\/\//i.test(prod.image_url)
              ? prod.image_url
              : `${appUrl}/pwa-512x512.png`;

          writeRouteHtml(
            distDir,
            `${lang}/product/${prod.slug}`,
            buildPrerenderedPageHtml(templateHtml, fontPreloadTags, {
              lang,
              subPath: `/product/${encoded}`,
              title: pTitle,
              description: pDesc,
              ogType: 'product',
              ogImage: ogImg,
              extraMetaTags: [
                `    <meta property="product:price:amount" content="${activePrice.toFixed(2)}" />`,
                `    <meta property="product:price:currency" content="BDT" />`,
                `    <meta property="product:availability" content="${isOutOfStock ? 'out of stock' : 'in stock'}" />`,
              ],
              jsonLdObjects: [
                {
                  '@context': 'https://schema.org',
                  '@type': 'Product',
                  '@id': `${productUrl}#product`,
                  name: pName,
                  description: pDesc,
                  ...(prod.sku ? { sku: prod.sku } : {}),
                  url: productUrl,
                  image: [ogImg],
                  offers: {
                    '@type': 'Offer',
                    url: productUrl,
                    priceCurrency: 'BDT',
                    price: activePrice.toFixed(2),
                    availability: isOutOfStock
                      ? 'https://schema.org/OutOfStock'
                      : 'https://schema.org/InStock',
                    itemCondition: 'https://schema.org/NewCondition',
                    seller: { '@type': 'Organization', name: 'MartBari', url: appUrl },
                  },
                },
              ],
              semanticBodyHtml: `<main style="max-width:1120px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif"><h1>${escapeHtml(pName)}</h1><p>${escapeHtml(pDesc)}</p><p><strong>৳${activePrice}</strong></p></main>`,
            }),
          );
        }
      }
    }
  }

  console.log('SEO files and prerendered HTML generated successfully.');
}

void generateSeoFiles();
