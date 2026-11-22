import React from 'react';
import { Hammer, Mail, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { STORE_DEFAULTS } from '../config/constants';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { keepLatinDigits } from '../lib/format';

export const MaintenanceScreen: React.FC = () => {
  const { t } = useTranslation();
  const { lang, switchLanguage } = useLanguage();
  const { settings } = useSettings();

  const phone = keepLatinDigits(settings.phone || STORE_DEFAULTS.phone);
  const email = settings.email || STORE_DEFAULTS.email;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#17263E] p-4 text-white">
      <div className="w-full max-w-md rounded-[12px] border border-white/15 bg-white/5 p-8 text-center shadow-card backdrop-blur-sm">
        {/* Language switcher */}
        <div className="mb-6 flex justify-end">
          <div className="inline-flex rounded-[8px] border border-white/20 bg-white/10 p-0.5">
            <button
              type="button"
              onClick={() => switchLanguage('bn')}
              className={`rounded px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                lang === 'bn' ? 'bg-[#F47125] text-white' : 'text-white/70'
              }`}
            >
              BN
            </button>
            <button
              type="button"
              onClick={() => switchLanguage('en')}
              className={`rounded px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                lang === 'en' ? 'bg-[#F47125] text-white' : 'text-white/70'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[12px] bg-[#F47125] text-white shadow-card">
          <Hammer className="h-8 w-8" />
        </div>

        <h1 className="text-xl font-bold sm:text-2xl">{t('maintenance.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/80">{t('maintenance.desc')}</p>

        <div className="mt-8 border-t border-white/15 pt-5 text-xs text-white/70 space-y-2">
          <p className="flex items-center justify-center gap-2">
            <Phone className="h-3.5 w-3.5 text-[#F47125]" />
            <span className="tabular-nums">{phone}</span>
          </p>
          <p className="flex items-center justify-center gap-2">
            <Mail className="h-3.5 w-3.5 text-[#F47125]" />
            <span>{email}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
