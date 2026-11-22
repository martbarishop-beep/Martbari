export * from './database';

export interface CartItem {
  productId: string;
  variantId?: string | null;
  slug: string;
  nameBn: string;
  nameEn: string;
  variantNameBn?: string | null;
  variantNameEn?: string | null;
  price: number;
  imageUrl: string | null;
  quantity: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
