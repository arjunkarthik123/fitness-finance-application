import type { TextStyle } from 'react-native';

// Placeholder design tokens. Replace with values from the Figma mockups.
// Screens and components should only use these, never raw colours or sizes.
export const colors = {
  background: '#FFFFFF',
  surface: '#F2F4F7',
  border: '#D0D5DD',
  text: '#101828',
  textMuted: '#667085',
  primary: '#1570EF',
  /** Text and icons drawn on top of `primary`. */
  onPrimary: '#FFFFFF',
  todo: '#B54708',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  md: 8,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 16, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;
