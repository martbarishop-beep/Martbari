import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const appUrl = (process.env.APP_URL || 'https://martbari.shop').replace(/\/+$/, '');

interface SeoProductEntry {
  slug: string;
  name_bn: string;
  name_en: string;
  short_desc_bn?: string | null;
  short_desc_en?: string | null;
  price: number;
  sale_price?: number | null;
  updated_at?: string;
}

const DEMO_SEO_PRODUCTS: SeoProductEntry[] = [
  {
    slug: 'apextime-pro-amoled-watch',
    name_bn: 'এপেক্সটাইম প্রো অ্যামোলেড স্মার্ট ওয়াচ',
    name_en: 'ApexTime Pro AMOLED Smart Watch',
    short_desc_bn: '১.৪৩" অ্যামোলেড ডিসপ্লে ও ব্লুটুথ কলিং সুবিধা',
    short_desc_en: '1.43" AMOLED display with Bluetooth calling & 7-day battery',
    price: 3490,
    sale_price: 2990,
  },
  {
    slug: 'soundwave-anc-studio-headphones',
    name_bn: 'সাউন্ডওয়েভ এএনসি স্টুডিও হেডফোন',
    name_en: 'SoundWave ANC Studio Headphones',
    short_desc_bn: 'অ্যাক্টিভ নয়েজ ক্যান্সেলেশন ও ৪০ ঘণ্টা প্লেটাইম',
    short_desc_en: 'Hybrid Active Noise Cancellation with 40H battery life',
    price: 4490,
    sale_price: 3890,
  },
  {
    slug: 'soundwave-pods-pro-earbuds',
    name_bn: 'সাউন্ডওয়েভ পডস প্রো ইয়ারবাডস',
    name_en: 'SoundWave Pods Pro Earbuds',
    short_desc_bn: 'ইএনসি কোয়াড মাইক ও ৩০ ঘণ্টা কেস ব্যাকআপ',
    short_desc_en: 'Quad-mic ENC call clarity & 30-hour charging case',
    price: 1790,
    sale_price: 1490,
  },
  {
    slug: 'luminahome-digital-smart-kettle',
    name_bn: 'লুমিনাহোম ডিজিটাল ইলেকট্রিক কেটলি',
    name_en: 'LuminaHome Digital Smart Kettle',
    short_desc_bn: 'টেম্পারেচার কন্ট্রোল ও ফুড-গ্রেড স্টেইনলেস স্টিল',
    short_desc_en: 'Precision temperature control & 304 stainless steel body',
    price: 2950,
    sale_price: 2590,
  },
  {
    slug: 'luminahome-eyecare-desk-lamp',
    name_bn: 'লুমিনাহোম আই-কেয়ার এলইডি ডেস্ক ল্যাম্প',
    name_en: 'LuminaHome Eye-Care Desk Lamp',
    short_desc_bn: 'টাচ ডিমিং ও ৩টি কালার টেম্পারেচার মোড',
    short_desc_en: 'Flicker-free reading lamp with stepless touch dimming',
    price: 1490,
    sale_price: 1290,
  },
  {
    slug: 'apextime-ultra-fitness-watch',
    name_bn: 'এপেক্সটাইম আল্ট্রা ফিটনেস স্মার্ট ওয়াচ',
    name_en: 'ApexTime Ultra Fitness Watch',
    short_desc_bn: 'জিপিএস ট্র্যাকিং ও ১০০+ স্পোর্টস মোড',
    short_desc_en: 'Built-in GPS fitness tracking & 100+ workout modes',
    price: 4290,
    sale_price: 3690,
  },
  {
    slug: 'soundwave-bass-pro-wireless',
    name_bn: 'সাউন্ডওয়েভ বেস প্রো ওয়্যারলেস হেডফোন',
    name_en: 'SoundWave Bass Pro Wireless',
    short_desc_bn: '৪০মিমি ডাইনামিক ড্রাইভার ও ফোল্ডেবল ডিজাইন',
    short_desc_en: '40mm dynamic audio drivers with compact foldable design',
    price: 2890,
    sale_price: 2490,
  },
  {
    slug: 'apextime-10000mah-power-bank',
    name_bn: 'এপেক্সটাইম ১০০০০mAh ফাস্ট পাওয়ার ব্যাংক',
    name_en: 'ApexTime 10000mAh Fast Power Bank',
    short_desc_bn: '২২.৫ ওয়াট পিডি ফাস্ট চার্জিং সাপোর্ট',
    short_desc_en: '22.5W USB-C PD fast charging compact power bank',
    price: 1650,
    sale_price: 1390,
  },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function buildJsonLd(products: SeoProductEntry[], lang: 'bn' | 'en'): string {
  const storeSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${appUrl}/#website`,
        url: `${appUrl}/${lang}`,
        name: lang === 'bn' ? 'মার্টবাড়ি (MartBari)' : 'MartBari',
        inLanguage: lang,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${appUrl}/${lang}/shop?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Store',
        '@id': `${appUrl}/#store`,
        name: 'MartBari',
        url: appUrl,
        currenciesAccepted: 'BDT',
        paymentAccepted: 'Cash on Delivery, bKash, Nagad',
        areaServed: 'BD',
      },
      {
        '@type': 'ItemList',
        name: lang === 'bn' ? 'জনপ্রিয় গ্যাজেট ও ইলেকট্রনিক্স' : 'Featured Electronics & Gadgets',
        numberOfItems: products.length,
        itemListElement: products.slice(0, 8).map((p, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `${appUrl}/${lang}/product/${p.slug}`,
          name: lang === 'bn' ? p.name_bn : p.name_en,
        })),
      },
    ],
  };

  return `    <script type="application/ld+json">${JSON.stringify(storeSchema)}</script>`;
}

function buildPrerenderedRootShell(products: SeoProductEntry[], lang: 'bn' | 'en'): string {
  const leadProduct = products[0];
  const heroHeading = leadProduct
    ? lang === 'bn'
      ? leadProduct.name_bn
      : leadProduct.name_en
    : lang === 'bn'
    ? 'আধুনিক গ্যাজেট ও স্মার্ট হোম পণ্য এখন এক ঠিকানায়'
    : 'Modern Gadgets & Smart Home Essentials in One Place';
  const heroSubtitle =
    (leadProduct ? (lang === 'bn' ? leadProduct.short_desc_bn : leadProduct.short_desc_en) : null) ||
    (lang === 'bn'
      ? 'স্মার্ট ওয়াচ, এএনসি হেডফোন, ট্রু ওয়্যারলেস ইয়ারবাডস ও হোম অ্যাপ্লায়েন্স — সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি।'
      : 'AMOLED smart watches, ANC headphones, wireless earbuds, and kitchen appliances delivered across Bangladesh with Cash on Delivery.');

  const listItems = products
    .slice(0, 8)
    .map((p) => {
      const name = escapeHtml(lang === 'bn' ? p.name_bn : p.name_en);
      const price = p.sale_price && p.sale_price > 0 ? p.sale_price : p.price;
      return `<li><a href="/${lang}/product/${escapeHtml(p.slug)}">${name}</a> — ৳${price}</li>`;
    })
    .join('');

  return `<div id="root"><main style="max-width:1280px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif;color:#0F1A2C;background:#FAF8F5"><header style="margin-bottom:24px"><a href="/${lang}" style="font-weight:700;font-size:20px;color:#17263E;text-decoration:none">${lang === 'bn' ? 'মার্টবাড়ি' : 'MartBari'}</a></header><section style="background:#17263E;color:#fff;padding:28px;border-radius:16px"><h1>${escapeHtml(heroHeading)}</h1><p>${escapeHtml(heroSubtitle)}</p><p><a href="/${lang}/shop" style="color:#FF9D5C;font-weight:700">${lang === 'bn' ? 'সব পণ্য দেখুন' : 'Explore All Products'}</a></p></section><section style="margin-top:24px"><h2>${lang === 'bn' ? 'সেরা ও জনপ্রিয় পণ্য' : 'Featured Products'}</h2><ul>${listItems}</ul></section></main></div>`;
}

function injectPrerenderedHtml(
  templateHtml: string,
  distDir: string,
  products: SeoProductEntry[],
  lang: 'bn' | 'en',
): string {
  const fontPreloadTags = findFontPreloadTags(distDir);
  const canonicalUrl = `${appUrl}/${lang}`;
  const title =
    lang === 'bn'
      ? 'মার্টবাড়ি — আপনার এক ঠিকানার অনলাইন শপ | MartBari'
      : 'MartBari — Your One-Stop Online Shop in Bangladesh';
  const description =
    lang === 'bn'
      ? 'MartBari — বাংলাদেশের বিশ্বস্ত অনলাইন ইলেকট্রনিক্স, গ্যাজেট ও হোম অ্যাপ্লায়েন্স স্টোর। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।'
      : 'Shop smart watches, earbuds, headphones, lighting, and home appliances with Cash on Delivery all over Bangladesh.';

  const seoHeadTags = [
    fontPreloadTags,
    `    <link rel="canonical" href="${canonicalUrl}" />`,
    `    <link rel="alternate" hreflang="bn" href="${appUrl}/bn" />`,
    `    <link rel="alternate" hreflang="en" href="${appUrl}/en" />`,
    `    <link rel="alternate" hreflang="x-default" href="${appUrl}/bn" />`,
    buildJsonLd(products, lang),
  ]
    .filter(Boolean)
    .join('\n');

  let html = templateHtml
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace('</head>', `${seoHeadTags}\n  </head>`)
    .replace('<div id="root"></div>', buildPrerenderedRootShell(products, lang));

  return html;
}

async function generateSeoFiles() {
  console.log('Generating sitemap.xml, robots.txt, and prerendered SEO HTML...');

  let products: SeoProductEntry[] = [];
  let categories: Array<{ slug: string }> = [];

  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const [pRes, cRes] = await Promise.all([
        supabase
          .from('public_products')
          .select('slug, name_bn, name_en, short_desc_bn, short_desc_en, price, sale_price, updated_at')
          .limit(500),
        supabase.from('categories').select('slug').eq('is_active', true),
      ]);
      if (pRes.data) products = pRes.data as SeoProductEntry[];
      if (cRes.data) categories = cRes.data;
      console.log(`Fetched ${products.length} products and ${categories.length} categories from Supabase.`);
    } catch (err) {
      console.warn('Could not connect to Supabase during SEO build script. Falling back to default SEO entries.', err);
    }
  }

  const staticUrls = [
    { loc: '', changefreq: 'daily', priority: '1.0' },
    { loc: '/shop', changefreq: 'hourly', priority: '0.9' },
    { loc: '/track-order', changefreq: 'weekly', priority: '0.6' },
    { loc: '/about', changefreq: 'monthly', priority: '0.5' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
    { loc: '/return-policy', changefreq: 'monthly', priority: '0.4' },
    { loc: '/privacy-policy', changefreq: 'monthly', priority: '0.4' },
    { loc: '/terms', changefreq: 'monthly', priority: '0.4' },
  ];

  let urlEntries = '';

  for (const item of staticUrls) {
    for (const lang of ['bn', 'en']) {
      const loc = `${appUrl}/${lang}${item.loc}`;
      urlEntries += `  <url>
    <loc>${loc}</loc>
    <xhtml:link rel="alternate" hreflang="bn" href="${appUrl}/bn${item.loc}" />
    <xhtml:link rel="alternate" hreflang="en" href="${appUrl}/en${item.loc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${appUrl}/bn${item.loc}" />
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>\n`;
    }
  }

  for (const cat of categories) {
    for (const lang of ['bn', 'en']) {
      const loc = `${appUrl}/${lang}/category/${cat.slug}`;
      urlEntries += `  <url>
    <loc>${loc}</loc>
    <xhtml:link rel="alternate" hreflang="bn" href="${appUrl}/bn/category/${cat.slug}" />
    <xhtml:link rel="alternate" hreflang="en" href="${appUrl}/en/category/${cat.slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${appUrl}/bn/category/${cat.slug}" />
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    }
  }

  for (const prod of products) {
    const lastmod = prod.updated_at ? new Date(prod.updated_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    for (const lang of ['bn', 'en']) {
      const loc = `${appUrl}/${lang}/product/${prod.slug}`;
      urlEntries += `  <url>
    <loc>${loc}</loc>
    <xhtml:link rel="alternate" hreflang="bn" href="${appUrl}/bn/product/${prod.slug}" />
    <xhtml:link rel="alternate" hreflang="en" href="${appUrl}/en/product/${prod.slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${appUrl}/bn/product/${prod.slug}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}</urlset>`;

  const robotsTxt = `User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /track-order
Disallow: /order-success

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
      const seoProducts = products.length > 0 ? products : DEMO_SEO_PRODUCTS;

      const bnHtml = injectPrerenderedHtml(templateHtml, distDir, seoProducts, 'bn');
      const enHtml = injectPrerenderedHtml(templateHtml, distDir, seoProducts, 'en');

      fs.writeFileSync(distIndexPath, bnHtml);
      fs.mkdirSync(path.join(distDir, 'bn'), { recursive: true });
      fs.writeFileSync(path.join(distDir, 'bn', 'index.html'), bnHtml);
      fs.mkdirSync(path.join(distDir, 'en'), { recursive: true });
      fs.writeFileSync(path.join(distDir, 'en', 'index.html'), enHtml);
    }
  }

  console.log('SEO files and prerendered HTML generated successfully.');
}

void generateSeoFiles();
