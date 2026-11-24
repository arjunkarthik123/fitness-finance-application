/**
 * The FLX balance shown in every screen's header. Screens that move FLX (sync,
 * goal bonus, buy, sell, dev tools) call `useBalance().refresh()` afterwards;
 * the balance also reloads on every navigation in case one is missed.
 */
import { usePathname } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui';
import { getBalance } from '@/ledger';
import { spacing } from '@/theme';

type BalanceContext = { balance: number | null; refresh: () => Promise<void> };

const Context = createContext<BalanceContext>({ balance: null, refresh: async () => {} });

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      setBalance(await getBalance());
    } catch {
      // Keep the last known balance; the screen that failed shows the error.
    }
  }, []);

  // Reload on every navigation, in case a screen that moved FLX didn't refresh.
  useEffect(() => {
    let cancelled = false;
    getBalance().then(
      (next) => !cancelled && setBalance(next),
      () => {}, // Keep the last known balance.
    );
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return <Context.Provider value={{ balance, refresh }}>{children}</Context.Provider>;
}

export function useBalance(): BalanceContext {
  return useContext(Context);
}

/** Header badge: the current balance in FLX. */
export function BalanceBadge() {
  const { balance } = useBalance();
  return (
    <AppText variant="label" style={styles.badge} testID="header-balance">
      {balance === null ? '…' : formatFlx(balance)}
    </AppText>
  );
}

/** "1,234.56 FLX": the one format for FLX amounts across the app. */
export function formatFlx(amount: number): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FLX`;
}

const styles = StyleSheet.create({
  badge: { marginHorizontal: spacing.md },
});
