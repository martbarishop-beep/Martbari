export const theme = {
  colors: {
    navy: '#17263E',
    navyDark: '#0F1A2C',
    navyDeep: '#111D31',
    accent: '#F47125',
    accentHover: '#D95F18',
    accentSoftText: '#FF9D5C',
    pageBg: '#FAF8F5',
    background: '#FFFFFF',
    sectionBackground: '#FAF8F5',
    sectionOrangeTint: '#FFF4EC',
    sectionNavyTint: '#EEF3FA',
    text: '#0F1A2C',
    muted: '#5B6577',
    borderSubtle: 'rgba(23, 38, 62, 0.10)',
    borderAccentTint: 'rgba(244, 113, 37, 0.16)',
    borderNavyTint: 'rgba(23, 38, 62, 0.12)',
    trustBandBg: '#17263E',
    trustBandOrangeGlow: 'rgba(244, 113, 37, 0.14)',
    trustBadgeBg: '#F47125',
    trustTitle: '#FFFFFF',
    trustSubtitle: '#CBD5E1',
    trustDivider: 'rgba(255, 255, 255, 0.14)',
    success: '#16A34A',
    danger: '#DC2626',
  },
  layout: {
    maxWidth: '1280px',
    containerClass: 'mx-auto w-full max-w-[1280px] px-[16px] sm:px-[20px] md:px-[32px]',
    sectionPaddingClass: 'py-[40px] md:py-[72px]',
    compactPaddingClass: 'py-[32px] md:py-[48px]',
    homeSectionBoxClass:
      'rounded-[16px] md:rounded-[20px] border border-[#17263E]/10 px-3.5 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10',
  },
  spacing: {
    4: '4px',
    8: '8px',
    12: '12px',
    16: '16px',
    24: '24px',
    32: '32px',
    48: '48px',
    72: '72px',
  },
  radii: {
    card: '16px',
    cardLg: '16px',
    button: '12px',
    heroFrame: '24px',
    pill: '9999px',
  },
  shadows: {
    card: '0 4px 16px -6px rgba(15, 26, 44, 0.07), 0 1px 4px -1px rgba(15, 26, 44, 0.04)',
    cardHover: '0 14px 28px -10px rgba(15, 26, 44, 0.13), 0 4px 10px -4px rgba(15, 26, 44, 0.05)',
    heroFrame: '0 22px 48px -14px rgba(6, 12, 24, 0.65), 0 8px 20px -6px rgba(244, 113, 37, 0.18)',
    dock: '0 16px 36px -14px rgba(7, 14, 26, 0.42)',
  },
  buttons: {
    primary:
      'inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#F47125] text-white font-semibold hover:bg-[#D95F18] active:scale-[0.98] transition-colors duration-150 cursor-pointer whitespace-nowrap',
    secondary:
      'inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#17263E] bg-white text-[#17263E] font-semibold hover:bg-[#17263E] hover:text-white active:scale-[0.98] transition-colors duration-150 cursor-pointer whitespace-nowrap',
  },
  cards: {
    base: 'rounded-[16px] border border-[#17263E]/10 bg-white p-[16px]',
  },
  fonts: {
    banglaFirst:
      '"Noto Sans Bengali Variable", "Noto Sans Bengali", "Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif',
    englishFirst:
      '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Noto Sans Bengali Variable", "Noto Sans Bengali", system-ui, sans-serif',
    bn: '"Noto Sans Bengali Variable", "Noto Sans Bengali", "Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif',
    en: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Noto Sans Bengali Variable", "Noto Sans Bengali", system-ui, sans-serif',
  },
  typography: {
    display: {
      desktop: { fontSize: '2.75rem', lineHeight: '1.2', fontWeight: 700 },
      mobile: { fontSize: '1.75rem', lineHeight: '1.28', fontWeight: 700 },
    },
    h1: {
      desktop: { fontSize: '2.5rem', lineHeight: '1.22', fontWeight: 700 },
      mobile: { fontSize: '1.625rem', lineHeight: '1.28', fontWeight: 700 },
    },
    h2: {
      desktop: { fontSize: '1.75rem', lineHeight: '1.32', fontWeight: 700 },
      mobile: { fontSize: '1.375rem', lineHeight: '1.36', fontWeight: 700 },
    },
    h3: {
      desktop: { fontSize: '1.125rem', lineHeight: '1.4', fontWeight: 700 },
      mobile: { fontSize: '1rem', lineHeight: '1.4', fontWeight: 700 },
    },
    body: {
      desktop: { fontSize: '1rem', lineHeight: '1.6', fontWeight: 400 },
      mobile: { fontSize: '0.9375rem', lineHeight: '1.6', fontWeight: 400 },
    },
    small: {
      desktop: { fontSize: '0.8125rem', lineHeight: '1.5', fontWeight: 400 },
      mobile: { fontSize: '0.8125rem', lineHeight: '1.5', fontWeight: 400 },
    },
    price: {
      desktop: { fontSize: '1.25rem', lineHeight: '1.2', fontWeight: 700 },
      mobile: { fontSize: '1.0625rem', lineHeight: '1.2', fontWeight: 700 },
    },
    button: {
      desktop: { fontSize: '0.9375rem', lineHeight: '1.35', fontWeight: 600 },
      mobile: { fontSize: '0.875rem', lineHeight: '1.35', fontWeight: 600 },
    },
  },
} as const;

export type AppTheme = typeof theme;
