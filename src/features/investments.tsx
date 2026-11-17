import { Pressable, StyleSheet, View } from 'react-native';

import { Button, EmptyState, ErrorNote, MonthSwitcher, Screen, Skeleton, Stat, Txt } from '@/components/ui';
import { useAppData, useRemote } from '@/lib/data';
import { formatDayHeader, formatMoney, formatShortDate } from '@/lib/format';
import { radius, space, useColors, useIsDesktop } from '@/lib/theme';
import type { Investment, InvestmentsMonth, Lookups } from '@/shared/types';

import { DesktopPage } from './desktop/shell';
import { useEntryActions } from './navigation';

function byDay(items: Investment[]): [string, Investment[]][] {
  const groups = new Map<string, Investment[]>();
  for (const item of items) groups.set(item.investedOn, [...(groups.get(item.investedOn) ?? []), item]);
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

function Content() {
  const c = useColors();
  const { lookups, month } = useAppData();
  const actions = useEntryActions();
  const { data, error } = useRemote<InvestmentsMonth>(`/investments?month=${month}`);
  const memberName = (l: Lookups, id: string | null) => (id ? (l.members.find((m) => m.id === id)?.name ?? '') : '') || 'Casa';

  return (
    <>
      <View style={styles.stats}>
        <Stat label="Investido no mês" cents={data?.monthCents ?? 0} icon="trending-up-outline" />
        <Stat label="Total investido" cents={data?.totalCents ?? 0} icon="wallet-outline" />
      </View>
      <ErrorNote>{error}</ErrorNote>
      {!data || !lookups ? (
        <Skeleton height={140} r={18} />
      ) : data.investments.length === 0 ? (
        <EmptyState icon="trending-up" title="Nenhum investimento neste mês" text='Toque em "Novo investimento" para lançar.' />
      ) : (
        byDay(data.investments).map(([day, items]) => (
          <View key={day} style={{ gap: space.sm }}>
            <Txt size={13} weight={700} color={c.text2} style={{ paddingHorizontal: 4 }}>
              {formatDayHeader(day)}
            </Txt>
            <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }]}>
              {items.map((i, index) => (
                <Pressable
                  key={i.id}
                  onPress={() => actions.editInvestment(i.id)}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && { borderTopWidth: 1, borderTopColor: c.line },
                    pressed && { backgroundColor: c.surface2 },
                  ]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt size={15} weight={700} numberOfLines={1}>
                      {i.description}
                    </Txt>
                    <Txt size={13} color={c.text3}>
                      {[formatShortDate(i.investedOn), memberName(lookups, i.memberId)].join(' · ')}
                    </Txt>
                  </View>
                  <Txt size={16} weight={700} numeric>
                    {formatMoney(i.amountCents)}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}
    </>
  );
}

export function InvestmentsPage() {
  const desktop = useIsDesktop();
  const { month, shiftMonth } = useAppData();
  const actions = useEntryActions();

  if (desktop) {
    return (
      <DesktopPage title="Investimentos">
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button title="Novo investimento" icon="add" variant="secondary" onPress={() => actions.newInvestment()} />
        </View>
        <Content />
      </DesktopPage>
    );
  }
  return (
    <Screen>
      <MonthSwitcher month={month} onShift={shiftMonth} />
      <Button title="Novo investimento" icon="add" onPress={() => actions.newInvestment()} full />
      <Content />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  group: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, paddingVertical: 12, paddingHorizontal: 14 },
});
