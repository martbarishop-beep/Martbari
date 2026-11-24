import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  className?: string;
  minHeightClassName?: string;
}

export const LazySection: React.FC<LazySectionProps> = ({
  children,
  fallback = null,
  rootMargin = '280px 0px',
  className,
  minHeightClassName = 'min-h-[320px]',
}) => {
  const [hasEntered, setHasEntered] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (hasEntered || typeof IntersectionObserver === 'undefined') return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasEntered, rootMargin]);

  return (
    <div
      ref={containerRef}
      className={cn('below-fold-section', !hasEntered && minHeightClassName, className)}
    >
      {hasEntered ? children : fallback}
    </div>
  );
};
