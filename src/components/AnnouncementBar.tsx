import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';

export const AnnouncementBar: React.FC = () => {
  const { t } = useTranslation();
  const { tField } = useLanguage();
  const { settings } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  const text = tField(settings, 'announcement') || t('announcement.default');

  if (dismissed || !text) return null;

  return (
    <div className="bg-gradient-to-r from-[#D95F18] via-[#F47125] to-[#E5641B] text-white">
      <div className="mx-auto flex h-8 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10 text-[11px] sm:text-xs">
        <span className="w-6 shrink-0 hidden sm:block" aria-hidden="true" />
        <p className="flex-1 text-center font-semibold tracking-wide text-white truncate">
          {text}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t('common.close')}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-black/15 hover:text-white transition-colors duration-100 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
