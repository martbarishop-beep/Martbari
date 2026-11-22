import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  aspectClassName?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className,
  aspectClassName = 'aspect-[4/3]',
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#F5F7FA] to-[#E9EEF5] p-4 text-center text-[#5B6577]',
          aspectClassName,
          className,
        )}
      >
        <Package className="h-8 w-8 text-[#17263E]/40" aria-hidden="true" />
        <span className="line-clamp-2 max-w-[16ch] text-xs font-medium text-[#5B6577]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-hidden bg-[#F5F7FA]', aspectClassName, className)}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setHasError(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
};
