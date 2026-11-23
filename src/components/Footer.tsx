import React from 'react';
import { Facebook, Instagram, Mail, Phone, Truck, Youtube } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { STORE_DEFAULTS } from '../config/constants';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { keepLatinDigits } from '../lib/format';
import { sanitizeExternalUrl } from '../lib/utils';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath } = useLanguage();
  const { settings } = useSettings();

  const phone = keepLatinDigits(settings.phone || STORE_DEFAULTS.phone);
  const email = settings.email || STORE_DEFAULTS.email;
  const storeName =
    (lang === 'bn' ? settings.store_name_bn : settings.store_name_en) || t('brand.name');

  const logoUrl = settings.logo_url
    ? `${settings.logo_url}${settings.logo_url.includes('?') ? '&' : '?'}t=${encodeURIComponent(settings.updated_at || Date.now())}`
    : null;

  const socialLinks = [
    { name: 'Facebook', url: sanitizeExternalUrl(settings.facebook_url), icon: Facebook },
    { name: 'Instagram', url: sanitizeExternalUrl(settings.instagram_url), icon: Instagram },
    { name: 'YouTube', url: sanitizeExternalUrl(settings.youtube_url), icon: Youtube },
  ];
  const tiktokUrl = sanitizeExternalUrl(settings.tiktok_url);

  return (
    <footer className="border-t border-white/10 bg-[#111D31] text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-start">
          {/* Brand & COD Summary */}
          <div className="md:col-span-4 space-y-2.5">
            <Link to={localizedPath('/')} className="inline-flex items-center gap-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-8 w-auto max-w-[130px] object-contain rounded-lg bg-white/10 p-1"
                />
              ) : (
                <>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#F47125] text-xs font-bold text-white">
                    {storeName.charAt(0).toUpperCase() || 'M'}
                  </span>
                  <span className="text-base font-bold tracking-tight text-white">
                    {storeName}
                  </span>
                </>
              )}
            </Link>
            <p className="text-xs leading-relaxed text-white/65 max-w-xs line-clamp-2">
              {t('footer.aboutText')}
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#FFA366]">
              <Truck className="h-3.5 w-3.5 shrink-0 text-[#F47125]" />
              <span>{t('footer.codNote')}</span>
            </div>
          </div>

          {/* Slim Compact Links Row */}
          <div className="md:col-span-5 grid grid-cols-2 gap-4 text-xs">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                {t('footer.quickLinks')}
              </h3>
              <ul className="mt-2.5 space-y-1.5 text-white/75">
                <li>
                  <Link to={localizedPath('/')} className="hover:text-[#F47125] transition-colors duration-100">
                    {t('nav.home')}
                  </Link>
                </li>
                <li>
                  <Link to={localizedPath('/shop')} className="hover:text-[#F47125] transition-colors duration-100">
                    {t('nav.shop')}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localizedPath('/track-order')}
                    className="hover:text-[#F47125] transition-colors duration-100"
                  >
                    {t('nav.trackOrder')}
                  </Link>
                </li>
                <li>
                  <Link to={localizedPath('/contact')} className="hover:text-[#F47125] transition-colors duration-100">
                    {t('nav.contact')}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                {t('footer.policies')}
              </h3>
              <ul className="mt-2.5 space-y-1.5 text-white/75">
                <li>
                  <Link
                    to={localizedPath('/about')}
                    className="hover:text-[#F47125] transition-colors duration-100"
                  >
                    {t('nav.about')}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localizedPath('/return-policy')}
                    className="hover:text-[#F47125] transition-colors duration-100"
                  >
                    {t('footer.returnPolicy')}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localizedPath('/privacy-policy')}
                    className="hover:text-[#F47125] transition-colors duration-100"
                  >
                    {t('footer.privacyPolicy')}
                  </Link>
                </li>
                <li>
                  <Link to={localizedPath('/terms')} className="hover:text-[#F47125] transition-colors duration-100">
                    {t('footer.terms')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Slim Contact & Social */}
          <div className="md:col-span-3 space-y-2.5 text-xs">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              {t('footer.contactUs')}
            </h3>
            <div className="space-y-1.5 text-white/80">
              <a
                href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                className="flex items-center gap-2 hover:text-[#F47125] transition-colors duration-100"
              >
                <Phone className="h-3.5 w-3.5 shrink-0 text-[#F47125]" />
                <span className="tabular-nums">{phone}</span>
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 hover:text-[#F47125] transition-colors duration-100 break-all"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#F47125]" />
                <span>{email}</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {socialLinks.map(({ name, url, icon: Icon }) =>
                url ? (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 hover:border-[#F47125] hover:bg-[#F47125] hover:text-white transition-colors duration-100"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ) : null,
              )}
              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="inline-flex h-8 px-2.5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] font-semibold text-white/80 hover:border-[#F47125] hover:bg-[#F47125] hover:text-white transition-colors duration-100"
                >
                  TikTok
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Ultra-Slim Copyright Bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-4 text-[11px] text-white/55 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {storeName} — {t('footer.rights')}
          </p>
          <p>{t('brand.tagline')}</p>
        </div>
      </div>
    </footer>
  );
};
