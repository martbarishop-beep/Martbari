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
const appUrl = process.env.APP_URL || 'https://martbari.shop';

async function generateSeoFiles() {
  console.log('Generating sitemap.xml and robots.txt...');

  let products: Array<{ slug: string; updated_at: string }> = [];
  let categories: Array<{ slug: string }> = [];

  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const [pRes, cRes] = await Promise.all([
        supabase.from('public_products').select('slug, updated_at'),
        supabase.from('categories').select('slug').eq('is_active', true),
      ]);
      if (pRes.data) products = pRes.data;
      if (cRes.data) categories = cRes.data;
      console.log(`Fetched ${products.length} products and ${categories.length} categories from Supabase.`);
    } catch (err) {
      console.warn('Could not connect to Supabase during SEO build script. Falling back to default sitemap routes.', err);
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
  }

  console.log('sitemap.xml and robots.txt generated successfully.');
}

void generateSeoFiles();
