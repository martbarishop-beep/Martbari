import React from 'react';
import { ChevronRight, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { cn } from '../lib/utils';
import type { Category } from '../types';
import { SearchAutocomplete } from './SearchAutocomplete';
import { Drawer } from './ui/Drawer';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  navItems: Array<{ label: string; to: string }>;
  visibleCategories: Category[];
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  storeName,
  navItems,
  visibleCategories,
}) => {
  const { t } = useTranslation();
  const { lang, switchLanguage, localizedPath, tField } = useLanguage();

  return (
    <Drawer isOpen={isOpen} onClose={onClose} position="left" title={storeName}>
      <div className="mb-5">
        <SearchAutocomplete isMobile surface="light" onSearchSubmit={onClose} />
      </div>

      <nav aria-label="Mobile" className="flex flex-col gap-1">
        {navItems.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={index === 0}
            onClick={onClose}
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
          onClick={onClose}
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
                onClick={onClose}
                className="flex min-h-[40px] items-center justify-between rounded-xl px-3.5 text-sm text-[#475569] hover:bg-[#F5F7FA] hover:text-[#0F1A2C] transition-colors duration-100"
              >
                <span className="truncate">{tField(cat, 'name')}</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-40" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-[#17263E]/8 pt-5 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-[#5B6577]">{t('lang.switchLabel')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                switchLanguage('bn');
                onClose();
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
                onClose();
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
          onClick={onClose}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#17263E]/15 bg-[#F8FAFC] px-4 text-sm font-semibold text-[#17263E] hover:bg-[#17263E] hover:text-white transition-colors duration-100"
        >
          <Shield className="h-4 w-4" />
          <span>{lang === 'bn' ? 'অ্যাডমিন প্যানেল লগইন' : 'Admin Panel Login'}</span>
        </NavLink>
      </div>
    </Drawer>
  );
};
