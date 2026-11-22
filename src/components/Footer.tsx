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
  const { localizedPath } = useLanguage();
  const { settings } = useSettings();

  const phone = keepLatinDigits(settings.phone || STORE_DEFAULTS.phone);
  const email = settings.email || STORE_DEFAULTS.email;

  const socialLinks = [
    { name: 'Facebook', url: sanitizeExternalUrl(settings.facebook_url), icon: Facebook },
    { name: 'Instagram', url: sanitizeExternalUrl(settings.instagram_url), icon: Instagram },
    { name: 'YouTube', url: sanitizeExternalUrl(settings.youtube_url), icon: Youtube },
  ];
  const tiktokUrl = sanitizeExternalUrl(settings.tiktok_url);

  return (
    <footer className="bg-[#17263E] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand & About */}
          <div>
            <Link to={localizedPath('/')} className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F47125] text-lg font-bold text-white">
                M
              </span>
              <span className="text-xl font-bold tracking-tight text-white">
                {t('brand.name')}
              </span>
            </Link>
            <p className="mt-2 text-xs font-medium text-[#F47125]">{t('brand.tagline')}</p>
            <p className="mt-4 text-sm leading-relaxed text-white/75">{t('footer.aboutText')}</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-[12px] border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-white/90">
              <Truck className="h-4 w-4 shrink-0 text-[#F47125]" />
              <span>{t('footer.codNote')}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white">{t('footer.quickLinks')}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              <li>
                <Link to={localizedPath('/')} className="hover:text-[#F47125] transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to={localizedPath('/shop')} className="hover:text-[#F47125] transition-colors">
                  {t('nav.shop')}
                </Link>
              </li>
              <li>
                <Link
                  to={localizedPath('/track-order')}
                  className="hover:text-[#F47125] transition-colors"
                >
                  {t('nav.trackOrder')}
                </Link>
              </li>
              <li>
                <Link to={localizedPath('/about')} className="hover:text-[#F47125] transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link
                  to={localizedPath('/contact')}
                  className="hover:text-[#F47125] transition-colors"
                >
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-sm font-semibold text-white">{t('footer.policies')}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              <li>
                <Link
                  to={localizedPath('/return-policy')}
                  className="hover:text-[#F47125] transition-colors"
                >
                  {t('footer.returnPolicy')}
                </Link>
              </li>
              <li>
                <Link
                  to={localizedPath('/privacy-policy')}
                  className="hover:text-[#F47125] transition-colors"
                >
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link to={localizedPath('/terms')} className="hover:text-[#F47125] transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 className="text-sm font-semibold text-white">{t('footer.contactUs')}</h3>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              <a
                href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                className="flex items-center gap-2.5 hover:text-[#F47125] transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0 text-[#F47125]" />
                <span className="tabular-nums">{phone}</span>
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2.5 hover:text-[#F47125] transition-colors break-all"
              >
                <Mail className="h-4 w-4 shrink-0 text-[#F47125]" />
                <span>{email}</span>
              </a>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {socialLinks.map(({ name, url, icon: Icon }) =>
                url ? (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/15 bg-white/5 text-white/85 hover:border-[#F47125] hover:bg-[#F47125] hover:text-white transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ) : null,
              )}
              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="inline-flex h-11 px-3 items-center justify-center rounded-[12px] border border-white/15 bg-white/5 text-xs font-semibold text-white/85 hover:border-[#F47125] hover:bg-[#F47125] hover:text-white transition-colors"
                >
                  TikTok
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/65 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t('brand.name')} — {t('footer.rights')}
          </p>
          <p>{t('brand.tagline')}</p>
        </div>
      </div>
    </footer>
  );
};
