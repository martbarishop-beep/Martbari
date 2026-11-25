import type { Brand, Category, PublicProduct, Review } from '../types';

export const DEFAULT_SITE_ORIGIN = 'https://martbari.pages.dev';

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    // Normalize www -> apex for consistent canonical domain unless local/preview
    if (host.startsWith('www.') && !host.includes('localhost')) {
      url.hostname = host.slice(4);
    }
    if (
      url.protocol === 'http:' &&
      !host.includes('localhost') &&
      !host.startsWith('127.')
    ) {
      url.protocol = 'https:';
    }
    return url.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function resolveCanonicalOrigin(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (configured && /^https?:\/\//i.test(configured) && !configured.includes('placeholder')) {
    return normalizeOrigin(configured);
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeOrigin(window.location.origin);
  }
  return DEFAULT_SITE_ORIGIN;
}

export function normalizeRoutePath(path: string): string {
  const clean = path.split('?')[0].split('#')[0];
  const prefixed = clean.startsWith('/') ? clean : `/${clean}`;
  if (prefixed.length > 1) {
    return prefixed.replace(/\/+$/, '');
  }
  return prefixed;
}

export function buildCanonicalUrl(routePath: string, origin = resolveCanonicalOrigin()): string {
  return `${origin}${normalizeRoutePath(routePath)}`;
}

export function buildHreflangUrls(
  subPath: string,
  origin = resolveCanonicalOrigin(),
): { bn: string; en: string; xDefault: string } {
  const stripped = normalizeRoutePath(subPath).replace(/^\/(bn|en)(?=\/|$)/, '');
  const suffix = stripped === '/' ? '' : stripped;
  return {
    bn: `${origin}/bn${suffix}`,
    en: `${origin}/en${suffix}`,
    xDefault: `${origin}/bn${suffix}`,
  };
}

export function cleanMetaDescription(raw: string | null | undefined, maxLength = 158): string {
  if (!raw) return '';
  const stripped = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length <= maxLength) return stripped;
  const sliced = stripped.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>,
  origin = resolveCanonicalOrigin(),
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      ...(item.url
        ? {
            item: item.url.startsWith('http')
              ? item.url
              : `${origin}${normalizeRoutePath(item.url)}`,
          }
        : {}),
    })),
  };
}

export function buildOrganizationAndWebsiteGraph(params: {
  origin: string;
  lang: 'bn' | 'en';
  storeName: string;
  description: string;
  phone?: string;
  email?: string;
  socialUrls?: string[];
}) {
  const { origin, lang, storeName, description, phone, email, socialUrls = [] } = params;
  const logoUrl = `${origin}/pwa-512x512.png`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: storeName,
        url: origin,
        logo: {
          '@type': 'ImageObject',
          url: logoUrl,
          width: 512,
          height: 512,
        },
        ...(phone || email
          ? {
              contactPoint: {
                '@type': 'ContactPoint',
                ...(phone ? { telephone: phone } : {}),
                ...(email ? { email } : {}),
                contactType: 'customer service',
                areaServed: 'BD',
                availableLanguage: ['Bengali', 'English'],
              },
            }
          : {}),
        ...(socialUrls.length > 0 ? { sameAs: socialUrls } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: `${origin}/${lang}`,
        name: storeName,
        description,
        inLanguage: lang,
        publisher: {
          '@id': `${origin}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${origin}/${lang}/shop?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export function buildProductJsonLd(params: {
  origin: string;
  lang: 'bn' | 'en';
  storeName: string;
  product: PublicProduct & {
    images: string[];
    brand?: Brand | null;
    category?: Category | null;
  };
  activePrice: number;
  isOutOfStock: boolean;
  reviews: Review[];
}) {
  const { origin, lang, storeName, product, activePrice, isOutOfStock, reviews } = params;
  const name = lang === 'bn' ? product.name_bn : product.name_en;
  const desc = cleanMetaDescription(
    (lang === 'bn' ? product.description_bn || product.short_desc_bn : product.description_en || product.short_desc_en) ||
      name,
    500,
  );
  const url = `${origin}/${lang}/product/${product.slug}`;
  const validImages = product.images.filter((u) => /^https?:\/\//i.test(u));
  const categoryName = product.category
    ? lang === 'bn'
      ? product.category.name_bn
      : product.category.name_en
    : undefined;

  const hasValidSaleEnd =
    Boolean(product.sale_ends_at) &&
    !Number.isNaN(new Date(product.sale_ends_at!).getTime()) &&
    new Date(product.sale_ends_at!).getTime() > Date.now();

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name,
    description: desc,
    sku: product.sku,
    url,
    ...(validImages.length > 0 ? { image: validImages } : { image: [`${origin}/pwa-512x512.png`] }),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand.name } } : {}),
    ...(categoryName ? { category: categoryName } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'BDT',
      price: Number(activePrice).toFixed(2),
      availability: isOutOfStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: storeName,
        url: origin,
      },
      ...(hasValidSaleEnd
        ? { priceValidUntil: new Date(product.sale_ends_at!).toISOString().slice(0, 10) }
        : {}),
    },
  };

  if (reviews.length > 0) {
    const ratingSum = reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0);
    const avgRating = Number((ratingSum / reviews.length).toFixed(1));
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
    schema.review = reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: r.customer_name,
      },
      datePublished: r.created_at ? r.created_at.slice(0, 10) : undefined,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(r.rating || 5),
        bestRating: 5,
        worstRating: 1,
      },
      ...(r.comment ? { reviewBody: cleanMetaDescription(r.comment, 300) } : {}),
    }));
  }

  return schema;
}
