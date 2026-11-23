export const theme = {
  colors: {
    navy: '#17263E',
    accent: '#F47125',
    accentHover: '#D95F18',
    background: '#FFFFFF',
    sectionBackground: '#F5F7FA',
    sectionOrangeTint: '#FFF4EC',
    sectionNavyTint: '#EEF3FA',
    text: '#0F1A2C',
    muted: '#5B6577',
    success: '#16A34A',
    danger: '#DC2626',
  },
  radii: {
    card: '12px',
  },
  fonts: {
    banglaFirst: '"Noto Sans Bengali Variable", "Noto Sans Bengali", "Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif',
    englishFirst: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Noto Sans Bengali Variable", "Noto Sans Bengali", system-ui, sans-serif',
    bn: '"Noto Sans Bengali Variable", "Noto Sans Bengali", "Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif',
    en: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Noto Sans Bengali Variable", "Noto Sans Bengali", system-ui, sans-serif',
  },
  typography: {
    display: {
      desktop: { fontSize: '3rem', lineHeight: '1.25', fontWeight: 700 },
      mobile: { fontSize: '2.125rem', lineHeight: '1.3', fontWeight: 700 },
    },
    h1: {
      desktop: { fontSize: '2.25rem', lineHeight: '1.3', fontWeight: 700 },
      mobile: { fontSize: '1.75rem', lineHeight: '1.35', fontWeight: 700 },
    },
    h2: {
      desktop: { fontSize: '1.75rem', lineHeight: '1.35', fontWeight: 700 },
      mobile: { fontSize: '1.375rem', lineHeight: '1.4', fontWeight: 700 },
    },
    h3: {
      desktop: { fontSize: '1.25rem', lineHeight: '1.4', fontWeight: 700 },
      mobile: { fontSize: '1.125rem', lineHeight: '1.4', fontWeight: 700 },
    },
    body: {
      desktop: { fontSize: '1rem', lineHeight: '1.7', fontWeight: 400 },
      mobile: { fontSize: '1rem', lineHeight: '1.7', fontWeight: 400 }, // Minimum body 16px on mobile
    },
    small: {
      desktop: { fontSize: '0.8125rem', lineHeight: '1.5', fontWeight: 400 }, // at least 13px
      mobile: { fontSize: '0.8125rem', lineHeight: '1.5', fontWeight: 400 },
    },
    price: {
      desktop: { fontSize: '1.25rem', lineHeight: '1.2', fontWeight: 700 },
      mobile: { fontSize: '1.125rem', lineHeight: '1.2', fontWeight: 700 },
    },
    button: {
      desktop: { fontSize: '0.9375rem', lineHeight: '1.4', fontWeight: 600 },
      mobile: { fontSize: '0.9375rem', lineHeight: '1.4', fontWeight: 600 },
    },
  },
} as const;

export type AppTheme = typeof theme;
