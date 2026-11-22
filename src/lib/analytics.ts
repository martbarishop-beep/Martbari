import type { StoreSettings } from '../types';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

let fbInitialized = false;
let gaInitialized = false;

export function initAnalytics(settings: StoreSettings | null | undefined): void {
  if (typeof window === 'undefined' || !settings) return;

  // Initialize Facebook Pixel if provided and not yet initialized
  const pixelId = settings.facebook_pixel_id?.trim();
  if (pixelId && !fbInitialized) {
    fbInitialized = true;
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);

      window.fbq =
        window.fbq ||
        function (...args: unknown[]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((window as any)._fbqQueue = (window as any)._fbqQueue || []).push(args);
        };

      window.fbq('init', pixelId);
      window.fbq('track', 'PageView');
    } catch {
      // Ignore injection error
    }
  }

  // Initialize Google Analytics if provided and not yet initialized
  const gaId = settings.google_analytics_id?.trim();
  if (gaId && !gaInitialized) {
    gaInitialized = true;
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function (...args: unknown[]) {
        window.dataLayer?.push(args);
      };

      window.gtag('js', new Date());
      window.gtag('config', gaId);
    } catch {
      // Ignore injection error
    }
  }
}

export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}): void {
  if (typeof window === 'undefined') return;

  if (window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_ids: [item.id],
      content_name: item.name,
      content_type: 'product',
      value: item.price * (item.quantity ?? 1),
      currency: 'BDT',
    });
  }

  if (window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: 'BDT',
      value: item.price * (item.quantity ?? 1),
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity ?? 1,
        },
      ],
    });
  }
}

export function trackBeginCheckout(value: number, numItems: number): void {
  if (typeof window === 'undefined') return;

  if (window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      value,
      currency: 'BDT',
      num_items: numItems,
    });
  }

  if (window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: 'BDT',
      value,
    });
  }
}

export function trackPurchase(orderNumber: string, value: number): void {
  if (typeof window === 'undefined') return;

  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      value,
      currency: 'BDT',
      content_type: 'product',
      order_id: orderNumber,
    });
  }

  if (window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: orderNumber,
      value,
      currency: 'BDT',
    });
  }
}
