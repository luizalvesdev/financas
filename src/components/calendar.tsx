import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { formatDate, formatMonth, parseDate } from '@/lib/format';
import { radius, space, useColors, useIsDesktop } from '@/lib/theme';
import { addMonths, daysInMonth, monthOf, today } from '@/shared/dates';

import { Button, Chips, Field, Txt } from './ui';

function shiftDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Typed DD/MM/AAAA input, quick chips and a calendar opened from the icon.
export function DateField({
  label,
  value,
  onChange,
  hint,
  quick = true,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  hint?: string;
  quick?: boolean;
}) {
  const c = useColors();
  const [text, setText] = useState(formatDate(value));
  const [open, setOpen] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (parseDate(text) !== value) setText(formatDate(value));
  }
  const set = (iso: string) => {
    setText(formatDate(iso));
    onChange(iso);
  };
  const now = today();
  const options = [
    { value: now, label: 'Hoje' },
    { value: shiftDays(now, -1), label: 'Ontem' },
  ];
  return (
    <View style={{ gap: space.sm }}>
      <View>
        <Txt size={13} weight={600} color={c.text2} style={{ marginBottom: 6 }}>
          {label}
        </Txt>
        <View>
          <Field
            value={text}
            placeholder="DD/MM/AAAA"
            keyboardType="numbers-and-punctuation"
            highlight={parseDate(text) === null}
            hint={hint}
            style={{ paddingLeft: 52 }}
            onChangeText={(t) => {
              setText(t);
              const iso = parseDate(t);
              if (iso) onChange(iso);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir calendário"
            onPress={() => setOpen(true)}
            style={[styles.trigger, { top: 0 }]}>
            <Ionicons name="calendar-outline" size={20} color={c.primary} />
          </Pressable>
        </View>
      </View>
      {quick && <Chips options={options} value={options.find((o) => o.value === value)?.value ?? null} onChange={(v) => v && set(v)} />}
      <CalendarModal
        visible={open}
        value={value}
        onPick={(iso) => {
          set(iso);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function weekdayOfFirst(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
}

// Pure JS month grid, so it works the same on web, iOS and Android without a native module.
export function CalendarModal({
  visible,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: string | null;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const desktop = useIsDesktop();
  const now = today();
  const [month, setMonth] = useState(monthOf(value ?? now));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setMonth(monthOf(value ?? now));
  }

  const lead = weekdayOfFirst(month);
  const total = daysInMonth(month);
  const cells: (number | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const isoOf = (d: number) => `${month}-${String(d).padStart(2, '0')}`;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.overlay, { backgroundColor: c.overlay }, desktop && { justifyContent: 'center', alignItems: 'center' }]}
        onPress={onClose}>
        <Pressable onPress={() => {}} style={[styles.sheet, { backgroundColor: c.surface }, desktop && styles.dialog]}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mês anterior"
              onPress={() => setMonth(addMonths(month, -1))}
              style={styles.nav}>
              <Ionicons name="chevron-back" size={22} color={c.text} />
            </Pressable>
            <Txt size={17} weight={700}>
              {formatMonth(month)}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próximo mês"
              onPress={() => setMonth(addMonths(month, 1))}
              style={styles.nav}>
              <Ionicons name="chevron-forward" size={22} color={c.text} />
            </Pressable>
          </View>
          <View style={styles.row}>
            {WEEKDAYS.map((w, i) => (
              <View key={i} style={styles.cell}>
                <Txt size={12} weight={700} color={c.text3}>
                  {w}
                </Txt>
              </View>
            ))}
          </View>
          {weeks.map((week, w) => (
            <View key={w} style={styles.row}>
              {week.map((d, i) => {
                if (!d) return <View key={i} style={styles.cell} />;
                const iso = isoOf(d);
                const selected = iso === value;
                const isToday = iso === now;
                return (
                  <Pressable key={i} accessibilityRole="button" accessibilityLabel={iso} onPress={() => onPick(iso)} style={styles.cell}>
                    <View
                      style={[
                        styles.day,
                        selected && { backgroundColor: c.primary },
                        !selected && isToday && { borderWidth: 1, borderColor: c.primary },
                      ]}>
                      <Txt size={15} weight={selected ? 700 : 500} color={selected ? c.onPrimary : c.text} numeric>
                        {String(d)}
                      </Txt>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Hoje" variant="outline" onPress={() => onPick(now)} full />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Fechar" variant="outline" onPress={onClose} full />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: 'absolute',
    left: 0,
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    gap: space.xs,
  },
  dialog: { borderRadius: radius.xl, width: 380 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  nav: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
