import React from 'react';
import { Grid2X2, Home, PackageSearch, Phone, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { STORE_DEFAULTS } from '../config/constants';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { formatNumber, keepLatinDigits } from '../lib/format';
import { cn } from '../lib/utils';

export const MobileContactButtons: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath } = useLanguage();
  const { totalItems, openMiniCart } = useCart();
  const { settings } = useSettings();
  const { pathname } = useLocation();

  const rawPhone = keepLatinDigits(settings.phone || STORE_DEFAULTS.phone).replace(/[^+\d]/g, '');

  const homePath = localizedPath('/');
  const shopPath = localizedPath('/shop');
  const trackPath = localizedPath('/track-order');

  const isHomeActive = pathname === homePath || pathname === '/' || pathname === `/${lang}`;
  const isCategoriesActive = pathname.includes('/shop') || pathname.includes('/category');
  const isTrackActive = pathname.includes('/track-order');

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/12 bg-gradient-to-r from-[#0F1A2C] via-[#17263E] to-[#0F1A2C] pb-[env(safe-area-inset-bottom,0px)] text-slate-200 shadow-[0_-6px_24px_-6px_rgba(15,26,44,0.45)] md:hidden"
    >
      <div className="grid h-[62px] grid-cols-5 items-stretch">
        <Link
          to={homePath}
          className={cn(
            'relative flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold transition-colors',
            isHomeActive
              ? 'bg-white/[0.06] text-[#F47125]'
              : 'text-slate-300 hover:text-white active:bg-white/[0.04]',
          )}
        >
          {isHomeActive && (
            <span
              aria-hidden="true"
              className="absolute top-0 inset-x-3 h-[2.5px] rounded-b-full bg-[#F47125]"
            />
          )}
          <Home className="h-[19px] w-[19px]" aria-hidden="true" />
          <span className="truncate max-w-full leading-tight">{t('mobile.home')}</span>
        </Link>

        <Link
          to={shopPath}
          className={cn(
            'relative flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold transition-colors',
            isCategoriesActive
              ? 'bg-white/[0.06] text-[#F47125]'
              : 'text-slate-300 hover:text-white active:bg-white/[0.04]',
          )}
        >
          {isCategoriesActive && (
            <span
              aria-hidden="true"
              className="absolute top-0 inset-x-3 h-[2.5px] rounded-b-full bg-[#F47125]"
            />
          )}
          <Grid2X2 className="h-[19px] w-[19px]" aria-hidden="true" />
          <span className="truncate max-w-full leading-tight">{t('mobile.categories')}</span>
        </Link>

        <button
          type="button"
          onClick={openMiniCart}
          aria-label={t('mobile.cart')}
          className="relative flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold text-slate-200 hover:text-white active:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <span className="relative inline-flex">
            <ShoppingBag className="h-[19px] w-[19px]" aria-hidden="true" />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F47125] px-1 text-[10px] font-bold text-white ring-2 ring-[#17263E] tabular-nums">
                {formatNumber(totalItems, lang)}
              </span>
            )}
          </span>
          <span className="truncate max-w-full leading-tight">{t('mobile.cart')}</span>
        </button>

        <Link
          to={trackPath}
          className={cn(
            'relative flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold transition-colors',
            isTrackActive
              ? 'bg-white/[0.06] text-[#F47125]'
              : 'text-slate-300 hover:text-white active:bg-white/[0.04]',
          )}
        >
          {isTrackActive && (
            <span
              aria-hidden="true"
              className="absolute top-0 inset-x-3 h-[2.5px] rounded-b-full bg-[#F47125]"
            />
          )}
          <PackageSearch className="h-[19px] w-[19px]" aria-hidden="true" />
          <span className="truncate max-w-full leading-tight">{t('mobile.track')}</span>
        </Link>

        <a
          href={`tel:${rawPhone}`}
          className="flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold text-white hover:text-[#F47125] active:bg-white/[0.04] transition-colors"
        >
          <Phone className="h-[19px] w-[19px] text-[#F47125]" aria-hidden="true" />
          <span className="truncate max-w-full leading-tight">{t('mobile.call')}</span>
        </a>
      </div>
    </nav>
  );
};
