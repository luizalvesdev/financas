import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, IconButton, Txt } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useAppData } from '@/lib/data';
import { space, useColors } from '@/lib/theme';

import { NAV } from './desktop/shell';

export function MobileHeader({ title, onMenu }: { title: string; onMenu: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.bg, borderBottomColor: c.line }]}>
      <IconButton icon="menu" label="Abrir menu" onPress={onMenu} size={44} />
      <Txt size={18} weight={800} style={{ flex: 1 }}>
        {title}
      </Txt>
    </View>
  );
}

const WIDTH = 288;

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { lookups } = useAppData();
  const me = lookups?.me;
  const [progress] = useState(() => new Animated.Value(0));
  // Stays mounted until the closing animation ends.
  const [settledClosed, setSettledClosed] = useState(true);
  const visible = open || !settledClosed;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 220 : 160,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSettledClosed(!open);
    });
  }, [open, progress]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay, opacity: progress }]}>
          <Pressable accessibilityLabel="Fechar menu" onPress={onClose} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View
          style={[
            styles.panel,
            {
              width: WIDTH,
              backgroundColor: c.surface,
              borderRightColor: c.line,
              paddingTop: insets.top + space.lg,
              paddingBottom: insets.bottom + space.lg,
              transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-WIDTH, 0] }) }],
            },
          ]}>
          <Txt size={19} weight={800} style={{ paddingHorizontal: space.sm }}>
            Finanças
          </Txt>
          <View style={{ gap: 4, marginTop: space.lg }}>
            {NAV.map((item) => {
              const active = pathname === item.path;
              return (
                <Pressable
                  key={item.path}
                  accessibilityRole="link"
                  accessibilityLabel={item.label}
                  onPress={() => {
                    onClose();
                    router.navigate(item.href);
                  }}
                  style={[styles.item, { backgroundColor: active ? c.primaryBg : 'transparent' }]}>
                  <Ionicons name={item.icon} size={22} color={active ? c.primaryText : c.text2} />
                  <Txt size={16} weight={active ? 700 : 600} color={active ? c.primaryText : c.text2}>
                    {item.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flex: 1 }} />
          <View style={[styles.user, { borderTopColor: c.line }]}>
            {me && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Avatar name={me.name} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={14} weight={700}>
                    {me.name}
                  </Txt>
                  <Txt size={12} color={c.text3} numberOfLines={1}>
                    {me.email}
                  </Txt>
                </View>
              </View>
            )}
            <Button title="Sair" variant="outline" size="sm" icon="log-out-outline" onPress={signOut} full />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingBottom: space.sm, borderBottomWidth: 1 },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRightWidth: 1, paddingHorizontal: space.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 50, paddingHorizontal: space.md, borderRadius: 12 },
  user: { borderTopWidth: 1, paddingTop: space.md, gap: space.md },
});
