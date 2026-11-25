import {
  type CfPagesContext,
  cleanMetaText,
  computeActivePrice,
  escapeHtml,
  fetchActiveCategories,
  fetchActivePages,
  fetchAllPublicProducts,
  fetchEdgeSettings,
  fetchProductDetailForSeo,
  getSupabaseCreds,
  injectSeoIntoHtml,
  isLocalOrPreviewHost,
  normalizeRoutePath,
  resolveSiteOrigin,
} from './_lib/seo-data';

const STATIC_FILE_EXT_RE =
  /\.(html|js|mjs|css|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|json|webmanifest|txt|xml|pdf)$/i;

const CRAWLER_UA_RE =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|applebot|pinterest|discordbot|lighthouse|chrome-lighthouse|pagespeed/i;

const UNPREFIXED_STOREFRONT_PREFIXES = new Set([
  'shop',
  'category',
  'product',
  'cart',
  'checkout',
  'order-success',
  'track-order',
  'about',
  'contact',
  'return-policy',
  'privacy-policy',
  'terms',
]);

function isCrawlerRequest(request: Request): boolean {
  const ua = request.headers.get('user-agent') || '';
  return CRAWLER_UA_RE.test(ua);
}

const POLICY_SLUGS = new Set(['about', 'return-policy', 'privacy-policy', 'terms']);

const POLICY_META: Record<
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
    descBn:
      'MartBari গ্রাহকের ব্যক্তিগত তথ্য সুরক্ষা ও গোপনীয়তা নীতিমালা সম্পর্কে জানুন।',
    descEn:
      'Learn how MartBari protects customer order details and personal information across Bangladesh.',
  },
  terms: {
    titleBn: 'শর্তাবলী',
    titleEn: 'Terms & Conditions',
    descBn:
      'MartBari ওয়েবসাইট ব্যবহার, অর্ডার, মূল্য, ডেলিভারি ও ওয়ারেন্টি সংক্রান্ত শর্তাবলী।',
    descEn:
      'Review MartBari terms and conditions covering orders, pricing in BDT, delivery, and warranty support.',
  },
};

async function loadSpaTemplateHtml(context: CfPagesContext): Promise<string | null> {
  const { request, env, next } = context;
  const reqUrl = new URL(request.url);
  if (env.ASSETS) {
    const assetRes = await env.ASSETS.fetch(new URL('/index.html', reqUrl.origin).toString());
    if (assetRes.ok) {
      return await assetRes.text();
    }
  }
  const fallbackRes = await next();
  const contentType = fallbackRes.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return null;
  return await fallbackRes.text();
}

function buildNotFoundResponse(
  templateHtml: string,
  origin: string,
  lang: 'bn' | 'en',
  isBot = false,
): Response {
  const title = lang === 'bn' ? 'পৃষ্ঠাটি পাওয়া যায়নি (৪০৪) — MartBari' : 'Page Not Found (404) — MartBari';
  const description =
    lang === 'bn'
      ? 'আপনি যে পৃষ্ঠাটি খুঁজছেন তা পাওয়া যায়নি বা সরানো হয়েছে।'
      : 'The page or product you are looking for could not be found.';

  const html = injectSeoIntoHtml(templateHtml, {
    lang,
    title,
    description,
    robots: 'noindex, follow',
    origin,
    semanticBodyHtml: isBot
      ? `<main style="max-width:720px;margin:64px auto;padding:24px;text-align:center;font-family:system-ui,sans-serif"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p><a href="/${lang}">${lang === 'bn' ? 'হোম পেজে ফিরুন' : 'Return Home'}</a></p></main>`
      : undefined,
  });

  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, follow',
      'Cache-Control': 'no-store',
    },
  });
}

function buildBreadcrumbSchema(
  items: Array<{ name: string; url?: string }>,
  origin: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url.startsWith('http') ? item.url : `${origin}${item.url}` } : {}),
    })),
  };
}

export const onRequest = async (context: CfPagesContext): Promise<Response> => {
  const { request, env, next } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return next();
  }

  const reqUrl = new URL(request.url);
  const rawPathname = reqUrl.pathname;

  // 1. Bypass static files, assets, sitemap, robots, and service worker scripts
  if (
    rawPathname === '/sitemap.xml' ||
    rawPathname === '/robots.txt' ||
    rawPathname === '/manifest.webmanifest' ||
    rawPathname === '/sw.js' ||
    rawPathname === '/registerSW.js' ||
    rawPathname.startsWith('/assets/') ||
    rawPathname.startsWith('/src/assets/') ||
    rawPathname.startsWith('/api/') ||
    STATIC_FILE_EXT_RE.test(rawPathname)
  ) {
    return next();
  }

  // 2. Enforce canonical HTTPS non-www domain on custom production domains
  if (!isLocalOrPreviewHost(reqUrl.hostname)) {
    const needsWwwStrip = reqUrl.hostname.toLowerCase().startsWith('www.');
    const needsHttps = reqUrl.protocol === 'http:';
    if (needsWwwStrip || needsHttps) {
      const target = new URL(request.url);
      if (needsWwwStrip) target.hostname = target.hostname.slice(4);
      target.protocol = 'https:';
      return Response.redirect(target.toString(), 301);
    }
  }

  const origin = resolveSiteOrigin(request, env);
  const pathname = normalizeRoutePath(rawPathname);

  // 3. Noindex transactional, utility, and admin routes
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/font-test' ||
    /^\/(bn|en)\/(cart|checkout|track-order)(\/|$)/.test(pathname) ||
    /^\/(bn|en)\/order-success\/[^/]+$/.test(pathname)
  ) {
    const templateHtml = await loadSpaTemplateHtml(context);
    if (!templateHtml) return next();
    const langMatch = pathname.match(/^\/(bn|en)(?=\/|$)/);
    const lang: 'bn' | 'en' = langMatch?.[1] === 'en' ? 'en' : 'bn';
    const noindexHtml = injectSeoIntoHtml(templateHtml, {
      lang,
      title: pathname.startsWith('/admin') ? 'MartBari Admin' : 'MartBari',
      description: 'MartBari transactional & store management portal.',
      robots: 'noindex, nofollow',
      origin,
    });
    return new Response(noindexHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store',
      },
    });
  }

  const isBot = isCrawlerRequest(request);
  const templateHtml = await loadSpaTemplateHtml(context);
  if (!templateHtml) return next();

  // 4. Identify localized route or redirect unprefixed storefront routes preserving exact path & query
  const isRootPath = pathname === '/';
  const langSegmentMatch = pathname.match(/^\/(bn|en)(\/.*)?$/);
  if (!isRootPath && !langSegmentMatch) {
    const firstSeg = pathname.split('/')[1]?.toLowerCase() || '';
    if (UNPREFIXED_STOREFRONT_PREFIXES.has(firstSeg)) {
      return Response.redirect(`${origin}/bn${pathname}${reqUrl.search}`, 302);
    }
    return buildNotFoundResponse(templateHtml, origin, 'bn', isBot);
  }

  const lang: 'bn' | 'en' = langSegmentMatch?.[1] === 'en' ? 'en' : 'bn';
  const subPath = isRootPath ? '' : langSegmentMatch?.[2] || '';
  const hasSupabase = getSupabaseCreds(env) !== null;
  const settings = await fetchEdgeSettings(env);
  const storeName = lang === 'bn' ? settings.store_name_bn : settings.store_name_en;

  // 5. Home Page (/ or /bn or /en)
  if (subPath === '') {
    const title =
      lang === 'bn'
        ? `${storeName} — আপনার এক ঠিকানার অনলাইন শপ | গ্যাজেট ও হোম অ্যাপ্লায়েন্স`
        : `${storeName} — Your One-Stop Online Shop in Bangladesh`;
    const description =
      lang === 'bn'
        ? 'স্মার্ট ওয়াচ, এএনসি হেডফোন, ট্রু ওয়্যারলেস ইয়ারবাডস ও হোম অ্যাপ্লায়েন্স — সারা বাংলাদেশে দ্রুত ক্যাশ অন ডেলিভারি ও ওয়ারেন্টি সহ।'
        : 'Shop AMOLED smart watches, ANC headphones, wireless earbuds, lighting, and home appliances with fast Cash on Delivery across Bangladesh.';

    const [categories, products] = await Promise.all([
      hasSupabase ? fetchActiveCategories(env, settings.show_demo_data) : Promise.resolve(null),
      hasSupabase ? fetchAllPublicProducts(env, settings.show_demo_data) : Promise.resolve(null),
    ]);

    const socialUrls = [
      settings.facebook_url,
      settings.instagram_url,
      settings.youtube_url,
      settings.tiktok_url,
    ].filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u)));

    const orgWebsiteSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${origin}/#organization`,
          name: storeName,
          url: origin,
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/pwa-512x512.png`,
            width: 512,
            height: 512,
          },
          ...(settings.phone || settings.email
            ? {
                contactPoint: {
                  '@type': 'ContactPoint',
                  ...(settings.phone ? { telephone: settings.phone } : {}),
                  ...(settings.email ? { email: settings.email } : {}),
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
          publisher: { '@id': `${origin}/#organization` },
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

    const jsonLdObjects: Array<Record<string, unknown>> = [orgWebsiteSchema];
    if (products && products.length > 0) {
      jsonLdObjects.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: lang === 'bn' ? 'জনপ্রিয় গ্যাজেট ও ইলেকট্রনিক্স' : 'Featured Electronics & Gadgets',
        numberOfItems: Math.min(products.length, 12),
        itemListElement: products.slice(0, 12).map((p, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `${origin}/${lang}/product/${p.slug}`,
          name: lang === 'bn' ? p.name_bn : p.name_en,
        })),
      });
    }

    const catLinks = (categories ?? [])
      .slice(0, 8)
      .map(
        (c) =>
          `<li><a href="/${lang}/category/${escapeHtml(c.slug)}">${escapeHtml(lang === 'bn' ? c.name_bn : c.name_en)}</a></li>`,
      )
      .join('');
    const prodLinks = (products ?? [])
      .slice(0, 12)
      .map(
        (p) =>
          `<li><a href="/${lang}/product/${escapeHtml(p.slug)}">${escapeHtml(lang === 'bn' ? p.name_bn : p.name_en)}</a> — ৳${computeActivePrice(p)}</li>`,
      )
      .join('');

    const html = injectSeoIntoHtml(templateHtml, {
      lang,
      title,
      description,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      canonicalUrl: `${origin}/${lang}`,
      hreflangSubPath: '',
      origin,
      ogType: 'website',
      jsonLdObjects,
      semanticBodyHtml: isBot
        ? `<main style="max-width:1280px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${catLinks ? `<nav aria-label="Categories"><ul>${catLinks}</ul></nav>` : ''}${prodLinks ? `<ul>${prodLinks}</ul>` : ''}<p><a href="/${lang}/shop">${lang === 'bn' ? 'সব পণ্য দেখুন' : 'Shop All Products'}</a></p></main>`
        : undefined,
    });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
      },
    });
  }

  // 6. Product Detail Route (/bn/product/:slug or /en/product/:slug)
  const productMatch = subPath.match(/^\/product\/([^/]+)$/);
  if (productMatch) {
    const slug = decodeURIComponent(productMatch[1]);
    if (hasSupabase) {
      const detail = await fetchProductDetailForSeo(env, slug, settings.show_demo_data);
      if (!detail) {
        return buildNotFoundResponse(templateHtml, origin, lang);
      }

      const { product, images, brand, category, reviews } = detail;
      const productName = lang === 'bn' ? product.name_bn : product.name_en;
      const rawTitle = lang === 'bn' ? product.seo_title_bn : product.seo_title_en;
      const rawDesc = lang === 'bn' ? product.seo_desc_bn : product.seo_desc_en;
      const activePrice = computeActivePrice(product);
      const isOutOfStock = product.track_stock && product.stock <= 0;

      const title = rawTitle
        ? rawTitle
        : lang === 'bn'
        ? `${productName} — ৳${activePrice.toLocaleString('en-US')} | ${storeName}`
        : `${productName} — ৳${activePrice.toLocaleString('en-US')} | ${storeName}`;

      const fallbackDesc = cleanMetaText(
        (lang === 'bn'
          ? product.short_desc_bn || product.description_bn
          : product.short_desc_en || product.description_en) ||
          (lang === 'bn'
            ? `${productName} কিনুন ${storeName} থেকে মাত্র ৳${activePrice} টাকায়। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।`
            : `Buy ${productName} at ${storeName} for ৳${activePrice}. Fast Cash on Delivery across Bangladesh.`),
        158,
      );
      const description = rawDesc ? cleanMetaText(rawDesc, 158) : fallbackDesc;

      const validImages = images.map((img) => img.image_url).filter((u) => /^https?:\/\//i.test(u));
      const ogImage = validImages[0] || `${origin}/pwa-512x512.png`;
      const productUrl = `${origin}/${lang}/product/${encodeURIComponent(product.slug)}`;

      const breadcrumbItems: Array<{ name: string; url?: string }> = [
        { name: lang === 'bn' ? 'হোম' : 'Home', url: `/${lang}` },
        { name: lang === 'bn' ? 'শপ' : 'Shop', url: `/${lang}/shop` },
      ];
      if (category) {
        breadcrumbItems.push({
          name: lang === 'bn' ? category.name_bn : category.name_en,
          url: `/${lang}/category/${category.slug}`,
        });
      }
      breadcrumbItems.push({ name: productName, url: productUrl });

      const hasValidSaleEnd =
        Boolean(product.sale_ends_at) &&
        !Number.isNaN(new Date(product.sale_ends_at!).getTime()) &&
        new Date(product.sale_ends_at!).getTime() > Date.now();

      const productSchema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: productName,
        description: cleanMetaText(
          (lang === 'bn'
            ? product.description_bn || product.short_desc_bn
            : product.description_en || product.short_desc_en) || productName,
          500,
        ),
        sku: product.sku,
        url: productUrl,
        image: validImages.length > 0 ? validImages : [`${origin}/pwa-512x512.png`],
        ...(brand ? { brand: { '@type': 'Brand', name: brand.name } } : {}),
        ...(category
          ? { category: lang === 'bn' ? category.name_bn : category.name_en }
          : {}),
        offers: {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency: 'BDT',
          price: activePrice.toFixed(2),
          availability: isOutOfStock
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: storeName, url: origin },
          ...(hasValidSaleEnd
            ? { priceValidUntil: new Date(product.sale_ends_at!).toISOString().slice(0, 10) }
            : {}),
        },
      };

      if (reviews.length > 0) {
        const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
        productSchema.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: Number((sum / reviews.length).toFixed(1)),
          reviewCount: reviews.length,
          bestRating: 5,
          worstRating: 1,
        };
        productSchema.review = reviews.slice(0, 5).map((r) => ({
          '@type': 'Review',
          author: { '@type': 'Person', name: r.customer_name },
          datePublished: r.created_at ? r.created_at.slice(0, 10) : undefined,
          reviewRating: {
            '@type': 'Rating',
            ratingValue: Number(r.rating || 5),
            bestRating: 5,
            worstRating: 1,
          },
          ...(r.comment ? { reviewBody: cleanMetaText(r.comment, 300) } : {}),
        }));
      }

      const html = injectSeoIntoHtml(templateHtml, {
        lang,
        title,
        description,
        robots: 'index, follow, max-image-preview:large, max-snippet:-1',
        canonicalUrl: productUrl,
        hreflangSubPath: `/product/${encodeURIComponent(product.slug)}`,
        origin,
        ogType: 'product',
        ogImage,
        extraMetaTags: [
          `    <meta property="product:price:amount" content="${activePrice.toFixed(2)}" />`,
          `    <meta property="product:price:currency" content="BDT" />`,
          `    <meta property="product:availability" content="${isOutOfStock ? 'out of stock' : 'in stock'}" />`,
        ],
        jsonLdObjects: [productSchema, buildBreadcrumbSchema(breadcrumbItems, origin)],
        semanticBodyHtml: isBot
          ? `<main style="max-width:1120px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif"><h1>${escapeHtml(productName)}</h1><p>${escapeHtml(description)}</p><p><strong>৳${activePrice}</strong> · ${isOutOfStock ? (lang === 'bn' ? 'স্টক শেষ' : 'Out of stock') : lang === 'bn' ? 'স্টকে আছে' : 'In stock'}</p></main>`
          : undefined,
      });

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    const productUrl = `${origin}/${lang}/product/${encodeURIComponent(slug)}`;
    const fallbackHtml = injectSeoIntoHtml(templateHtml, {
      lang,
      title: storeName,
      description:
        lang === 'bn'
          ? `${storeName} থেকে সেরা মানের পণ্য অনলাইনে অর্ডার করুন।`
          : `Shop quality gadgets and appliances at ${storeName}.`,
      robots: 'index, follow, max-image-preview:large',
      canonicalUrl: productUrl,
      hreflangSubPath: `/product/${encodeURIComponent(slug)}`,
      origin,
      ogType: 'website',
    });
    return new Response(fallbackHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=120',
      },
    });
  }

  // 7. Shop & Category Routes (/bn/shop, /en/shop, /bn/category/:slug, /en/category/:slug)
  const categoryMatch = subPath.match(/^\/category\/([^/]+)$/);
  if (subPath === '/shop' || categoryMatch) {
    const catSlug = categoryMatch ? decodeURIComponent(categoryMatch[1]) : null;
    const categories = hasSupabase
      ? await fetchActiveCategories(env, settings.show_demo_data)
      : null;

    const currentCat = catSlug && categories ? categories.find((c) => c.slug === catSlug) : null;
    if (catSlug && hasSupabase && categories !== null && !currentCat) {
      return buildNotFoundResponse(templateHtml, origin, lang, isBot);
    }

    const q = reqUrl.searchParams.get('q');
    const brandParam = reqUrl.searchParams.get('brand');
    const minPrice = reqUrl.searchParams.get('min_price');
    const maxPrice = reqUrl.searchParams.get('max_price');
    const inStock = reqUrl.searchParams.get('in_stock');
    const onSale = reqUrl.searchParams.get('on_sale');
    const sort = reqUrl.searchParams.get('sort');
    const categoryQueryParam = reqUrl.searchParams.get('category');
    const rawPage = Number.parseInt(reqUrl.searchParams.get('page') || '1', 10);
    const pageNum = Number.isFinite(rawPage) && rawPage > 1 ? rawPage : 1;

    const hasFacetedParams = Boolean(
      q ||
        brandParam ||
        minPrice ||
        maxPrice ||
        inStock === 'true' ||
        onSale === 'true' ||
        (sort && sort !== 'featured') ||
        (subPath === '/shop' && categoryQueryParam),
    );

    const catName = currentCat
      ? lang === 'bn'
        ? currentCat.name_bn
        : currentCat.name_en
      : null;

    const title = currentCat
      ? (lang === 'bn' ? currentCat.seo_title_bn : currentCat.seo_title_en) ||
        `${catName} — ${storeName}`
      : lang === 'bn'
      ? `সব পণ্য ও গ্যাজেট — ${storeName}`
      : `Shop All Electronics & Gadgets — ${storeName}`;

    const description = currentCat
      ? cleanMetaText(
          (lang === 'bn' ? currentCat.seo_desc_bn : currentCat.seo_desc_en) ||
            (lang === 'bn'
              ? `${catName} ক্যাটাগরির সেরা মানের পণ্য কিনুন ${storeName} থেকে। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।`
              : `Browse ${catName} products online at ${storeName} with fast Cash on Delivery across Bangladesh.`),
          158,
        )
      : lang === 'bn'
      ? `${storeName} থেকে স্মার্ট ওয়াচ, হেডফোন, ইয়ারবাডস ও হোম অ্যাপ্লায়েন্স অনলাইনে কিনুন।`
      : `Explore smart watches, ANC headphones, earbuds, and home appliances at ${storeName}.`;

    const baseSubPath = catSlug ? `/category/${encodeURIComponent(catSlug)}` : '/shop';
    const canonicalSubPath = pageNum > 1 ? `${baseSubPath}?page=${pageNum}` : baseSubPath;
    const canonicalUrl = `${origin}/${lang}${canonicalSubPath}`;

    const breadcrumbs: Array<{ name: string; url?: string }> = [
      { name: lang === 'bn' ? 'হোম' : 'Home', url: `/${lang}` },
      { name: lang === 'bn' ? 'শপ' : 'Shop', url: `/${lang}/shop` },
    ];
    if (catName && catSlug) {
      breadcrumbs.push({ name: catName, url: `/${lang}/category/${catSlug}` });
    }

    const collectionSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: catName || (lang === 'bn' ? 'সব পণ্য' : 'All Products'),
      description,
      url: canonicalUrl,
      inLanguage: lang,
      isPartOf: { '@id': `${origin}/#website` },
    };

    const html = injectSeoIntoHtml(templateHtml, {
      lang,
      title,
      description,
      robots: hasFacetedParams ? 'noindex, follow' : 'index, follow, max-image-preview:large',
      canonicalUrl,
      hreflangSubPath: canonicalSubPath,
      origin,
      ogType: 'website',
      ogImage:
        currentCat?.image_url && /^https?:\/\//i.test(currentCat.image_url)
          ? currentCat.image_url
          : `${origin}/pwa-512x512.png`,
      jsonLdObjects: [collectionSchema, buildBreadcrumbSchema(breadcrumbs, origin)],
      semanticBodyHtml: isBot
        ? `<main style="max-width:1280px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif"><h1>${escapeHtml(catName || (lang === 'bn' ? 'সব পণ্য' : 'Shop All Products'))}</h1><p>${escapeHtml(description)}</p></main>`
        : undefined,
    });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...(hasFacetedParams ? { 'X-Robots-Tag': 'noindex, follow' } : {}),
        'Cache-Control': hasFacetedParams
          ? 'no-store'
          : 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
      },
    });
  }

  // 8. Policy & About Pages
  const cleanSubSlug = subPath.replace(/^\//, '');
  if (POLICY_SLUGS.has(cleanSubSlug)) {
    const pages = hasSupabase ? await fetchActivePages(env) : null;
    const dbPage = pages?.find((p) => p.slug === cleanSubSlug);
    const meta = POLICY_META[cleanSubSlug];

    const pageTitle = dbPage
      ? lang === 'bn'
        ? dbPage.title_bn
        : dbPage.title_en
      : lang === 'bn'
      ? meta.titleBn
      : meta.titleEn;

    const description = dbPage
      ? cleanMetaText(lang === 'bn' ? dbPage.content_bn : dbPage.content_en, 158) ||
        (lang === 'bn' ? meta.descBn : meta.descEn)
      : lang === 'bn'
      ? meta.descBn
      : meta.descEn;

    const canonicalUrl = `${origin}/${lang}/${cleanSubSlug}`;
    const pageSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': cleanSubSlug === 'about' ? 'AboutPage' : 'WebPage',
      name: pageTitle,
      description,
      url: canonicalUrl,
      inLanguage: lang,
      isPartOf: { '@id': `${origin}/#website` },
    };

    const html = injectSeoIntoHtml(templateHtml, {
      lang,
      title: `${pageTitle} — ${storeName}`,
      description,
      robots: 'index, follow',
      canonicalUrl,
      hreflangSubPath: `/${cleanSubSlug}`,
      origin,
      ogType: 'website',
      jsonLdObjects: [
        pageSchema,
        buildBreadcrumbSchema(
          [
            { name: lang === 'bn' ? 'হোম' : 'Home', url: `/${lang}` },
            { name: pageTitle, url: `/${lang}/${cleanSubSlug}` },
          ],
          origin,
        ),
      ],
      semanticBodyHtml: isBot
        ? `<main style="max-width:960px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif"><h1>${escapeHtml(pageTitle)}</h1><p>${escapeHtml(description)}</p></main>`
        : undefined,
    });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    });
  }

  // 9. Contact Page (/bn/contact or /en/contact)
  if (subPath === '/contact') {
    const title = lang === 'bn' ? `যোগাযোগ করুন — ${storeName}` : `Contact Us — ${storeName}`;
    const description =
      lang === 'bn'
        ? `অর্ডার বা ডেলিভারি সংক্রান্ত সহায়তার জন্য ${storeName} এর সাথে ফোন, হোয়াটসঅ্যাপ বা ইমেইলে যোগাযোগ করুন।`
        : `Contact ${storeName} customer support by phone, WhatsApp, or email for order and delivery help in Bangladesh.`;
    const canonicalUrl = `${origin}/${lang}/contact`;

    const contactSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: title,
      description,
      url: canonicalUrl,
      inLanguage: lang,
      isPartOf: { '@id': `${origin}/#website` },
    };

    const html = injectSeoIntoHtml(templateHtml, {
      lang,
      title,
      description,
      robots: 'index, follow',
      canonicalUrl,
      hreflangSubPath: '/contact',
      origin,
      ogType: 'website',
      jsonLdObjects: [
        contactSchema,
        buildBreadcrumbSchema(
          [
            { name: lang === 'bn' ? 'হোম' : 'Home', url: `/${lang}` },
            { name: lang === 'bn' ? 'যোগাযোগ' : 'Contact', url: `/${lang}/contact` },
          ],
          origin,
        ),
      ],
      semanticBodyHtml: isBot
        ? `<main style="max-width:960px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></main>`
        : undefined,
    });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    });
  }

  // 10. Any unrecognized sub-route under /bn/* or /en/* returns real HTTP 404 (prevents soft 404s)
  return buildNotFoundResponse(templateHtml, origin, lang, isBot);
};
