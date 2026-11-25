export interface CfEnv {
  VITE_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SITE_URL?: string;
  SITE_URL?: string;
  ASSETS?: {
    fetch(input: Request | string, init?: RequestInit): Promise<Response>;
  };
}

export interface CfPagesContext {
  request: Request;
  env: CfEnv;
  params: Record<string, string | string[]>;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  waitUntil?: (promise: Promise<unknown>) => void;
}

export interface EdgeStoreSettings {
  store_name_bn: string;
  store_name_en: string;
  phone: string | null;
  email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  show_demo_data: boolean;
}

export interface EdgeCategory {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  seo_title_bn: string | null;
  seo_title_en: string | null;
  seo_desc_bn: string | null;
  seo_desc_en: string | null;
  sort_order?: number;
}

export interface EdgeProduct {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  short_desc_bn: string | null;
  short_desc_en: string | null;
  description_bn: string | null;
  description_en: string | null;
  price: number;
  sale_price: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  stock: number;
  sku: string;
  brand_id: string | null;
  category_id: string | null;
  warranty_bn: string | null;
  warranty_en: string | null;
  track_stock: boolean;
  seo_title_bn: string | null;
  seo_title_en: string | null;
  seo_desc_bn: string | null;
  seo_desc_en: string | null;
  updated_at: string;
}

export interface EdgeProductImage {
  image_url: string;
  alt_bn: string | null;
  alt_en: string | null;
  sort_order: number;
}

export interface EdgeBrand {
  id: string;
  name: string;
  slug: string;
}

export interface EdgeReview {
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface EdgePage {
  slug: string;
  title_bn: string;
  title_en: string;
  content_bn: string | null;
  content_en: string | null;
  updated_at: string;
}

export const DEFAULT_SITE_ORIGIN = 'https://martbari.pages.dev';

const DEMO_CAT_SLUGS = new Set([
  'smart-watches',
  'headphones',
  'earbuds',
  'home-appliances',
  'lighting',
  'mobile-accessories',
]);

const DEMO_PROD_SLUGS = new Set([
  'apextime-pro-amoled-watch',
  'apextime-ultra-fitness-watch',
  'apextime-lite-slim-watch',
  'soundwave-anc-studio-headphones',
  'soundwave-bass-pro-wireless',
  'soundwave-pods-pro-earbuds',
  'soundwave-mini-air-buds',
  'soundwave-gaming-buds-x',
  'luminahome-digital-smart-kettle',
  'luminahome-portable-usb-blender',
  'luminahome-mist-desk-fan',
  'luminahome-eyecare-desk-lamp',
  'luminahome-motion-sensor-light',
  'apextime-10000mah-power-bank',
  'apextime-33w-gan-charger-kit',
]);

const DEMO_PROD_SKUS = new Set([
  'MB-SW-001',
  'MB-SW-002',
  'MB-SW-003',
  'MB-HP-001',
  'MB-HP-002',
  'MB-EB-001',
  'MB-EB-002',
  'MB-EB-003',
  'MB-HA-001',
  'MB-HA-002',
  'MB-HA-003',
  'MB-LT-001',
  'MB-LT-002',
  'MB-MA-001',
  'MB-MA-002',
]);

export function isDemoProductEntry(item: { id?: string; slug?: string; sku?: string | null }): boolean {
  if (item.id && item.id.startsWith('demo-')) return true;
  if (item.slug && DEMO_PROD_SLUGS.has(item.slug)) return true;
  if (item.sku && (DEMO_PROD_SKUS.has(item.sku) || item.sku.startsWith('DEMO-'))) return true;
  return false;
}

export function isDemoCategoryEntry(item: { id?: string; slug?: string }): boolean {
  if (item.id && /^c\d+$/.test(item.id)) return true;
  return Boolean(item.slug && DEMO_CAT_SLUGS.has(item.slug));
}

export function isLocalOrPreviewHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.endsWith('.pages.dev') ||
    host.startsWith('ais-dev-') ||
    host.startsWith('ais-pre-')
  );
}

export function normalizeOriginUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.') && !host.includes('localhost')) {
      parsed.hostname = host.slice(4);
    }
    if (parsed.protocol === 'http:' && !host.includes('localhost') && !host.startsWith('127.')) {
      parsed.protocol = 'https:';
    }
    return parsed.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function resolveSiteOrigin(request: Request, env: CfEnv): string {
  const configured = (env.SITE_URL || env.VITE_SITE_URL || '').trim();
  if (configured && /^https?:\/\//i.test(configured) && !configured.includes('placeholder')) {
    return normalizeOriginUrl(configured);
  }
  try {
    const reqUrl = new URL(request.url);
    if (reqUrl.hostname.startsWith('ais-dev-') || reqUrl.hostname.startsWith('ais-pre-')) {
      return DEFAULT_SITE_ORIGIN;
    }
    return normalizeOriginUrl(reqUrl.origin);
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function getSupabaseCreds(env: CfEnv): { url: string; anonKey: string } | null {
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const anonKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();
  if (
    !url ||
    !anonKey ||
    url.includes('placeholder') ||
    anonKey.includes('placeholder') ||
    !/^https?:\/\//i.test(url)
  ) {
    return null;
  }
  return { url, anonKey };
}

export async function supabaseSelect<T>(
  env: CfEnv,
  pathAndQuery: string,
  extraHeaders?: Record<string, string>,
): Promise<T[] | null> {
  const creds = getSupabaseCreds(env);
  if (!creds) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(`${creds.url}/rest/v1/${pathAndQuery}`, {
      method: 'GET',
      headers: {
        apikey: creds.anonKey,
        Authorization: `Bearer ${creds.anonKey}`,
        Accept: 'application/json',
        ...extraHeaders,
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as T[]) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchEdgeSettings(env: CfEnv): Promise<EdgeStoreSettings> {
  const rows = await supabaseSelect<EdgeStoreSettings>(
    env,
    'settings?select=store_name_bn,store_name_en,phone,email,facebook_url,instagram_url,youtube_url,tiktok_url,show_demo_data&id=eq.1&limit=1',
  );
  const first = rows?.[0];
  return {
    store_name_bn: first?.store_name_bn || 'মার্টবাড়ি',
    store_name_en: first?.store_name_en || 'MartBari',
    phone: first?.phone ?? '+880 1770-501652',
    email: first?.email ?? 'info@martbari.pages.dev',
    facebook_url: first?.facebook_url ?? null,
    instagram_url: first?.instagram_url ?? null,
    youtube_url: first?.youtube_url ?? null,
    tiktok_url: first?.tiktok_url ?? null,
    show_demo_data: first?.show_demo_data !== false,
  };
}

export async function fetchAllPublicProducts(
  env: CfEnv,
  showDemoData: boolean,
): Promise<EdgeProduct[] | null> {
  const pageSize = 1000;
  const collected: EdgeProduct[] = [];
  let offset = 0;

  while (true) {
    const rows = await supabaseSelect<EdgeProduct>(
      env,
      `public_products?select=id,name_bn,name_en,slug,short_desc_bn,short_desc_en,price,sale_price,sale_starts_at,sale_ends_at,stock,sku,brand_id,category_id,track_stock,seo_title_bn,seo_title_en,seo_desc_bn,seo_desc_en,updated_at&order=updated_at.desc&limit=${pageSize}&offset=${offset}`,
    );
    if (rows === null) {
      return offset === 0 ? null : collected;
    }
    for (const row of rows) {
      if (showDemoData || !isDemoProductEntry(row)) {
        collected.push(row);
      }
    }
    if (rows.length < pageSize || offset >= 90000) {
      break;
    }
    offset += pageSize;
  }

  return collected;
}

export async function fetchActiveCategories(
  env: CfEnv,
  showDemoData: boolean,
): Promise<EdgeCategory[] | null> {
  const rows = await supabaseSelect<EdgeCategory>(
    env,
    'categories?select=id,name_bn,name_en,slug,image_url,seo_title_bn,seo_title_en,seo_desc_bn,seo_desc_en,sort_order&is_active=eq.true&order=sort_order.asc',
  );
  if (!rows) return null;
  return rows.filter((c) => showDemoData || !isDemoCategoryEntry(c));
}

export async function fetchActivePages(env: CfEnv): Promise<EdgePage[] | null> {
  return supabaseSelect<EdgePage>(
    env,
    'pages?select=slug,title_bn,title_en,content_bn,content_en,updated_at&is_active=eq.true',
  );
}

export async function fetchProductDetailForSeo(
  env: CfEnv,
  slug: string,
  showDemoData: boolean,
): Promise<{
  product: EdgeProduct;
  images: EdgeProductImage[];
  brand: EdgeBrand | null;
  category: EdgeCategory | null;
  reviews: EdgeReview[];
} | null> {
  const rows = await supabaseSelect<EdgeProduct>(
    env,
    `public_products?select=id,name_bn,name_en,slug,short_desc_bn,short_desc_en,description_bn,description_en,price,sale_price,sale_starts_at,sale_ends_at,stock,sku,brand_id,category_id,warranty_bn,warranty_en,track_stock,seo_title_bn,seo_title_en,seo_desc_bn,seo_desc_en,updated_at&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  const product = rows?.[0];
  if (!product) return null;
  if (!showDemoData && isDemoProductEntry(product)) return null;

  const [imagesRows, brandRows, categoryRows, reviewRows] = await Promise.all([
    supabaseSelect<EdgeProductImage>(
      env,
      `product_images?select=image_url,alt_bn,alt_en,sort_order&product_id=eq.${encodeURIComponent(product.id)}&order=sort_order.asc`,
    ),
    product.brand_id
      ? supabaseSelect<EdgeBrand>(
          env,
          `brands?select=id,name,slug&id=eq.${encodeURIComponent(product.brand_id)}&is_active=eq.true&limit=1`,
        )
      : Promise.resolve(null),
    product.category_id
      ? supabaseSelect<EdgeCategory>(
          env,
          `categories?select=id,name_bn,name_en,slug,image_url,seo_title_bn,seo_title_en,seo_desc_bn,seo_desc_en&id=eq.${encodeURIComponent(product.category_id)}&is_active=eq.true&limit=1`,
        )
      : Promise.resolve(null),
    supabaseSelect<EdgeReview>(
      env,
      `reviews?select=customer_name,rating,comment,created_at&product_id=eq.${encodeURIComponent(product.id)}&is_approved=eq.true&order=created_at.desc&limit=10`,
    ),
  ]);

  return {
    product,
    images: imagesRows ?? [],
    brand: brandRows?.[0] ?? null,
    category: categoryRows?.[0] ?? null,
    reviews: reviewRows ?? [],
  };
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function cleanMetaText(raw: string | null | undefined, maxLength = 158): string {
  if (!raw) return '';
  const stripped = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (stripped.length <= maxLength) return stripped;
  const sliced = stripped.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function normalizeRoutePath(pathname: string): string {
  const clean = pathname.split('?')[0].split('#')[0];
  const prefixed = clean.startsWith('/') ? clean : `/${clean}`;
  if (prefixed.length > 1) return prefixed.replace(/\/+$/, '');
  return prefixed;
}

export function computeActivePrice(product: Pick<EdgeProduct, 'price' | 'sale_price' | 'sale_starts_at' | 'sale_ends_at'>): number {
  if (!product.sale_price || product.sale_price <= 0 || product.sale_price >= product.price) {
    return Number(product.price);
  }
  const now = Date.now();
  if (product.sale_starts_at) {
    const startMs = new Date(product.sale_starts_at).getTime();
    if (!Number.isNaN(startMs) && now < startMs) return Number(product.price);
  }
  if (product.sale_ends_at) {
    const endMs = new Date(product.sale_ends_at).getTime();
    if (!Number.isNaN(endMs) && now > endMs) return Number(product.price);
  }
  return Number(product.sale_price);
}

export interface HeadInjectionOptions {
  lang: 'bn' | 'en';
  title: string;
  description: string;
  robots: string;
  canonicalUrl?: string;
  hreflangSubPath?: string;
  origin: string;
  ogType?: 'website' | 'product' | 'article';
  ogImage?: string;
  ogLocale?: string;
  extraMetaTags?: string[];
  jsonLdObjects?: Array<Record<string, unknown>>;
  semanticBodyHtml?: string;
}

export function injectSeoIntoHtml(templateHtml: string, opts: HeadInjectionOptions): string {
  const {
    lang,
    title,
    description,
    robots,
    canonicalUrl,
    hreflangSubPath,
    origin,
    ogType = 'website',
    ogImage = `${origin}/pwa-512x512.png`,
    ogLocale = lang === 'bn' ? 'bn_BD' : 'en_US',
    extraMetaTags = [],
    jsonLdObjects = [],
    semanticBodyHtml,
  } = opts;

  // Strip existing canonical, alternate, robots, og, twitter, and ld+json tags so edge injection stays clean and singular
  let html = templateHtml
    .replace(/<html lang="[^"]*">/i, `<html lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/gi, '')
    .replace(/<meta\s+name="robots"[\s\S]*?\/>/gi, '')
    .replace(/<link\s+rel="canonical"[\s\S]*?\/>/gi, '')
    .replace(/<link\s+rel="alternate"[\s\S]*?\/>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[\s\S]*?\/>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[\s\S]*?\/>/gi, '')
    .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');

  const headLines: string[] = [
    `    <meta name="description" content="${escapeHtml(description)}" />`,
    `    <meta name="robots" content="${escapeHtml(robots)}" />`,
  ];

  if (canonicalUrl) {
    headLines.push(`    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
  }

  if (hreflangSubPath !== undefined) {
    const suffix = hreflangSubPath === '/' ? '' : hreflangSubPath;
    headLines.push(`    <link rel="alternate" hreflang="bn" href="${escapeHtml(`${origin}/bn${suffix}`)}" />`);
    headLines.push(`    <link rel="alternate" hreflang="en" href="${escapeHtml(`${origin}/en${suffix}`)}" />`);
    headLines.push(`    <link rel="alternate" hreflang="x-default" href="${escapeHtml(`${origin}/bn${suffix}`)}" />`);
  }

  headLines.push(
    `    <meta property="og:site_name" content="MartBari" />`,
    `    <meta property="og:locale" content="${ogLocale}" />`,
    `    <meta property="og:type" content="${escapeHtml(ogType)}" />`,
    `    <meta property="og:title" content="${escapeHtml(title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(description)}" />`,
    `    <meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    ...(canonicalUrl ? [`    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`] : []),
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
    ...extraMetaTags,
  );

  for (const schemaObj of jsonLdObjects) {
    const safeJson = JSON.stringify(schemaObj).replace(/</g, '\\u003c');
    headLines.push(`    <script type="application/ld+json">${safeJson}</script>`);
  }

  html = html.replace('</head>', `${headLines.join('\n')}\n  </head>`);

  if (semanticBodyHtml) {
    html = html.replace(/<div id="root">\s*<\/div>/i, `<div id="root">${semanticBodyHtml}</div>`);
  }

  return html;
}
