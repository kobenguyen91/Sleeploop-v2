import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { RootStackParamList } from '../navigation/types';
import { useSettings } from '../state/SettingsContext';
import { formatTime } from '../services/sleepCalculator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { settings, setSettings } = useSettings();
  const [isSkipped, setIsSkipped] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const now = new Date();

  // 1. Giờ thức dậy mục tiêu (Target Wake)
  const targetWake = useMemo(() => {
    const d = new Date();
    d.setHours(settings.targetWakeHour, settings.targetWakeMinute, 0, 0);
    if (d < now) d.setDate(d.getDate() + 1);
    return d;
  }, [settings.targetWakeHour, settings.targetWakeMinute]);

  // 2. Tính toán danh sách 4 mốc giờ đi ngủ tối ưu
  const sleepOptions = useMemo(() => {
    return [
      { cycles: 6, label: "Tràn đầy năng lượng", desc: "Ngủ 9 tiếng - Hoàn hảo cho sức khỏe" },
      { cycles: 5, label: "Khuyên dùng", desc: "Ngủ 7.5 tiếng - Đủ chu kỳ & tỉnh táo nhất" },
      { cycles: 4, label: "Vừa đủ", desc: "Ngủ 6 tiếng - Có thể hơi lờ đờ khi dậy" },
      { cycles: 3, label: "Ngủ ngắn", desc: "Ngủ 4.5 tiếng - Chỉ nên dùng khi quá bận" },
    ].map(item => {
      // Giờ ngủ = Giờ dậy - (Chu kỳ * 90p) - Thời gian vào giấc
      const sleepTime = new Date(targetWake.getTime() - (item.cycles * 90 + settings.sleepLatencyMinutes) * 60000);
      return { ...item, sleepTime };
    });
  }, [targetWake, settings.sleepLatencyMinutes]);

  // Giờ ngủ lý tưởng nhất là mốc 5 chu kỳ
  const idealSleepTime = sleepOptions[1].sleepTime;
  const isLate = now > idealSleepTime;
  // Nếu còn hơn 6 tiếng nữa mới đến giờ ngủ lý tưởng -> Coi là quá sớm
  const isTooEarly = (idealSleepTime.getTime() - now.getTime()) > 6 * 60 * 60 * 1000;

  if (isSkipped) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Card style={{ alignItems: 'center', padding: spacing.xl, borderRadius: 32 }}>
          <Ionicons name="moon-sharp" size={64} color={colors.primary} />
          <Text style={styles.skipTitle}>Tối nay bạn đang tự do</Text>
          <Text style={styles.skipSub}>Mọi nhắc nhở đã được tạm dừng. Hãy nghỉ ngơi thật thoải mái!</Text>
          <Button label="Kích hoạt lại kế hoạch" onPress={() => setIsSkipped(false)} style={{ width: '100%', marginTop: 24 }} />
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER: Settings đặt ở góc phải dễ thấy */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sleeploop</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
        
        {/* KHỐI 1: GIỜ THỨC DẬY (Bấm được để chỉnh giờ) */}
        <Card style={[styles.card, isLate && styles.lateBorder]}>
          <Text style={styles.label}>MỤC TIÊU THỨC DẬY</Text>
          <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.timeDisplay}>
            <Text style={styles.timeText}>{formatTime(targetWake.getTime())}</Text>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color={colors.primary} />
              <Text style={styles.editText}>CHẠM ĐỂ ĐỔI GIỜ</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.statusRow}>
            <Ionicons 
              name={isLate ? "alert-circle" : "sparkles"} 
              size={16} 
              color={isLate ? colors.danger : colors.primary} 
            />
            <Text style={[styles.statusText, { color: isLate ? colors.danger : colors.primary }]}>
              {isLate ? "Bạn đã bỏ lỡ mốc ngủ 5 chu kỳ" : `Dậy lúc ${formatTime(targetWake.getTime())} là tối ưu`}
            </Text>
          </View>
        </Card>

        {showPicker && (
          <DateTimePicker
            value={targetWake}
            mode="time"
            display="spinner"
            onChange={(_, selected) => {
              setShowPicker(false);
              if (selected) {
                setSettings({ ...settings, targetWakeHour: selected.getHours(), targetWakeMinute: selected.getMinutes() });
              }
            }}
          />
        )}

        {/* KHỐI 2: CÁC MỐC GIỜ ĐI NGỦ (Thay thế Hiệu suất tuần) */}
        <Text style={[styles.label, { marginBottom: 12 }]}>LỊCH TRÌNH NGỦ TỐI NAY</Text>
        
        {sleepOptions.map((opt, index) => {
          const isPassed = now > opt.sleepTime;
          return (
            <TouchableOpacity 
              key={index}
              style={[styles.sleepCard, isPassed && styles.dimmed]}
              onPress={() => navigation.navigate('Result', {
                suggestedWakeAt: targetWake.getTime(),
                suggestedSleepAt: opt.sleepTime.getTime(),
                cycles: opt.cycles,
                targetWakeAt: targetWake.getTime(),
                flexibilityMinutes: settings.flexibilityMinutes
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.optLabel}>{opt.label} ({opt.cycles} chu kỳ)</Text>
                <Text style={styles.optDesc}>{opt.desc}</Text>
              </View>
              <View style={styles.optTimeBox}>
                <Text style={styles.optTimeText}>{formatTime(opt.sleepTime.getTime())}</Text>
                {isPassed && <Text style={styles.passedText}>ĐÃ QUA</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* KHỐI 3: ACTION - CHỈ HIỆN "SLEEP NOW" KHI CẦN THIẾT */}
        <View style={styles.actionArea}>
          {isLate || !isTooEarly ? (
            <Button 
              label="Bắt đầu ngủ ngay bây giờ" 
              onPress={() => {
                // Ngủ bây giờ + 5 chu kỳ + latency
                const wakeAt = new Date(now.getTime() + (7.5 * 60 + settings.sleepLatencyMinutes) * 60000);
                navigation.navigate('Result', { 
                  suggestedWakeAt: wakeAt.getTime(), 
                  suggestedSleepAt: now.getTime(),
                  cycles: 5,
                  targetWakeAt: targetWake.getTime(),
                  flexibilityMinutes: settings.flexibilityMinutes
                });
              }}
            />
          ) : (
            <View style={styles.tooEarlyBox}>
               <Text style={styles.tooEarlyText}>Vẫn còn sớm để đi ngủ. Hãy xem lịch trình bên trên để chuẩn bị nhé!</Text>
            </View>
          )}

          {/* SKIP TONIGHT: Dễ thấy và đẹp mắt */}
          <TouchableOpacity style={styles.skipCard} onPress={() => setIsSkipped(true)}>
            <Ionicons name="moon-outline" size={18} color={colors.muted} />
            <Text style={styles.skipText}>Tối nay ngủ tự do (Bỏ qua kế hoạch)</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 60, 
    paddingHorizontal: spacing.lg, 
    paddingBottom: 20 
  },
  headerTitle: { color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  settingsBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  card: { padding: spacing.lg, marginBottom: 24, borderRadius: 28 },
  lateBorder: { borderLeftWidth: 5, borderLeftColor: colors.danger },
  label: { color: colors.text2, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  timeDisplay: { alignItems: 'center', marginVertical: 10 },
  timeText: { color: colors.text, fontSize: 76, fontWeight: '900', letterSpacing: -4 },
  editBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  editText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  statusText: { fontSize: 13, fontWeight: '600' },
  
  sleepCard: { 
    flexDirection: 'row', 
    backgroundColor: colors.surface, 
    padding: 18, 
    borderRadius: 22, 
    marginBottom: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)'
  },
  dimmed: { opacity: 0.35 },
  optLabel: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  optDesc: { color: colors.muted, fontSize: 12, marginTop: 2 },
  optTimeBox: { alignItems: 'flex-end' },
  optTimeText: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  passedText: { color: colors.danger, fontSize: 9, fontWeight: '900', marginTop: 4 },
  
  actionArea: { marginTop: 10, gap: 16 },
  tooEarlyBox: { padding: 20, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tooEarlyText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  skipCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10, 
    padding: 16, 
    borderRadius: 22, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    borderStyle: 'dashed' 
  },
  skipText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  skipTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 15 },
  skipSub: { color: colors.text2, fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 20, lineHeight: 20 }
});