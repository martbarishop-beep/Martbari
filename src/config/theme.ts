export const theme = {
  colors: {
    navy: '#17263E',
    accent: '#F47125',
    accentHover: '#D95F18',
    background: '#FFFFFF',
    sectionBackground: '#F5F7FA',
    text: '#0F1A2C',
    muted: '#5B6577',
    success: '#16A34A',
    danger: '#DC2626',
  },
  radii: {
    card: '12px',
  },
  fonts: {
    bn: '"Hind Siliguri", sans-serif',
    en: '"Poppins", sans-serif',
  },
} as const;

export type AppTheme = typeof theme;
