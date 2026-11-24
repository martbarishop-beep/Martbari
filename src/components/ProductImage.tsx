import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BatteryCharging,
  Headphones,
  Lightbulb,
  Package,
  Smartphone,
  Watch,
  Zap,
} from 'lucide-react';
import { buildResponsiveCardSources } from '../lib/imageUrls';
import { cn } from '../lib/utils';

interface ProductImageProps {
  src?: string | null;
  hoverSrc?: string | null;
  alt: string;
  className?: string;
  aspectClassName?: string;
  width?: number;
  height?: number;
  sizes?: string;
  eager?: boolean;
  categoryKey?: string | null;
}

function getCategoryFallbackIcon(categoryKey?: string | null) {
  const key = (categoryKey || '').toLowerCase();
  if (key.includes('watch')) return Watch;
  if (key.includes('headphone') || key.includes('audio')) return Headphones;
  if (key.includes('earbud') || key.includes('buds')) return Headphones;
  if (key.includes('light') || key.includes('lamp')) return Lightbulb;
  if (key.includes('appliance') || key.includes('home') || key.includes('kettle')) return Zap;
  if (key.includes('power') || key.includes('charger')) return BatteryCharging;
  if (key.includes('mobile') || key.includes('accessor')) return Smartphone;
  return Package;
}

export const ProductImage: React.FC<ProductImageProps> = React.memo(
  ({
    src,
    hoverSrc,
    alt,
    className,
    aspectClassName = 'aspect-square',
    width = 480,
    height = 480,
    sizes,
    eager = false,
    categoryKey,
  }) => {
    const [hasError, setHasError] = useState(false);
    const [hoverError, setHoverError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const primaryImgRef = useRef<HTMLImageElement>(null);

    const primarySources = useMemo(
      () => buildResponsiveCardSources(src, sizes),
      [src, sizes],
    );
    const hoverSources = useMemo(
      () => buildResponsiveCardSources(hoverSrc, sizes),
      [hoverSrc, sizes],
    );

    useEffect(() => {
      setHasError(false);
      setHoverError(false);
      setIsLoaded(false);
    }, [src, hoverSrc]);

    useEffect(() => {
      if (
        primaryImgRef.current &&
        primaryImgRef.current.complete &&
        primaryImgRef.current.naturalWidth > 0
      ) {
        setIsLoaded(true);
      }
    }, [primarySources.src]);

    const FallbackIcon = getCategoryFallbackIcon(categoryKey);

    if (!primarySources.src || hasError) {
      return (
        <div
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-[#F1F5F9] via-[#F8FAFC] to-[#E8EEF6] p-4 text-center text-[#5B6577]',
            aspectClassName,
            className,
          )}
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-xs text-[#17263E]/55">
            <FallbackIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="line-clamp-2 max-w-[16ch] text-xs font-medium text-[#5B6577]">
            {alt}
          </span>
        </div>
      );
    }

    const showHoverImage = Boolean(
      hoverSources.src && hoverSources.src !== primarySources.src && !hoverError,
    );

    return (
      <div
        className={cn(
          'relative w-full overflow-hidden bg-[#F3F5F8]',
          aspectClassName,
          className,
        )}
      >
        {!isLoaded && (
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#EEF2F6] via-[#F8FAFC] to-[#E6ECF4]"
          />
        )}

        <picture className="block h-full w-full">
          {primarySources.avifSrcSet && (
            <source
              type="image/avif"
              srcSet={primarySources.avifSrcSet}
              sizes={primarySources.sizes}
            />
          )}
          {primarySources.webpSrcSet && (
            <source
              type="image/webp"
              srcSet={primarySources.webpSrcSet}
              sizes={primarySources.sizes}
            />
          )}
          <img
            ref={primaryImgRef}
            src={primarySources.src}
            alt={alt}
            width={width}
            height={height}
            referrerPolicy="no-referrer"
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : undefined}
            decoding={eager ? 'sync' : 'async'}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-150',
              isLoaded ? 'opacity-100' : 'opacity-0',
              showHoverImage && 'md:group-hover:opacity-0',
            )}
          />
        </picture>

        {showHoverImage && (
          <picture className="pointer-events-none absolute inset-0 hidden h-full w-full md:block">
            {hoverSources.avifSrcSet && (
              <source
                type="image/avif"
                srcSet={hoverSources.avifSrcSet}
                sizes={hoverSources.sizes}
              />
            )}
            {hoverSources.webpSrcSet && (
              <source
                type="image/webp"
                srcSet={hoverSources.webpSrcSet}
                sizes={hoverSources.sizes}
              />
            )}
            <img
              src={hoverSources.src}
              alt=""
              aria-hidden="true"
              width={width}
              height={height}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onError={() => setHoverError(true)}
              className="h-full w-full object-cover opacity-0 transition-opacity duration-150 md:group-hover:opacity-100"
            />
          </picture>
        )}
      </div>
    );
  },
);

ProductImage.displayName = 'ProductImage';
