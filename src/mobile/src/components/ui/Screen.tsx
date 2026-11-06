import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';

import { colors, spacing } from '@/theme';

/** Scrollable page wrapper with the app background, padding and vertical spacing. */
export function Screen({ contentContainerStyle, ...rest }: ScrollViewProps) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
