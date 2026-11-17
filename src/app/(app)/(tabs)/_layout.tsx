import { Slot } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useState } from 'react';

import { DesktopShell } from '@/features/desktop/shell';
import { MobileHeader, MobileMenu } from '@/features/mobile-menu';
import { useColors, useIsDesktop } from '@/lib/theme';

// On the phone the sections live in a side menu (opened from the header) instead of a bottom bar.
export default function TabsLayout() {
  const c = useColors();
  const desktop = useIsDesktop();
  const [menuOpen, setMenuOpen] = useState(false);

  if (desktop) {
    return (
      <DesktopShell>
        <Slot />
      </DesktopShell>
    );
  }

  return (
    <>
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: true,
          header: ({ options }) => <MobileHeader title={options.title ?? ''} onMenu={() => setMenuOpen(true)} />,
          sceneStyle: { backgroundColor: c.bg },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Lançamentos' }} />
        <Tabs.Screen name="investments" options={{ title: 'Investimentos' }} />
        <Tabs.Screen name="dashboard" options={{ title: 'Painel' }} />
        <Tabs.Screen name="installments" options={{ title: 'Parcelamentos' }} />
        <Tabs.Screen name="recurring" options={{ title: 'Recorrentes' }} />
        <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
      </Tabs>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
