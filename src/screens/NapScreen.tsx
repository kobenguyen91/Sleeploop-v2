import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { makeId } from '../utils/id';
import { recordPlannedNap, scheduleNap } from '../services/notificationService';
import { useHistory } from '../state/HistoryContext';

const presets = [
  { label: 'Power Nap', minutes: 20 },
  { label: 'Full Cycle', minutes: 90 },
];

export function NapScreen() {
  const { refresh } = useHistory();
  const [custom, setCustom] = useState('30');
  const customMinutes = useMemo(() => {
    const n = Number(custom);
    if (!Number.isFinite(n)) return 30;
    return Math.max(10, Math.min(120, Math.round(n)));
  }, [custom]);

  async function startNap(minutes: number) {
    const entryId = makeId('nap');
    await recordPlannedNap({ entryId, durationMinutes: minutes });
    await scheduleNap({ durationMinutes: minutes, entryId });
    await refresh();
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Choose a nap</Text>
        <Text style={styles.sub}>We’ll ring offline using a local notification.</Text>

        <View style={styles.row}>
          {presets.map((p) => (
            <Button key={p.minutes} label={`${p.label}\n${p.minutes} min`} variant="secondary" onPress={() => startNap(p.minutes)} style={{ flex: 1 }} />
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>Custom (10–120 min)</Text>
        <View style={styles.row}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Button label={`Start ${customMinutes} min`} onPress={() => startNap(customMinutes)} style={{ flex: 1 }} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  card: { gap: spacing.sm },
  title: { color: colors.text, fontSize: typography.h1, fontWeight: '800' },
  sub: { color: colors.text2, fontSize: typography.body, lineHeight: 22 },
  label: { color: colors.text2, fontSize: typography.caption, letterSpacing: 0.3 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  input: {
    flex: 0.6,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
});

