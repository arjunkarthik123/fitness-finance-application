import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

export type WireframeLink = {
  label: string;
  href: Href;
  /** Replace the current screen instead of pushing, e.g. when logging in or out. */
  replace?: boolean;
};

type Props = {
  title: string;
  /** What this screen is for, taken from the flowcharts in assets/images. */
  purpose: string;
  todos?: string[];
  links?: WireframeLink[];
};

/**
 * Low-fidelity placeholder used while screens are being designed in Figma.
 * Swap each usage for the real screen as it gets built.
 */
export function WireframeScreen({ title, purpose, todos = [], links = [] }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container} testID="wireframe-screen">
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.purpose}>{purpose}</Text>

      {todos.length > 0 && (
        <View style={styles.box}>
          <Text style={styles.boxHeading}>TODO</Text>
          {todos.map((todo) => (
            <Text key={todo} style={styles.todo}>
              • {todo}
            </Text>
          ))}
        </View>
      )}

      {links.map((link) => (
        <Link key={link.label} href={link.href} replace={link.replace} asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>{link.label}</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  purpose: {
    fontSize: 16,
    color: colors.textMuted,
  },
  box: {
    padding: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  boxHeading: {
    fontWeight: '700',
    color: colors.todo,
  },
  todo: {
    color: colors.text,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
