import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { RootStackParamList } from '../navigation/types';
import { formatTime } from '../services/sleepCalculator';
import { makeId } from '../utils/id';
// Import hàm scheduleSleepReminders (bản plural) chúng ta đã sửa
import { recordPlannedSleep, scheduleAlarm, scheduleSleepReminders } from '../services/notificationService';
import { useSettings } from '../state/SettingsContext';
import { useHistory } from '../state/HistoryContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

// Helper: Ngôn ngữ thân thiện (Feature 6)
const getCycleDescriptor = (cycles: number) => {
  if (cycles < 4) return "Ngủ ít hơn mức cần thiết";
  if (cycles === 4) return "Tạm đủ, có thể hơi lờ đờ";
  if (cycles === 5) return "Ngủ đủ, tỉnh táo nhất";
  return "Tràn đầy năng lượng";
};

// Helper: Giải thích linh hoạt (Feature 4)
const getFlexLabel = (min: number) => {
  if (min === 0) return "Chế độ: Đúng giờ";
  if (min <= 15) return "Chế độ: Thông minh (±15p)";
  return "Chế độ: Linh hoạt (±30p)";
};

export function ResultScreen({ route, navigation }: Props) {
  const { settings } = useSettings();
  const { refresh } = useHistory();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [manualWakeAt, setManualWakeAt] = useState<number | null>(null);

  // Lấy giờ dậy (ưu tiên giờ chỉnh tay, nếu không lấy từ route truyền sang)
  const wakeAt = manualWakeAt ?? route.params.suggestedWakeAt;
  const wakeDate = useMemo(() => new Date(wakeAt), [wakeAt]);

  const handleAccept = async () => {
    const entryId = makeId('sleep');
    
    // 1. Ghi lại kế hoạch ngủ vào lịch sử
    await recordPlannedSleep({
      entryId,
      sleepStartAt: route.params.suggestedSleepAt,
      plannedWakeAt: wakeAt,
      cyclesPlanned: route.params.cycles,
    });

    // 2. Đặt báo thức thực tế
    await scheduleAlarm({ timestamp: wakeAt, entryId });

    // 3. Cập nhật lại nhắc nhở đi ngủ (Sử dụng hàm 4 tham số đã sửa)
    if (settings.remindersEnabled) {
        const targetWake = new Date();
        targetWake.setHours(settings.targetWakeHour, settings.targetWakeMinute, 0, 0);
        if (targetWake < new Date()) targetWake.setDate(targetWake.getDate() + 1);

        await scheduleSleepReminders(
            targetWake,
            settings.sleepLatencyMinutes,
            settings.silentMode,
            settings.weekendMode
        );
    }

    await refresh();
    navigation.popToTop(); // Quay về màn hình chính
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.label}>GIỜ THỨC DẬY DỰ KIẾN</Text>
        <Text style={styles.time}>{formatTime(wakeAt)}</Text>
        
        <View style={styles.infoRow}>
            <Text style={styles.sub}>
              {getFlexLabel(route.params.flexibilityMinutes)}
            </Text>
            <View style={styles.dot} />
            <Text style={styles.highlight}>
              {getCycleDescriptor(route.params.cycles)}
            </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>Lịch trình ngủ</Text>
        <Text style={styles.body}>
          Bạn nên lên giường lúc <Text style={styles.bold}>{formatTime(route.params.suggestedSleepAt)}</Text>
        </Text>
        <Text style={styles.smallSub}>
          (Đã bao gồm {settings.sleepLatencyMinutes} phút thời gian để chìm vào giấc ngủ)
        </Text>

        <View style={styles.actionBox}>
          <Button
            label="Chấp nhận & Đặt báo thức"
            onPress={handleAccept}
            style={{ flex: 1 }}
          />
        </View>

        <Button
          label={adjustOpen ? 'Đóng tùy chỉnh' : 'Tự điều chỉnh giờ dậy'}
          variant="secondary"
          onPress={() => setAdjustOpen((v) => !v)}
        />

        {adjustOpen && (
          <View style={styles.adjustBox}>
            <DateTimePicker
              value={wakeDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                if (!selected) return;
                const d = new Date(wakeAt);
                d.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                setManualWakeAt(d.getTime());
              }}
            />
            <Text style={styles.helper}>
              Lưu ý: Nếu bạn chỉnh tay, chu kỳ ngủ có thể không còn tối ưu như app đề xuất.
            </Text>
          </View>
        )}
      </Card>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  card: { gap: spacing.sm, padding: spacing.md },
  label: {
    color: colors.text2,
    fontSize: typography.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  time: {
    color: colors.text,
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: -1,
    marginVertical: spacing.xs,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.muted },
  sub: { color: colors.muted, fontSize: 13 },
  highlight: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  body: { color: colors.text, fontSize: 16, marginTop: spacing.xs },
  bold: { fontWeight: 'bold', color: colors.primary },
  smallSub: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
  actionBox: { marginTop: spacing.md, marginBottom: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md, opacity: 0.5 },
  adjustBox: { marginTop: spacing.sm, backgroundColor: 'rgba(255,255,255,0.03)', padding: spacing.sm, borderRadius: 12 },
  helper: { marginTop: spacing.sm, color: colors.muted, fontSize: 12, textAlign: 'center' },
});