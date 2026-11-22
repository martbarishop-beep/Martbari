import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Heart,
  Menu,
  Search,
  Shield,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import { isDemoCategory } from '../config/demoCatalog';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { getCachedActiveCategories } from '../lib/categoryCache';
import { formatNumber } from '../lib/format';
import { cn } from '../lib/utils';
import type { Category } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { SearchAutocomplete } from './SearchAutocomplete';
import { Drawer } from './ui/Drawer';

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const { lang, switchLanguage, localizedPath, tField } = useLanguage();
  const { totalItems, openMiniCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { settings } = useSettings();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const categoriesMenuRef = useRef<HTMLDivElement>(null);
  const showDemoData = settings.show_demo_data !== false;

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let active = true;
    void getCachedActiveCategories(10).then((data) => {
      if (active && data.length > 0) {
        setCategories(data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!categoriesOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (categoriesMenuRef.current && !categoriesMenuRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCategoriesOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [categoriesOpen]);

  const visibleCategories = categories.filter(
    (c) => showDemoData || !isDemoCategory(c),
  );

  const navItems = [
    { label: t('nav.home'), to: localizedPath('/') },
    { label: t('nav.shop'), to: localizedPath('/shop') },
    { label: t('nav.trackOrder'), to: localizedPath('/track-order') },
    { label: t('nav.contact'), to: localizedPath('/contact') },
  ];

  const storeName =
    (lang === 'bn' ? settings.store_name_bn : settings.store_name_en) || t('brand.name');

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 transition-all duration-150 text-white border-b border-white/10',
          isScrolled
            ? 'bg-[#111D31]/96 backdrop-blur-xl shadow-[0_10px_30px_-12px_rgba(7,14,26,0.5)]'
            : 'bg-[#17263E]',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:gap-8 lg:px-10">
          {/* Zone 1: Brand Wordmark + Mobile Menu Trigger */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t('nav.menu')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/85 hover:bg-white/10 hover:text-white transition-colors duration-100 active:scale-95 lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              to={localizedPath('/')}
              className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#F47125] text-sm font-bold text-white shadow-xs transition-transform duration-100 group-hover:scale-105">
                {storeName.charAt(0).toUpperCase() || 'M'}
              </span>
              <span className="text-[18px] font-bold tracking-tight text-white">
                {storeName}
              </span>
            </Link>
          </div>

          {/* Zone 2: Clean Single-Line Nav Links + Categories Dropdown + Search */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-7 max-w-4xl">
            <nav
              aria-label="Primary"
              className="flex items-center gap-6 text-[13.5px] font-medium text-white/75"
            >
              {navItems.slice(0, 2).map((item, index) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={index === 0}
                  className={({ isActive }) =>
                    cn(
                      'relative py-2 whitespace-nowrap shrink-0 transition-colors duration-100',
                      isActive
                        ? 'text-white font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:bg-[#F47125]'
                        : 'hover:text-white',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {/* Interactive Categories Popover */}
              {visibleCategories.length > 0 && (
                <div ref={categoriesMenuRef} className="relative">
                  <button
                    type="button"
                    aria-expanded={categoriesOpen}
                    onClick={() => setCategoriesOpen((prev) => !prev)}
                    className={cn(
                      'inline-flex items-center gap-1 py-2 whitespace-nowrap shrink-0 transition-colors duration-100 cursor-pointer',
                      categoriesOpen ? 'text-white font-semibold' : 'hover:text-white',
                    )}
                  >
                    <span>{t('nav.categories')}</span>
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-100',
                        categoriesOpen ? 'rotate-180 text-[#F47125]' : 'opacity-70',
                      )}
                    />
                  </button>

                  {categoriesOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[#17263E]/12 bg-white p-2 text-[#0F1A2C] shadow-[0_20px_44px_-14px_rgba(15,26,44,0.28)]">
                      <div className="grid grid-cols-1 gap-0.5">
                        {visibleCategories.slice(0, 7).map((cat) => (
                          <Link
                            key={cat.id}
                            to={localizedPath(`/category/${cat.slug}`)}
                            onClick={() => setCategoriesOpen(false)}
                            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-[#0F1A2C] hover:bg-[#F6F8FB] hover:text-[#F47125] transition-colors duration-100"
                          >
                            <span className="truncate">{tField(cat, 'name')}</span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-35" />
                          </Link>
                        ))}
                      </div>
                      <div className="mt-1.5 border-t border-[#17263E]/8 pt-1.5">
                        <Link
                          to={localizedPath('/shop')}
                          onClick={() => setCategoriesOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[#F47125] hover:bg-[#FFF8F3] transition-colors duration-100"
                        >
                          <span>{t('nav.allCategories')}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {navItems.slice(2).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'relative py-2 whitespace-nowrap shrink-0 transition-colors duration-100',
                      isActive
                        ? 'text-white font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:bg-[#F47125]'
                        : 'hover:text-white',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex-1 max-w-xs xl:max-w-sm">
              <SearchAutocomplete surface="dark" />
            </div>
          </div>

          {/* Tablet Search */}
          <div className="hidden md:block lg:hidden flex-1 max-w-xs">
            <SearchAutocomplete surface="dark" />
          </div>

          {/* Zone 3: Utilities + Far-Right Corner Admin Login */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen((prev) => !prev)}
              aria-label={t('nav.searchButton')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white transition-colors duration-100 active:scale-95 md:hidden cursor-pointer"
            >
              {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            {/* Wishlist */}
            <Link
              to={localizedPath('/shop')}
              title={t('nav.wishlist')}
              aria-label={t('nav.wishlist')}
              className="relative hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white transition-colors duration-100 active:scale-95"
            >
              <Heart className="h-[18px] w-[18px]" />
              {wishlistCount > 0 && (
                <span className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F47125] px-1 text-[10px] font-bold text-white tabular-nums">
                  {formatNumber(wishlistCount, lang)}
                </span>
              )}
            </Link>

            {/* Cart Button */}
            <button
              type="button"
              onClick={openMiniCart}
              aria-label={t('nav.cart')}
              className="relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 text-xs font-semibold text-white hover:border-white/35 hover:bg-white/16 transition-all duration-100 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4 text-[#FF9D5C]" />
              <span className="hidden xl:inline">{t('nav.cart')}</span>
              <span
                className={cn(
                  'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums transition-colors duration-100',
                  totalItems > 0
                    ? 'bg-[#F47125] text-white'
                    : 'bg-white/15 text-white/90',
                )}
              >
                {formatNumber(totalItems, lang)}
              </span>
            </button>

            {/* Language Switcher (BN | EN) */}
            <div
              role="group"
              aria-label={t('lang.switchLabel')}
              className="hidden sm:inline-flex items-center text-xs font-semibold text-white/55 pl-1"
            >
              <button
                type="button"
                onClick={() => switchLanguage('bn')}
                className={cn(
                  'px-1.5 py-1 transition-colors duration-100 whitespace-nowrap shrink-0 cursor-pointer',
                  lang === 'bn' ? 'text-white' : 'text-white/50 hover:text-white/90',
                )}
              >
                বাংলা
              </button>
              <span className="text-white/25" aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => switchLanguage('en')}
                className={cn(
                  'px-1.5 py-1 transition-colors duration-100 whitespace-nowrap shrink-0 cursor-pointer',
                  lang === 'en' ? 'text-white' : 'text-white/50 hover:text-white/90',
                )}
              >
                EN
              </button>
            </div>

            {/* PWA Install Button (when available) */}
            <div className="hidden xl:block">
              <PWAInstallButton />
            </div>

            {/* Far-Right Corner: Admin Panel Login */}
            <div className="ml-0.5 border-l border-white/15 pl-2 sm:pl-2.5">
              <Link
                to="/admin/login"
                title={lang === 'bn' ? 'অ্যাডমিন প্যানেল লগইন' : 'Admin Panel Login'}
                aria-label="Admin Panel Login"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 sm:px-3.5 text-xs font-semibold text-white hover:border-[#F47125] hover:bg-[#F47125] transition-colors duration-100 active:scale-95 whitespace-nowrap shrink-0"
              >
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('nav.adminLogin')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Expandable Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="border-t border-white/10 bg-[#121E33] px-4 py-3 md:hidden">
            <SearchAutocomplete
              isMobile
              surface="dark"
              onSearchSubmit={() => setMobileSearchOpen(false)}
            />
          </div>
        )}
      </header>

      {/* Mobile Navigation Drawer */}
      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        position="left"
        title={storeName}
      >
        <div className="mb-5">
          <SearchAutocomplete
            isMobile
            surface="light"
            onSearchSubmit={() => setMobileMenuOpen(false)}
          />
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
                  'flex min-h-[44px] items-center justify-between rounded-xl px-3.5 text-sm font-medium transition-colors duration-100',
                  isActive
                    ? 'bg-[#FFF5EE] text-[#F47125] font-semibold'
                    : 'text-[#0F1A2C] hover:bg-[#F5F7FA]',
                )
              }
            >
              <span>{item.label}</span>
              <ChevronRight className="h-4 w-4 opacity-40" />
            </NavLink>
          ))}
          <NavLink
            to={localizedPath('/about')}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex min-h-[44px] items-center justify-between rounded-xl px-3.5 text-sm font-medium transition-colors duration-100',
                isActive
                  ? 'bg-[#FFF5EE] text-[#F47125] font-semibold'
                  : 'text-[#0F1A2C] hover:bg-[#F5F7FA]',
              )
            }
          >
            <span>{t('nav.about')}</span>
            <ChevronRight className="h-4 w-4 opacity-40" />
          </NavLink>
        </nav>

        {/* Live Categories inside Mobile Menu */}
        {visibleCategories.length > 0 && (
          <div className="mt-5 border-t border-[#17263E]/8 pt-4">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              {t('nav.quickCategories')}
            </p>
            <div className="grid grid-cols-1 gap-1">
              {visibleCategories.slice(0, 8).map((cat) => (
                <Link
                  key={cat.id}
                  to={localizedPath(`/category/${cat.slug}`)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[40px] items-center justify-between rounded-xl px-3.5 text-sm text-[#475569] hover:bg-[#F5F7FA] hover:text-[#0F1A2C] transition-colors duration-100"
                >
                  <span className="truncate">{tField(cat, 'name')}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Language Toggle & Admin Link */}
        <div className="mt-6 border-t border-[#17263E]/8 pt-5 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-[#5B6577]">{t('lang.switchLabel')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  switchLanguage('bn');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'min-h-[42px] rounded-xl border text-sm font-semibold transition-colors duration-100 active:scale-95 cursor-pointer',
                  lang === 'bn'
                    ? 'border-[#17263E] bg-[#17263E] text-white'
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
                  'min-h-[42px] rounded-xl border text-sm font-semibold transition-colors duration-100 active:scale-95 cursor-pointer',
                  lang === 'en'
                    ? 'border-[#17263E] bg-[#17263E] text-white'
                    : 'border-[#17263E]/15 bg-white text-[#0F1A2C]',
                )}
              >
                English (EN)
              </button>
            </div>
          </div>

          <NavLink
            to="/admin/login"
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#17263E]/15 bg-[#F8FAFC] px-4 text-sm font-semibold text-[#17263E] hover:bg-[#17263E] hover:text-white transition-colors duration-100"
          >
            <Shield className="h-4 w-4" />
            <span>{lang === 'bn' ? 'অ্যাডমিন প্যানেল লগইন' : 'Admin Panel Login'}</span>
          </NavLink>
        </div>
      </Drawer>
    </>
  );
};
