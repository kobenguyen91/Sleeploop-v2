import React, { useMemo, useState, useEffect } from 'react';
import { Platform, StyleSheet, Switch, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useSettings } from '../state/SettingsContext';
import type { FlexibilityMinutes } from '../services/sleepCalculator';
import { scheduleSleepReminders, requestNotificationPermissions } from '../services/notificationService';

// Feature 4: Diễn giải chi tiết từng chế độ (Smart/Relaxed)
const flexOptions: { label: string; value: FlexibilityMinutes; desc: string; icon: any }[] = [
  { 
    label: 'Chính xác', 
    value: 0, 
    desc: 'Báo thức đúng giờ mục tiêu (±0 phút). Phù hợp nếu bạn có lịch trình cố định.', 
    icon: 'stopwatch-outline' 
  },
  { 
    label: 'Thông minh', 
    value: 15, 
    desc: 'App sẽ tìm mốc dậy tốt nhất trong khoảng 15 phút quanh giờ mục tiêu để tránh đánh thức bạn khi đang trong giai đoạn ngủ sâu.', 
    icon: 'sparkles-outline' 
  },
  { 
    label: 'Linh hoạt', 
    value: 30, 
    desc: 'Khoảng dời lên đến 30 phút. Ưu tiên tuyệt đối việc giúp bạn hoàn thành trọn vẹn chu kỳ ngủ cuối cùng để thức dậy tỉnh táo nhất.', 
    icon: 'leaf-outline' 
  },
];

export function SettingsScreen() {
  const { settings, setSettings } = useSettings();
  const [pickerOpen, setPickerOpen] = useState(Platform.OS === 'ios');

  const wakeDate = useMemo(() => {
    const d = new Date();
    d.setHours(settings.targetWakeHour, settings.targetWakeMinute, 0, 0);
    return d;
  }, [settings.targetWakeHour, settings.targetWakeMinute]);

  // Tự động cập nhật nhắc nhở khi có bất kỳ thay đổi nào
  useEffect(() => {
    const updateNotifications = async () => {
      if (settings.remindersEnabled) {
        const d = new Date();
        d.setHours(settings.targetWakeHour, settings.targetWakeMinute, 0, 0);
        if (d < new Date()) d.setDate(d.getDate() + 1);
        
        await scheduleSleepReminders(
          d, 
          settings.sleepLatencyMinutes, 
          settings.silentMode, 
          settings.weekendMode
        );
      }
    };
    updateNotifications();
  }, [settings]);

  const handleToggleReminders = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Cấp quyền thông báo",
          "Vui lòng cho phép thông báo trong cài đặt máy để app có thể nhắc bạn đi ngủ đúng lúc.",
          [{ text: "Đóng" }]
        );
        return;
      }
    }
    setSettings({ ...settings, remindersEnabled: value }).catch(() => {});
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      
      {/* 1. Giờ thức dậy mục tiêu */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="alarm-outline" size={22} color={colors.primary} />
          <Text style={styles.title}>Giờ báo thức</Text>
        </View>
        <Text style={styles.sub}>Đây là mốc giờ bạn muốn thức dậy mỗi ngày. App sẽ dựa vào đây để tính lịch trình ngủ cho bạn.</Text>

        <Button
          label={`Thức dậy lúc: ${wakeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          variant="secondary"
          onPress={() => setPickerOpen((v) => !v)}
          style={{ marginTop: spacing.xs }}
        />

        {pickerOpen && (
          <DateTimePicker
            value={wakeDate}
            mode="time"
            display="spinner"
            onChange={(_, selected) => {
              if (!selected) return;
              if (Platform.OS === 'android') setPickerOpen(false);
              setSettings({
                ...settings,
                targetWakeHour: selected.getHours(),
                targetWakeMinute: selected.getMinutes(),
              }).catch(() => {});
            }}
          />
        )}
      </Card>

      {/* 2. Chế độ thức dậy (Flexibility) */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="options-outline" size={22} color={colors.primary} />
          <Text style={styles.title}>Chế độ thức dậy</Text>
        </View>
        <Text style={styles.sub}>Chọn cách app tối ưu thời điểm báo thức dựa trên chu kỳ ngủ của bạn.</Text>
        
        <View style={styles.flexList}>
          {flexOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setSettings({ ...settings, flexibilityMinutes: opt.value }).catch(() => {})}
              style={[
                styles.flexItem,
                settings.flexibilityMinutes === opt.value && styles.flexItemActive
              ]}
            >
              <View style={styles.flexItemHeader}>
                <Ionicons 
                  name={opt.icon} 
                  size={18} 
                  color={settings.flexibilityMinutes === opt.value ? '#fff' : colors.text2} 
                />
                <Text style={[styles.flexLabel, settings.flexibilityMinutes === opt.value && {color: '#fff'}]}>
                  {opt.label}
                </Text>
              </View>
              <Text style={[styles.flexDesc, settings.flexibilityMinutes === opt.value && {color: 'rgba(255,255,255,0.7)'}]}>
                {opt.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* 3. Nhắc nhở & Tối ưu */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          <Text style={styles.title}>Thông báo & Nhắc nhở</Text>
        </View>

        {/* Nhắc nhở chính - Giải thích rõ Phase 1 và 2 */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bodyText}>Nhắc nhở đi ngủ</Text>
            <Text style={styles.smallSub}>
              Nhắc 2 lần: Lần 1 (trước 30p) để bạn chuẩn bị thư giãn. Lần 2 (đúng giờ) để đảm bảo bạn đi ngủ ngay nhằm kịp chu kỳ 7.5 tiếng (5 chu kỳ).
            </Text>
          </View>
          <Switch
            value={settings.remindersEnabled}
            onValueChange={handleToggleReminders}
            trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }}
            thumbColor={'white'}
          />
        </View>

        <View style={styles.divider} />

        {/* Chế độ cuối tuần */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bodyText}>Chế độ cuối tuần</Text>
            <Text style={styles.smallSub}>Tự động tắt mọi nhắc nhở vào Thứ 7 và Chủ Nhật để bạn thoải mái ngủ nướng.</Text>
          </View>
          <Switch 
            value={settings.weekendMode} 
            onValueChange={(v) => setSettings({ ...settings, weekendMode: v }).catch(() => {})} 
            trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }} 
          />
        </View>

        <View style={styles.divider} />

        {/* Chế độ im lặng */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bodyText}>Chế độ im lặng</Text>
            <Text style={styles.smallSub}>Tạm ngưng thông báo nhắc nhở cho riêng tối nay. Sẽ tự động bật lại vào ngày mai.</Text>
          </View>
          <Switch 
            value={settings.silentMode} 
            onValueChange={(v) => setSettings({ ...settings, silentMode: v }).catch(() => {})} 
            trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }} 
          />
        </View>
      </Card>

      <Text style={styles.versionText}>Sleeploop v2.0 · Expo SDK 54</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  card: { gap: spacing.sm, marginBottom: spacing.lg, padding: spacing.md, borderRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.text2, fontSize: 13, lineHeight: 18, marginBottom: spacing.xs },
  bodyText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  smallSub: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md, opacity: 0.3 },
  flexList: { gap: spacing.sm, marginTop: spacing.sm },
  flexItem: {
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  flexItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  flexItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  flexLabel: { color: colors.text, fontWeight: 'bold', fontSize: 15 },
  flexDesc: { color: colors.text2, fontSize: 12, lineHeight: 16 },
  versionText: { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 20, opacity: 0.5 }
});