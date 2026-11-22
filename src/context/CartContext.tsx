import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORE_DEFAULTS } from '../config/constants';
import { trackAddToCart } from '../lib/analytics';
import { supabase } from '../lib/supabase';
import type { CartItem, PublicProduct, PublicProductVariant } from '../types';

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  isMiniCartOpen: boolean;
  openMiniCart: () => void;
  closeMiniCart: () => void;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number, openDrawer?: boolean) => void;
  updateQuantity: (productId: string, variantId: string | null | undefined, quantity: number) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  clearCart: () => void;
  validateCartWithDb: () => Promise<{ changed: boolean; messageEn?: string; messageBn?: string }>;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORE_DEFAULTS.storageKeyCart);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(loadStoredCart);
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_DEFAULTS.storageKeyCart, JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, [items]);

  const openMiniCart = useCallback(() => setIsMiniCartOpen(true), []);
  const closeMiniCart = useCallback(() => setIsMiniCartOpen(false), []);

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'>, quantity = 1, openDrawer = true) => {
      const safeQty = Math.max(1, Math.floor(quantity));
      setItems((prev) => {
        const idx = prev.findIndex(
          (existing) =>
            existing.productId === item.productId &&
            (existing.variantId ?? null) === (item.variantId ?? null),
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + safeQty };
          return next;
        }
        return [...prev, { ...item, variantId: item.variantId ?? null, quantity: safeQty }];
      });

      trackAddToCart({
        id: item.productId,
        name: item.nameEn || item.nameBn,
        price: item.price,
        quantity: safeQty,
      });

      if (openDrawer) {
        setIsMiniCartOpen(true);
      }
    },
    [],
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string | null | undefined, quantity: number) => {
      setItems((prev) => {
        if (quantity <= 0) {
          return prev.filter(
            (i) => !(i.productId === productId && (i.variantId ?? null) === (variantId ?? null)),
          );
        }
        return prev.map((i) =>
          i.productId === productId && (i.variantId ?? null) === (variantId ?? null)
            ? { ...i, quantity: Math.floor(quantity) }
            : i,
        );
      });
    },
    [],
  );

  const removeItem = useCallback((productId: string, variantId?: string | null) => {
    setItems((prev) =>
      prev.filter(
        (i) => !(i.productId === productId && (i.variantId ?? null) === (variantId ?? null)),
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const validateCartWithDb = useCallback(async () => {
    if (!supabase || items.length === 0) {
      return { changed: false };
    }

    try {
      const productIds = Array.from(new Set(items.map((i) => i.productId)));
      const { data: dbProducts } = await supabase
        .from('public_products')
        .select('*')
        .in('id', productIds);

      if (!dbProducts || dbProducts.length === 0) return { changed: false };

      const productMap = new Map<string, PublicProduct>(
        (dbProducts as PublicProduct[]).map((p) => [p.id, p]),
      );

      // Fetch variants if any
      const variantIds = items.map((i) => i.variantId).filter(Boolean) as string[];
      const variantMap = new Map<string, PublicProductVariant>();
      if (variantIds.length > 0) {
        const { data: dbVariants } = await supabase
          .from('public_product_variants')
          .select('*')
          .in('id', variantIds);

        if (dbVariants) {
          (dbVariants as PublicProductVariant[]).forEach((v) => variantMap.set(v.id, v));
        }
      }

      let priceOrStockChanged = false;
      const nextItems: CartItem[] = [];

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product || !product.is_active) {
          priceOrStockChanged = true;
          continue; // Item no longer available
        }

        let currentPrice = product.sale_price !== null && product.sale_price < product.price
          ? product.sale_price
          : product.price;

        let maxStock = product.track_stock ? product.stock : 999;

        if (item.variantId) {
          const variant = variantMap.get(item.variantId);
          if (!variant || !variant.is_active) {
            priceOrStockChanged = true;
            continue;
          }
          if (variant.price_override !== null) {
            currentPrice = variant.price_override;
          }
          if (product.track_stock) {
            maxStock = variant.stock;
          }
        }

        if (maxStock <= 0) {
          priceOrStockChanged = true;
          continue; // Out of stock
        }

        const safeQty = Math.min(item.quantity, maxStock);
        if (safeQty !== item.quantity || currentPrice !== item.price) {
          priceOrStockChanged = true;
        }

        nextItems.push({
          ...item,
          price: Number(currentPrice),
          quantity: safeQty,
        });
      }

      if (priceOrStockChanged) {
        setItems(nextItems);
        return {
          changed: true,
          messageEn: 'Some item prices or stock availability updated according to latest inventory.',
          messageBn: 'সর্বশেষ স্টক বা মূল্যের ভিত্তিতে কার্টের কিছু তথ্যে পরিবর্তন এসেছে।',
        };
      }

      return { changed: false };
    } catch {
      return { changed: false };
    }
  }, [items]);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems,
      subtotal,
      isMiniCartOpen,
      openMiniCart,
      closeMiniCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      validateCartWithDb,
    }),
    [
      items,
      totalItems,
      subtotal,
      isMiniCartOpen,
      openMiniCart,
      closeMiniCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      validateCartWithDb,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return ctx;
}
