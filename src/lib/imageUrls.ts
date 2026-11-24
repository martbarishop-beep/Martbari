export const CARD_RESPONSIVE_WIDTHS = [320, 480, 800] as const;

export const CARD_IMAGE_SIZES =
  '(max-width: 639px) 48vw, (max-width: 1023px) 30vw, 240px';

export interface ResponsiveCardSources {
  src: string;
  avifSrcSet?: string;
  webpSrcSet?: string;
  sizes: string;
}

const SUPABASE_TRANSFORM_ENABLED =
  import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORM === 'true';

function qualityForCardWidth(width: number): number {
  if (width <= 320) return 68;
  if (width <= 480) return 72;
  return 75;
}

function buildUnsplashCardUrl(rawUrl: string, width: number, format: 'avif' | 'webp'): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('auto', 'format');
    parsed.searchParams.set('fit', 'crop');
    parsed.searchParams.set('w', String(width));
    parsed.searchParams.set(
      'q',
      String(format === 'avif' ? Math.max(58, qualityForCardWidth(width) - 6) : qualityForCardWidth(width)),
    );
    parsed.searchParams.set('fm', format);
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function buildPexelsCardUrl(rawUrl: string, width: number): string {
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

function buildSupabaseCardUrl(rawUrl: string, width: number): string {
  try {
    const parsed = new URL(rawUrl);
    const objectPrefix = '/storage/v1/object/public/';
    if (!parsed.pathname.includes(objectPrefix)) return rawUrl;
    parsed.pathname = parsed.pathname.replace(objectPrefix, '/storage/v1/render/image/public/');
    parsed.searchParams.set('width', String(width));
    parsed.searchParams.set('quality', String(qualityForCardWidth(width)));
    parsed.searchParams.set('resize', 'cover');
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function buildResponsiveCardSources(
  rawUrl?: string | null,
  customSizes?: string,
): ResponsiveCardSources {
  const sizes = customSizes || CARD_IMAGE_SIZES;

  if (!rawUrl || rawUrl.startsWith('/src/')) {
    return { src: '', sizes };
  }

  const lower = rawUrl.toLowerCase();

  if (lower.includes('images.unsplash.com') || lower.includes('plus.unsplash.com')) {
    const avifSrcSet = CARD_RESPONSIVE_WIDTHS.map(
      (w) => `${buildUnsplashCardUrl(rawUrl, w, 'avif')} ${w}w`,
    ).join(', ');
    const webpSrcSet = CARD_RESPONSIVE_WIDTHS.map(
      (w) => `${buildUnsplashCardUrl(rawUrl, w, 'webp')} ${w}w`,
    ).join(', ');

    return {
      src: buildUnsplashCardUrl(rawUrl, 480, 'webp'),
      avifSrcSet,
      webpSrcSet,
      sizes,
    };
  }

  if (lower.includes('images.pexels.com')) {
    const webpSrcSet = CARD_RESPONSIVE_WIDTHS.map(
      (w) => `${buildPexelsCardUrl(rawUrl, w)} ${w}w`,
    ).join(', ');

    return {
      src: buildPexelsCardUrl(rawUrl, 480),
      webpSrcSet,
      sizes,
    };
  }

  if (
    SUPABASE_TRANSFORM_ENABLED &&
    lower.includes('.supabase.co/storage/v1/object/public/')
  ) {
    const webpSrcSet = CARD_RESPONSIVE_WIDTHS.map(
      (w) => `${buildSupabaseCardUrl(rawUrl, w)} ${w}w`,
    ).join(', ');

    return {
      src: buildSupabaseCardUrl(rawUrl, 480),
      webpSrcSet,
      sizes,
    };
  }

  return { src: rawUrl, sizes };
}
