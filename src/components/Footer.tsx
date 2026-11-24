import React from 'react';
import { Facebook, Instagram, Mail, Phone, Shield, Truck, Youtube } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { STORE_DEFAULTS } from '../config/constants';
import { theme } from '../config/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { keepLatinDigits } from '../lib/format';
import { cn, sanitizeExternalUrl } from '../lib/utils';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath } = useLanguage();
  const { settings } = useSettings();

  const phone = keepLatinDigits(settings.phone || STORE_DEFAULTS.phone);
  const email = settings.email || STORE_DEFAULTS.email;
  const storeName =
    (lang === 'bn' ? settings.store_name_bn : settings.store_name_en) || t('brand.name');

  const socialLinks = [
    { name: 'Facebook', url: sanitizeExternalUrl(settings.facebook_url), icon: Facebook },
    { name: 'Instagram', url: sanitizeExternalUrl(settings.instagram_url), icon: Instagram },
    { name: 'YouTube', url: sanitizeExternalUrl(settings.youtube_url), icon: Youtube },
  ];
  const tiktokUrl = sanitizeExternalUrl(settings.tiktok_url);

  return (
    <footer className="relative overflow-x-clip border-t border-white/10 bg-gradient-to-b from-[#17263E] to-[#111D31] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none h-[2px] w-full bg-gradient-to-r from-transparent via-[#F47125]/75 to-transparent"
      />

      {/* Main Compact Footer Columns */}
      <div className={theme.layout.containerClass}>
        <div className="py-6 sm:py-7 md:py-8">
          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-12 md:gap-6 lg:gap-8 md:items-start">
            {/* Brand & COD Summary */}
            <div className="md:col-span-4 lg:col-span-5">
              <Link
                to={localizedPath('/')}
                className="inline-flex items-center gap-2.5 overflow-visible whitespace-nowrap group"
              >
                <img
                  src="/logo-icon.png"
                  alt=""
                  aria-hidden="true"
                  width={34}
                  height={34}
                  loading="lazy"
                  decoding="async"
                  className="h-8 w-8 shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)] transition-transform duration-150 group-hover:scale-105"
                />
                <span
                  data-lang={lang}
                  className={cn(
                    'inline-block overflow-visible text-[17px] sm:text-lg font-bold tracking-tight text-white',
                    lang === 'bn' ? 'leading-[1.45] py-0.5' : 'leading-[1.25]',
                  )}
                >
                  {storeName}
                </span>
              </Link>

              <p className="mt-2.5 max-w-sm text-[12.5px] leading-[1.6] text-white/75">
                {t('footer.aboutText')}
              </p>

              <div className="mt-3 inline-flex items-center gap-2 text-[12px] font-medium text-[#FF9D5C]">
                <Truck className="h-3.5 w-3.5 shrink-0 text-[#F47125]" aria-hidden="true" />
                <span className="leading-snug">{t('footer.codNote')}</span>
              </div>
            </div>

            {/* Aligned Navigation Columns */}
            <div className="md:col-span-4 lg:col-span-4 grid grid-cols-2 gap-5 sm:gap-6">
              <nav aria-label={t('footer.quickLinks')} className="min-w-0">
                <h3 className="text-[12.5px] font-bold tracking-wide text-white">
                  {t('footer.quickLinks')}
                </h3>
                <div aria-hidden="true" className="mt-1.5 h-[2px] w-5 rounded-full bg-[#F47125]" />
                <ul className="mt-2.5 space-y-1.5 text-[12.5px]">
                  <li>
                    <Link
                      to={localizedPath('/')}
                      className="inline-flex items-center py-0.5 text-white/75 hover:text-[#FF9D5C] transition-colors duration-150"
                    >
                      {t('nav.home')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={localizedPath('/shop')}
                      className="inline-flex items-center py-0.5 text-white/75 hover:text-[#FF9D5C] transition-colors duration-150"
                    >
                      {t('nav.shop')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={localizedPath('/track-order')}
                      className="inline-flex items-center py-0.5 text-white/75 hover:text-[#FF9D5C] transition-colors duration-150"
                    >
                      {t('nav.trackOrder')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={localizedPath('/contact')}
                      className="inline-flex items-center py-0.5 text-white/75 hover:text-[#FF9D5C] transition-colors duration-150"
                    >
                      {t('nav.contact')}
                    </Link>
                  </li>
                </ul>
              </nav>

              <nav aria-label={t('footer.policies')} className="min-w-0">
                <h3 className="text-[12.5px] font-bold tracking-wide text-white">
                  {t('footer.policies')}
                </h3>
                <div aria-hidden="true" className="mt-1.5 h-[2px] w-5 rounded-full bg-[#F47125]" />
                <ul className="mt-2.5 space-y-1.5 text-[12.5px]">
                  <li>
                    <Link
                      to={localizedPath('/about')}
                      className="inline-flex items-center py-0.5 text-white/75 hover:text-[#FF9D5C] transition-colors duration-150"
                    >
                      {t('nav.about')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={localizedPath('/return-policy')}
                      className="inline-flex items-center py-0.5 text-white/75 hover:text-[#FF9D5C] transition-colors duration-150"
                    >
                      {t('footer.returnPolicy')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={localizedPath('/privacy-policy')}
                      className="inline-flex items-center py-0.5 text-white/75 hover:text-[#FF9D5C] transition-colors duration-150"
                    >
                      {t('footer.privacyPolicy')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={localizedPath('/terms')}
                      className="inline-flex items-center py-0.5 text-white/75 hover:text-[#FF9D5C] transition-colors duration-150"
                    >
                      {t('footer.terms')}
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Contact & Social */}
            <div className="md:col-span-4 lg:col-span-3 min-w-0">
              <h3 className="text-[12.5px] font-bold tracking-wide text-white">
                {t('footer.contactUs')}
              </h3>
              <div aria-hidden="true" className="mt-1.5 h-[2px] w-5 rounded-full bg-[#F47125]" />

              <div className="mt-2.5 space-y-2 text-[12.5px]">
                <a
                  href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                  className="group flex items-center gap-2 text-white/80 hover:text-[#FF9D5C] transition-colors duration-150"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-[#F47125] group-hover:border-[#F47125]/50 transition-colors">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="tabular-nums">{phone}</span>
                </a>
                <a
                  href={`mailto:${email}`}
                  className="group flex items-center gap-2 text-white/80 hover:text-[#FF9D5C] transition-colors duration-150"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-[#F47125] group-hover:border-[#F47125]/50 transition-colors">
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="break-all">{email}</span>
                </a>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {socialLinks.map(({ name, url, icon: Icon }) =>
                  url ? (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/12 bg-white/[0.06] text-white/80 hover:border-[#F47125] hover:bg-[#F47125] hover:text-white transition-colors duration-150"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : null,
                )}
                {tiktokUrl && (
                  <a
                    href={tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="inline-flex h-8 items-center justify-center rounded-[10px] border border-white/12 bg-white/[0.06] px-2.5 text-[11px] font-semibold text-white/80 hover:border-[#F47125] hover:bg-[#F47125] hover:text-white transition-colors duration-150"
                  >
                    TikTok
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slim Bottom Bar (aligned above mobile bottom navigation bar) */}
      <div className="border-t border-white/10 bg-[#0F1A2C]/65 pb-[60px] md:pb-0">
        <div className={theme.layout.containerClass}>
          <div className="flex flex-col items-center justify-between gap-2 py-2.5 text-center text-[11.5px] text-white/70 sm:flex-row sm:py-3 sm:text-left">
            <p className="leading-snug">
              © {new Date().getFullYear()} {storeName} — {t('footer.rights')}
            </p>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="leading-snug text-white/65">{t('brand.tagline')}</span>
              <span aria-hidden="true" className="h-3 w-px bg-white/15" />
              <Link
                to="/admin/login"
                rel="nofollow"
                aria-label="Admin Login"
                title={t('nav.adminLogin')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-white/12 bg-white/[0.05] text-white/60 hover:border-[#F47125] hover:bg-[#F47125] hover:text-white transition-colors duration-150"
              >
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
