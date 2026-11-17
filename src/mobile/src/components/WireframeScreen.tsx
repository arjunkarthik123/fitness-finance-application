import { Link, type Href } from 'expo-router';

import { AppText, Button, Card, Screen } from '@/components/ui';

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
    <Screen testID="wireframe-screen">
      <AppText variant="title">{title}</AppText>
      <AppText tone="muted">{purpose}</AppText>

      {todos.length > 0 && (
        <Card dashed>
          <AppText variant="label" tone="todo">
            TODO
          </AppText>
          {todos.map((todo) => (
            <AppText key={todo}>• {todo}</AppText>
          ))}
        </Card>
      )}

      {links.map((link) => (
        <Link key={link.label} href={link.href} replace={link.replace} asChild>
          <Button label={link.label} />
        </Link>
      ))}
    </Screen>
  );
}
