import { type CfPagesContext, resolveSiteOrigin } from './_lib/seo-data';

export const onRequestGet = async (context: CfPagesContext): Promise<Response> => {
  const origin = resolveSiteOrigin(context.request, context.env);

  const body = [
    'User-agent: *',
    'Allow: /',
    'Allow: /assets/',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /cart',
    'Disallow: /*/cart',
    'Disallow: /checkout',
    'Disallow: /*/checkout',
    'Disallow: /order-success',
    'Disallow: /*/order-success',
    'Disallow: /track-order',
    'Disallow: /*/track-order',
    'Disallow: /font-test',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, must-revalidate',
    },
  });
};
