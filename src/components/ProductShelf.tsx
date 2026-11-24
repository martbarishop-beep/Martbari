import React from 'react';
import type { Brand } from '../types';
import { ProductCard } from './ProductCard';
import type { ProductReviewStats, StorefrontProduct } from './QuickViewModal';

export interface ProductShelfProps {
  products: StorefrontProduct[];
  brandsMap?: Map<string, Brand>;
  reviewsStatsMap?: Map<string, ProductReviewStats>;
  showFlashProgress?: boolean;
  tone?: 'light' | 'dark';
  viewAllTo?: string;
  viewAllLabel?: string;
  mobileInitialLimit?: number;
}

export const ProductShelf: React.FC<ProductShelfProps> = React.memo(
  ({ products, brandsMap, reviewsStatsMap }) => {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {products.map((product) => (
          <div key={product.id} className="min-w-0">
            <ProductCard
              product={product}
              brandsMap={brandsMap}
              reviewStats={reviewsStatsMap?.get(product.id) ?? null}
            />
          </div>
        ))}
      </div>
    );
  },
);

ProductShelf.displayName = 'ProductShelf';
