import React from 'react';
import { useTranslation } from 'react-i18next';

interface BrandLogoTextProps {
  /** Text color class for the first part ("Mart" / "মার্ট"). Defaults to white for dark headers/footers. */
  firstClassName?: string;
  /** Text color class for the second part ("Bari" / "বাড়ি"). Defaults to CSS variable --brand-orange (#E8590C). */
  secondClassName?: string;
}

export const BrandLogoText: React.FC<BrandLogoTextProps> = ({
  firstClassName = 'text-white',
  secondClassName = 'text-[var(--brand-orange)]',
}) => {
  const { t } = useTranslation();

  return (
    <>
      <span className={firstClassName}>{t('brand.nameFirst')}</span>
      <span className={secondClassName}>{t('brand.nameSecond')}</span>
    </>
  );
};
