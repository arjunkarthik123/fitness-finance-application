import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Props = ViewProps & {
  /** Dashed outline, used for wireframe TODO boxes. */
  dashed?: boolean;
};

/** A grouped block of content on the surface colour. */
export function Card({ dashed = false, style, ...rest }: Props) {
  return <View {...rest} style={[styles.card, dashed && styles.dashed, style]} />;
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  dashed: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    gap: spacing.xs,
  },
});
