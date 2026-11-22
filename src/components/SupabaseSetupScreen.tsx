import React from 'react';
import { Database, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SupabaseSetupScreen: React.FC = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F7FA] px-4 py-12 text-[#0F1A2C]">
      <div className="w-full max-w-xl rounded-[12px] border border-[#17263E]/10 bg-white p-6 sm:p-8 shadow-card">
        <div className="flex items-center justify-between gap-4 border-b border-[#17263E]/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#F47125] text-lg font-bold text-white">
              M
            </span>
            <div>
              <h1 className="text-lg font-bold text-[#0F1A2C]">{t('brand.name')}</h1>
              <p className="text-xs text-[#5B6577]">{t('brand.tagline')}</p>
            </div>
          </div>

          <div className="inline-flex rounded-[12px] border border-[#17263E]/15 bg-[#F5F7FA] p-0.5">
            <button
              type="button"
              onClick={() => void i18n.changeLanguage('bn')}
              className={`min-h-[38px] rounded-[10px] px-3 text-xs font-semibold cursor-pointer ${
                i18n.language === 'bn' ? 'bg-[#F47125] text-white' : 'text-[#5B6577]'
              }`}
            >
              BN
            </button>
            <button
              type="button"
              onClick={() => void i18n.changeLanguage('en')}
              className={`min-h-[38px] rounded-[10px] px-3 text-xs font-semibold cursor-pointer ${
                i18n.language === 'en' ? 'bg-[#F47125] text-white' : 'text-[#5B6577]'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3.5">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#17263E]/10 text-[#17263E]">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F1A2C]">{t('setup.title')}</h2>
            <p className="mt-1 text-sm text-[#5B6577]">{t('setup.subtitle')}</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-[#0F1A2C]">{t('setup.instructions')}</p>

        <div className="mt-3 rounded-[12px] bg-[#17263E] p-4 font-mono text-xs text-white/95 space-y-2">
          <div>VITE_SUPABASE_URL=https://your-project-ref.supabase.co</div>
          <div>VITE_SUPABASE_ANON_KEY=your-public-anon-key</div>
        </div>

        <ul className="mt-4 space-y-1.5 text-xs text-[#5B6577]">
          <li>• {t('setup.varUrl')}</li>
          <li>• {t('setup.varKey')}</li>
          <li>• {t('setup.sqlNote')}</li>
        </ul>

        <div className="mt-5 flex items-start gap-2.5 rounded-[12px] border border-[#DC2626]/20 bg-[#DC2626]/5 p-3.5 text-xs text-[#DC2626]">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="font-medium">{t('setup.securityNote')}</span>
        </div>
      </div>
    </div>
  );
};
