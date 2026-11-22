import React from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { STORE_DEFAULTS } from '../config/constants';
import { useSettings } from '../hooks/useSettings';
import { keepLatinDigits } from '../lib/format';

export const MobileContactButtons: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const rawPhone = keepLatinDigits(settings.phone || STORE_DEFAULTS.phone).replace(/[^+\d]/g, '');
  const whatsappNumber = keepLatinDigits(settings.whatsapp || STORE_DEFAULTS.whatsapp).replace(
    /[^\d]/g,
    '',
  );

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2.5 md:hidden">
      <a
        href={`tel:${rawPhone}`}
        aria-label={t('mobile.call')}
        className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#17263E] text-white shadow-card border border-white/15 active:scale-95 transition-transform"
      >
        <Phone className="h-5 w-5" />
      </a>
      <a
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('mobile.whatsapp')}
        className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#16A34A] text-white shadow-card active:scale-95 transition-transform"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
    </div>
  );
};
