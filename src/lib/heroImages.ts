export const HERO_RESPONSIVE_WIDTHS = [480, 768, 1280, 1920] as const;

export const HERO_IMAGE_SIZES =
  '(max-width: 639px) 100vw, (max-width: 1023px) 100vw, (max-width: 1536px) 1280px, 1440px';

export interface ResponsiveHeroSources {
  src: string;
  avifSrcSet?: string;
  webpSrcSet?: string;
  sizes: string;
  thumbnailSrc: string;
}

const SUPABASE_TRANSFORM_ENABLED =
  import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORM === 'true';

function qualityForWidth(width: number): number {
  if (width <= 480) return 68;
  if (width <= 768) return 72;
  if (width <= 1280) return 75;
  return 72;
}

function buildUnsplashUrl(rawUrl: string, width: number, format: 'avif' | 'webp'): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('auto', 'format');
    parsed.searchParams.set('fit', 'crop');
    parsed.searchParams.set('w', String(width));
    parsed.searchParams.set('q', String(format === 'avif' ? Math.max(58, qualityForWidth(width) - 6) : qualityForWidth(width)));
    parsed.searchParams.set('fm', format);
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function buildPexelsUrl(rawUrl: string, width: number): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('auto', 'compress');
    parsed.searchParams.set('cs', 'tinysrgb');
    parsed.searchParams.set('fit', 'crop');
    parsed.searchParams.set('w', String(width));
    parsed.searchParams.set('fm', 'webp');
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function buildSupabaseTransformUrl(rawUrl: string, width: number): string {
  try {
    const parsed = new URL(rawUrl);
    const objectPrefix = '/storage/v1/object/public/';
    if (!parsed.pathname.includes(objectPrefix)) return rawUrl;
    parsed.pathname = parsed.pathname.replace(objectPrefix, '/storage/v1/render/image/public/');
    parsed.searchParams.set('width', String(width));
    parsed.searchParams.set('quality', String(qualityForWidth(width)));
    parsed.searchParams.set('resize', 'cover');
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function buildResponsiveHeroSources(rawUrl: string): ResponsiveHeroSources {
  if (!rawUrl) {
    return {
      src: '',
      sizes: HERO_IMAGE_SIZES,
      thumbnailSrc: '',
    };
  }

  const lower = rawUrl.toLowerCase();

  // 1. Unsplash CDN: native AVIF + WebP srcSet for 480, 768, 1280, 1920
  if (lower.includes('images.unsplash.com') || lower.includes('plus.unsplash.com')) {
    const avifSrcSet = HERO_RESPONSIVE_WIDTHS.map(
      (w) => `${buildUnsplashUrl(rawUrl, w, 'avif')} ${w}w`,
    ).join(', ');
    const webpSrcSet = HERO_RESPONSIVE_WIDTHS.map(
      (w) => `${buildUnsplashUrl(rawUrl, w, 'webp')} ${w}w`,
    ).join(', ');

    return {
      src: buildUnsplashUrl(rawUrl, 1280, 'webp'),
      avifSrcSet,
      webpSrcSet,
      sizes: HERO_IMAGE_SIZES,
      thumbnailSrc: buildUnsplashUrl(rawUrl, 240, 'webp'),
    };
  }

  // 2. Pexels CDN: WebP srcSet across 480, 768, 1280, 1920
  if (lower.includes('images.pexels.com')) {
    const webpSrcSet = HERO_RESPONSIVE_WIDTHS.map(
      (w) => `${buildPexelsUrl(rawUrl, w)} ${w}w`,
    ).join(', ');

    return {
      src: buildPexelsUrl(rawUrl, 1280),
      webpSrcSet,
      sizes: HERO_IMAGE_SIZES,
      thumbnailSrc: buildPexelsUrl(rawUrl, 240),
    };
  }

  // 3. Supabase Storage: optional render transform if enabled on the project
  if (
    SUPABASE_TRANSFORM_ENABLED &&
    lower.includes('.supabase.co/storage/v1/object/public/')
  ) {
    const webpSrcSet = HERO_RESPONSIVE_WIDTHS.map(
      (w) => `${buildSupabaseTransformUrl(rawUrl, w)} ${w}w`,
    ).join(', ');

    return {
      src: buildSupabaseTransformUrl(rawUrl, 1280),
      webpSrcSet,
      sizes: HERO_IMAGE_SIZES,
      thumbnailSrc: buildSupabaseTransformUrl(rawUrl, 240),
    };
  }

  // 4. Direct URL fallback (already WebP-compressed on upload)
  return {
    src: rawUrl,
    sizes: HERO_IMAGE_SIZES,
    thumbnailSrc: rawUrl,
  };
}

/**
 * Pick the best image source candidate for idle preloading at current viewport width.
 */
export function getOptimalPreloadSrc(sources: ResponsiveHeroSources): string {
  if (typeof window === 'undefined') return sources.src;
  const viewportWidth = window.innerWidth * (window.devicePixelRatio || 1);
  const targetWidth =
    viewportWidth <= 520
      ? 480
      : viewportWidth <= 840
      ? 768
      : viewportWidth <= 1440
      ? 1280
      : 1920;

  const candidateList = sources.webpSrcSet || sources.avifSrcSet;
  if (!candidateList) return sources.src;

  const entries = candidateList.split(',').map((item) => item.trim().split(/\s+/));
  const match = entries.find(([, descriptor]) => descriptor === `${targetWidth}w`);
  return match?.[0] || sources.src;
}
