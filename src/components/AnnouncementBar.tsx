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
    <div className="bg-[#0F1A2C] text-white border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 text-xs sm:text-sm">
        <span className="w-6 shrink-0 hidden sm:block" aria-hidden="true" />
        <p className="flex-1 text-center font-medium leading-snug text-white/95 truncate">
          {text}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t('common.close')}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
