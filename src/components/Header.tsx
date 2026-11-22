import React, { useState } from 'react';
import { Heart, Menu, Search, Shield, ShoppingBag, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../hooks/useLanguage';
import { formatNumber } from '../lib/format';
import { cn } from '../lib/utils';
import { PWAInstallButton } from './PWAInstallButton';
import { SearchAutocomplete } from './SearchAutocomplete';
import { Drawer } from './ui/Drawer';

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const { lang, switchLanguage, localizedPath } = useLanguage();
  const { totalItems, openMiniCart } = useCart();
  const { count: wishlistCount } = useWishlist();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const navItems = [
    { label: t('nav.home'), to: localizedPath('/') },
    { label: t('nav.shop'), to: localizedPath('/shop') },
    { label: t('nav.trackOrder'), to: localizedPath('/track-order') },
    { label: t('nav.contact'), to: localizedPath('/contact') },
  ];

  const adminLabel = lang === 'bn' ? 'অ্যাডমিন' : 'Admin';

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#17263E]/10 bg-white/95 text-[#0F1A2C] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8">
          {/* Left Zone: Mobile menu button + Brand Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t('nav.menu')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#0F1A2C] hover:bg-[#F4F6F9] transition-colors lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              to={localizedPath('/')}
              className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#17263E] text-base font-bold text-white shadow-xs transition-colors group-hover:bg-[#F47125]">
                M
              </span>
              <span className="text-lg font-bold tracking-tight text-[#0F1A2C]">
                {t('brand.name')}
              </span>
            </Link>
          </div>

          {/* Center-Left Zone: Desktop Clean Text Navigation Links */}
          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#5B6577]"
          >
            {navItems.map((item, index) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={index === 0}
                className={({ isActive }) =>
                  cn(
                    'relative py-2 whitespace-nowrap shrink-0 transition-colors',
                    isActive
                      ? 'text-[#0F1A2C] font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#F47125]'
                      : 'hover:text-[#0F1A2C]',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Center-Right Zone: Desktop Search Bar */}
          <div className="hidden md:block flex-1 max-w-xs lg:max-w-sm">
            <SearchAutocomplete />
          </div>

          {/* Right Zone: Storefront Actions + Admin Login at the Far-Right Corner */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen((prev) => !prev)}
              aria-label={t('nav.searchButton')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#5B6577] hover:bg-[#F4F6F9] hover:text-[#0F1A2C] transition-colors md:hidden cursor-pointer"
            >
              {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            {/* Wishlist */}
            <Link
              to={localizedPath('/shop')}
              title={t('nav.wishlist')}
              aria-label={t('nav.wishlist')}
              className="relative hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#5B6577] hover:bg-[#F4F6F9] hover:text-[#0F1A2C] transition-colors"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute right-1 top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F47125] px-1 text-[10px] font-bold text-white tabular-nums">
                  {formatNumber(wishlistCount, lang)}
                </span>
              )}
            </Link>

            {/* Cart Trigger */}
            <button
              type="button"
              onClick={openMiniCart}
              aria-label={t('nav.cart')}
              className="relative inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#F4F6F9] px-3 text-sm font-medium text-[#0F1A2C] hover:bg-[#E9EEF5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="h-4.5 w-4.5 text-[#17263E]" />
              <span className="hidden xl:inline text-xs font-semibold">{t('nav.cart')}</span>
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F47125] px-1.5 text-[11px] font-bold text-white tabular-nums">
                {formatNumber(totalItems, lang)}
              </span>
            </button>

            {/* Language Switcher (BN | EN) */}
            <div
              role="group"
              aria-label={t('lang.switchLabel')}
              className="inline-flex items-center rounded-xl border border-[#17263E]/10 bg-[#F4F6F9] p-0.5"
            >
              <button
                type="button"
                onClick={() => switchLanguage('bn')}
                className={cn(
                  'min-h-[34px] rounded-[9px] px-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                  lang === 'bn'
                    ? 'bg-white text-[#0F1A2C] shadow-xs'
                    : 'text-[#5B6577] hover:text-[#0F1A2C]',
                )}
              >
                BN
              </button>
              <button
                type="button"
                onClick={() => switchLanguage('en')}
                className={cn(
                  'min-h-[34px] rounded-[9px] px-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                  lang === 'en'
                    ? 'bg-white text-[#0F1A2C] shadow-xs'
                    : 'text-[#5B6577] hover:text-[#0F1A2C]',
                )}
              >
                EN
              </button>
            </div>

            {/* PWA Install Button (only renders when prompt available) */}
            <div className="hidden xl:block">
              <PWAInstallButton />
            </div>

            {/* FAR RIGHT CORNER: Admin Panel Login */}
            <div className="ml-0.5 border-l border-[#17263E]/10 pl-2 sm:pl-2.5">
              <Link
                to="/admin/login"
                title={lang === 'bn' ? 'অ্যাডমিন প্যানেল লগইন' : 'Admin Panel Login'}
                aria-label="Admin Panel Login"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#17263E]/15 bg-[#17263E] px-2.5 sm:px-3.5 text-xs font-semibold text-white hover:bg-[#F47125] hover:border-[#F47125] transition-colors whitespace-nowrap shrink-0"
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{adminLabel}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Expandable Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="border-t border-[#17263E]/10 bg-white px-4 py-3 md:hidden">
            <SearchAutocomplete isMobile onSearchSubmit={() => setMobileSearchOpen(false)} />
          </div>
        )}
      </header>

      {/* Mobile Navigation Drawer */}
      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        position="left"
        title={t('brand.name')}
      >
        <div className="mb-5">
          <SearchAutocomplete isMobile onSearchSubmit={() => setMobileMenuOpen(false)} />
        </div>

        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={index === 0}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center rounded-xl px-4 text-base font-medium transition-colors',
                  isActive
                    ? 'bg-[#F47125]/10 text-[#D95F18] font-semibold'
                    : 'text-[#0F1A2C] hover:bg-[#F5F7FA]',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to={localizedPath('/about')}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex min-h-[44px] items-center rounded-xl px-4 text-base font-medium transition-colors',
                isActive
                  ? 'bg-[#F47125]/10 text-[#D95F18] font-semibold'
                  : 'text-[#0F1A2C] hover:bg-[#F5F7FA]',
              )
            }
          >
            {t('nav.about')}
          </NavLink>
          <NavLink
            to="/admin/login"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-3 flex min-h-[44px] items-center gap-2.5 rounded-xl bg-[#17263E] px-4 text-sm font-semibold text-white hover:bg-[#F47125] transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span>{lang === 'bn' ? 'অ্যাডমিন প্যানেল লগইন' : 'Admin Panel Login'}</span>
          </NavLink>
        </nav>

        <div className="mt-6 border-t border-[#17263E]/10 pt-5">
          <p className="mb-2.5 text-xs font-semibold text-[#5B6577]">{t('lang.switchLabel')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                switchLanguage('bn');
                setMobileMenuOpen(false);
              }}
              className={cn(
                'min-h-[44px] rounded-xl border text-sm font-semibold transition-colors cursor-pointer',
                lang === 'bn'
                  ? 'border-[#F47125] bg-[#F47125] text-white'
                  : 'border-[#17263E]/15 bg-white text-[#0F1A2C]',
              )}
            >
              বাংলা (BN)
            </button>
            <button
              type="button"
              onClick={() => {
                switchLanguage('en');
                setMobileMenuOpen(false);
              }}
              className={cn(
                'min-h-[44px] rounded-xl border text-sm font-semibold transition-colors cursor-pointer',
                lang === 'en'
                  ? 'border-[#F47125] bg-[#F47125] text-white'
                  : 'border-[#17263E]/15 bg-white text-[#0F1A2C]',
              )}
            >
              English (EN)
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
};
