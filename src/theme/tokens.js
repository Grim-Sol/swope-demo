// src/theme/tokens.js
export const palette = {
  light: {
    bg: '#FAFAFA',
    card: '#FFFFFF',
    text: '#111111',
    textMuted: '#555555',
    border: '#E5E5E5',
    ctaBg: '#111111',
    ctaText: '#FFFFFF',
    glassTint: 'light',
    pastelRose: '#F6D5D5',
    pastelGreen: '#D5F6E1',
  },
  dark: {
    bg: '#111111',
    card: '#1C1C1C',
    text: '#FFFFFF',
    textMuted: '#BBBBBB',
    border: '#2B2B2B',
    ctaBg: '#FFFFFF',
    ctaText: '#111111',
    glassTint: 'dark',
    pastelRose: '#F6D5D5',
    pastelGreen: '#D5F6E1',
  },
};

export const type = {
  title: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  meta:  { fontSize: 14, lineHeight: 18 },
  price: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
  body:  { fontSize: 16, lineHeight: 22 },
  button:{ fontSize: 16, fontWeight: '700' },
};

export const radius = { card: 16, button: 12, overlay: 12 };
export const touch = { min: 44, hitSlop: { top:8, bottom:8, left:8, right:8 } };
