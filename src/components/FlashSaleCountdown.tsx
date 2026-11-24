import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '../config/constants';
import { formatNumber } from '../lib/format';

interface FlashSaleCountdownProps {
  lang: SupportedLanguage;
}

export const FlashSaleCountdown: React.FC<FlashSaleCountdownProps> = React.memo(({ lang }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({
    hours: 14,
    minutes: 32,
    seconds: 45,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs text-white/75">
        <Clock className="h-4 w-4 text-[#F47125]" aria-hidden="true" />
        {t('product.saleEndsIn')}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-white/12 bg-white/8">
          <span className="text-sm font-bold tabular-nums">
            {formatNumber(timeLeft.hours, lang)}
          </span>
          <span className="text-[9px] uppercase text-white/65">
            {t('product.countdownHours')}
          </span>
        </div>
        <span className="font-bold text-white/50">:</span>
        <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-white/12 bg-white/8">
          <span className="text-sm font-bold tabular-nums">
            {formatNumber(timeLeft.minutes, lang)}
          </span>
          <span className="text-[9px] uppercase text-white/65">
            {t('product.countdownMinutes')}
          </span>
        </div>
        <span className="font-bold text-white/50">:</span>
        <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-[#F47125] text-white">
          <span className="text-sm font-bold tabular-nums">
            {formatNumber(timeLeft.seconds, lang)}
          </span>
          <span className="text-[9px] uppercase text-white/90">
            {t('product.countdownSeconds')}
          </span>
        </div>
      </div>
    </div>
  );
});

FlashSaleCountdown.displayName = 'FlashSaleCountdown';
