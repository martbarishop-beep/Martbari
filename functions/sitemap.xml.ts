import {
  type CfPagesContext,
  escapeXml,
  fetchActiveCategories,
  fetchActivePages,
  fetchAllPublicProducts,
  fetchEdgeSettings,
  getSupabaseCreds,
  resolveSiteOrigin,
} from './_lib/seo-data';

interface SitemapUrlItem {
  bnLoc: string;
  enLoc: string;
  xDefaultLoc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

const STATIC_PUBLIC_PATHS: Array<{ suffix: string; changefreq: string; priority: string }> = [
  { suffix: '', changefreq: 'daily', priority: '1.0' },
  { suffix: '/shop', changefreq: 'hourly', priority: '0.9' },
  { suffix: '/about', changefreq: 'monthly', priority: '0.5' },
  { suffix: '/contact', changefreq: 'monthly', priority: '0.5' },
  { suffix: '/return-policy', changefreq: 'monthly', priority: '0.4' },
  { suffix: '/privacy-policy', changefreq: 'monthly', priority: '0.4' },
  { suffix: '/terms', changefreq: 'monthly', priority: '0.4' },
];

const MAX_URLS_PER_SITEMAP = 45000;

function formatLastMod(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function renderUrlEntry(loc: string, item: SitemapUrlItem): string {
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="bn" href="${escapeXml(item.bnLoc)}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(item.enLoc)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(item.xDefaultLoc)}" />`,
    ...(item.lastmod ? [`    <lastmod>${escapeXml(item.lastmod)}</lastmod>`] : []),
    `    <changefreq>${item.changefreq}</changefreq>`,
    `    <priority>${item.priority}</priority>`,
    '  </url>',
  ];
  return lines.join('\n');
}

export const onRequestGet = async (context: CfPagesContext): Promise<Response> => {
  const { request, env } = context;
  const origin = resolveSiteOrigin(request, env);
  const reqUrl = new URL(request.url);
  const partParam = reqUrl.searchParams.get('part');

  const creds = getSupabaseCreds(env);
  if (!creds) {
    if (env.ASSETS) {
      const staticRes = await env.ASSETS.fetch(new URL('/sitemap.xml', reqUrl.origin).toString());
      if (staticRes.ok) {
        return new Response(staticRes.body, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
          },
        });
      }
    }
  }

  const settings = await fetchEdgeSettings(env);
  const [categories, products, pages] = await Promise.all([
    fetchActiveCategories(env, settings.show_demo_data),
    fetchAllPublicProducts(env, settings.show_demo_data),
    fetchActivePages(env),
  ]);

  // If live fetch failed completely, fall back cleanly to build-time static sitemap.xml if present
  if (categories === null && products === null && env.ASSETS) {
    const staticRes = await env.ASSETS.fetch(new URL('/sitemap.xml', reqUrl.origin).toString());
    if (staticRes.ok) {
      return new Response(staticRes.body, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=120, s-maxage=120',
        },
      });
    }
  }

  const pageLastModBySlug = new Map<string, string>();
  for (const p of pages ?? []) {
    const formatted = formatLastMod(p.updated_at);
    if (formatted) pageLastModBySlug.set(p.slug, formatted);
  }

  const today = new Date().toISOString().slice(0, 10);
  const allUrlBlocks: string[] = [];

  for (const item of STATIC_PUBLIC_PATHS) {
    const slugKey = item.suffix.replace(/^\//, '');
    const lastmod = slugKey ? pageLastModBySlug.get(slugKey) : today;
    const pair: SitemapUrlItem = {
      bnLoc: `${origin}/bn${item.suffix}`,
      enLoc: `${origin}/en${item.suffix}`,
      xDefaultLoc: `${origin}/bn${item.suffix}`,
      lastmod,
      changefreq: item.changefreq,
      priority: item.priority,
    };
    allUrlBlocks.push(renderUrlEntry(pair.bnLoc, pair));
    allUrlBlocks.push(renderUrlEntry(pair.enLoc, pair));
  }

  for (const cat of categories ?? []) {
    if (!cat.slug) continue;
    const encodedSlug = encodeURIComponent(cat.slug);
    const pair: SitemapUrlItem = {
      bnLoc: `${origin}/bn/category/${encodedSlug}`,
      enLoc: `${origin}/en/category/${encodedSlug}`,
      xDefaultLoc: `${origin}/bn/category/${encodedSlug}`,
      changefreq: 'daily',
      priority: '0.8',
    };
    allUrlBlocks.push(renderUrlEntry(pair.bnLoc, pair));
    allUrlBlocks.push(renderUrlEntry(pair.enLoc, pair));
  }

  for (const prod of products ?? []) {
    if (!prod.slug) continue;
    const encodedSlug = encodeURIComponent(prod.slug);
    const pair: SitemapUrlItem = {
      bnLoc: `${origin}/bn/product/${encodedSlug}`,
      enLoc: `${origin}/en/product/${encodedSlug}`,
      xDefaultLoc: `${origin}/bn/product/${encodedSlug}`,
      lastmod: formatLastMod(prod.updated_at) ?? today,
      changefreq: 'weekly',
      priority: '0.8',
    };
    allUrlBlocks.push(renderUrlEntry(pair.bnLoc, pair));
    allUrlBlocks.push(renderUrlEntry(pair.enLoc, pair));
  }

  // Automatic sitemap index splitting when catalog grows beyond 45,000 URLs
  if (allUrlBlocks.length > MAX_URLS_PER_SITEMAP) {
    const totalParts = Math.ceil(allUrlBlocks.length / MAX_URLS_PER_SITEMAP);

    if (!partParam) {
      const indexEntries = Array.from({ length: totalParts }, (_, idx) => {
        const partNumber = idx + 1;
        return `  <sitemap>\n    <loc>${escapeXml(`${origin}/sitemap.xml?part=${partNumber}`)}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`;
      }).join('\n');

      const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexEntries}\n</sitemapindex>`;
      return new Response(indexXml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    const partNum = Number.parseInt(partParam, 10);
    if (!Number.isFinite(partNum) || partNum < 1 || partNum > totalParts) {
      return new Response('Sitemap part not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const start = (partNum - 1) * MAX_URLS_PER_SITEMAP;
    const slice = allUrlBlocks.slice(start, start + MAX_URLS_PER_SITEMAP);
    const partXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${slice.join('\n')}\n</urlset>`;
    return new Response(partXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
      },
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${allUrlBlocks.join('\n')}\n</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
    },
  });
};
