import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from '@/theme';

type Variant = keyof typeof typography;
type Tone = 'default' | 'muted' | 'primary' | 'onPrimary' | 'todo';

type Props = TextProps & {
  variant?: Variant;
  tone?: Tone;
};

const toneColors: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  primary: colors.primary,
  onPrimary: colors.onPrimary,
  todo: colors.todo,
};

/** Text using the theme's type scale. Headings get the header role automatically. */
export function AppText({ variant = 'body', tone = 'default', style, ...rest }: Props) {
  const isHeader = variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={isHeader ? 'header' : undefined}
      {...rest}
      style={[styles[variant], { color: toneColors[tone] }, style]}
    />
  );
}

const styles = StyleSheet.create(typography);
