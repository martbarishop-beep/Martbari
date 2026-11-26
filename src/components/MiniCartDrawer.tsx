import React, { useEffect } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { ProductImage } from './ProductImage';
import { Button } from './ui/Button';
import { Drawer } from './ui/Drawer';

export const MiniCartDrawer: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath, formatPrice } = useLanguage();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    items,
    isMiniCartOpen,
    closeMiniCart,
    subtotal,
    totalItems,
    updateQuantity,
    removeItem,
    validateCartWithDb,
  } = useCart();

  // Run live database price & stock re-check whenever the mini cart opens
  useEffect(() => {
    if (isMiniCartOpen && items.length > 0) {
      void validateCartWithDb().then((res) => {
        if (res.changed) {
          const msg = lang === 'bn' ? res.messageBn : res.messageEn;
          if (msg) {
            showToast({
              type: 'warning',
              title: t('common.errorTitle'),
              description: msg,
            });
          }
        }
      });
    }
  }, [isMiniCartOpen, items.length, lang, showToast, t, validateCartWithDb]);

  const freeDeliveryThreshold = settings.free_delivery_above ?? 3000;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const neededForFree = Math.max(0, freeDeliveryThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  const handleCheckoutClick = () => {
    closeMiniCart();
    navigate(localizedPath('/checkout'));
  };

  const handleViewCartClick = () => {
    closeMiniCart();
    navigate(localizedPath('/cart'));
  };

  return (
    <Drawer
      isOpen={isMiniCartOpen}
      onClose={closeMiniCart}
      title={`${t('cart.drawerTitle')} (${totalItems})`}
      widthClass="max-w-md"
      footer={
        items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-base font-bold text-[#0F1A2C]">
              <span>{t('cart.subtotal')}</span>
              <span className="text-[#F47125] tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-[#5B6577]">
              {t('product.deliveryChargeNotice')}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" onClick={handleViewCartClick}>
                {t('cart.viewCartPage')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCheckoutClick}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {t('cart.proceedCheckout')}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-[12px] bg-[#F5F7FA] text-[#17263E]/40 mb-4">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h3 className="text-base font-semibold text-[#0F1A2C]">{t('cart.emptyTitle')}</h3>
          <p className="mt-1.5 max-w-xs text-xs text-[#5B6577]">{t('cart.emptyDesc')}</p>
          <Button
            className="mt-6"
            onClick={() => {
              closeMiniCart();
              navigate(localizedPath('/shop'));
            }}
          >
            {t('cart.browseProducts')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Free delivery progress bar */}
          <div className="rounded-[12px] border border-[#17263E]/10 bg-[#F5F7FA] p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={isFreeDelivery ? 'text-[#16A34A]' : 'text-[#0F1A2C]'}>
                {isFreeDelivery
                  ? t('cart.freeDeliveryQualified')
                  : t('cart.freeDeliveryProgress', { amount: formatPrice(neededForFree) })}
              </span>
              <span className="tabular-nums text-[#5B6577]">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E5E9F0]">
              <div
                className={`h-full transition-all duration-300 ${
                  isFreeDelivery ? 'bg-[#16A34A]' : 'bg-[#F47125]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart items list */}
          <div className="divide-y divide-[#17263E]/5">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId ?? 'default'}`}
                className="flex items-start gap-3 py-3.5"
              >
                <Link
                  to={localizedPath(`/product/${item.slug}`)}
                  onClick={closeMiniCart}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border border-[#17263E]/10 bg-[#F5F7FA]"
                >
                  <ProductImage
                    src={item.imageUrl}
                    alt={lang === 'bn' ? item.nameBn : item.nameEn}
                    aspectClassName="aspect-square"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    to={localizedPath(`/product/${item.slug}`)}
                    onClick={closeMiniCart}
                    className="block py-0.5 text-sm font-semibold leading-[1.5] text-[#0F1A2C] hover:text-[#F47125] line-clamp-1 transition-colors"
                  >
                    {lang === 'bn' ? item.nameBn : item.nameEn}
                  </Link>

                  {(item.variantNameBn || item.variantNameEn) && (
                    <p className="mt-0.5 text-xs text-[#5B6577]">
                      {lang === 'bn'
                        ? item.variantNameBn || item.variantNameEn
                        : item.variantNameEn || item.variantNameBn}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#F47125] tabular-nums">
                      {formatPrice(item.price)}
                    </span>

                    {/* Stepper */}
                    <div className="inline-flex items-center rounded-[8px] border border-[#17263E]/15 bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.variantId, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                        className="inline-flex h-8 w-8 items-center justify-center text-[#5B6577] hover:text-[#0F1A2C] cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[28px] text-center text-xs font-semibold text-[#0F1A2C] tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.variantId, item.quantity + 1)
                        }
                        aria-label="Increase quantity"
                        className="inline-flex h-8 w-8 items-center justify-center text-[#5B6577] hover:text-[#0F1A2C] cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.productId, item.variantId)}
                  aria-label={t('cart.removeItem')}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5B6577] hover:bg-[#DC2626]/10 hover:text-[#DC2626] transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
};
