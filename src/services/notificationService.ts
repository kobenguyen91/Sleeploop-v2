import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Cấu hình cách hiển thị thông báo trên Android/iOS
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

/**
 * Khởi tạo thông báo khi mở app
 */
export async function initNotifications() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
  return status === 'granted';
}

/**
 * Xin quyền thông báo từ người dùng
 */
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/**
 * Lưu kế hoạch ngủ vào lịch sử (AsyncStorage)
 */
export async function recordPlannedSleep(data: {
  entryId: string;
  sleepStartAt: number;
  plannedWakeAt: number;
  cyclesPlanned: number;
}) {
  try {
    const existing = await AsyncStorage.getItem('sleep_records');
    const records = existing ? JSON.parse(existing) : [];
    records.push({ ...data, createdAt: Date.now() });
    await AsyncStorage.setItem('sleep_records', JSON.stringify(records));
  } catch (e) {
    console.error('Không thể lưu lịch sử ngủ:', e);
  }
}

/**
 * Đặt một báo thức cụ thể (Dùng khi user bấm Accept ở màn hình Result)
 */
export async function scheduleAlarm({ timestamp, entryId }: { timestamp: number; entryId: string }) {
  // Hủy các lịch cũ để tránh kêu chồng chéo
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ DẬY THÔI NÀO!",
      body: "Đã đến giờ thức dậy theo chu kỳ tối ưu của bạn.",
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { entryId },
    },
    trigger: {
      date: new Date(timestamp),
    } as Notifications.NotificationTriggerInput,
  });
}

/**
 * HÀM QUAN TRỌNG NHẤT: Đặt lịch nhắc đi ngủ & Báo thức mặc định (Auto-Alarm)
 * Chạy mỗi khi user thay đổi Settings hoặc mở App
 */
export async function scheduleSleepReminders(
  targetWakeTime: Date, 
  sleepLatency: number,
  silentMode: boolean,
  weekendMode: boolean
) {
  // BƯỚC 1: Xóa sạch các lịch cũ để đặt lại từ đầu
  await Notifications.cancelAllScheduledNotificationsAsync();

  // BƯỚC 2: Kiểm tra các chế độ không làm phiền
  if (silentMode) return;
  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  if (weekendMode && isWeekend) return;

  // BƯỚC 3: TỰ ĐỘNG ĐẶT BÁO THỨC MẶC ĐỊNH (Phòng trường hợp user ngủ quên không mở app)
  if (targetWakeTime > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ DẬY THÔI NÀO!",
        body: "Báo thức theo lịch trình thức dậy hằng ngày của bạn.",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: { date: targetWakeTime } as Notifications.NotificationTriggerInput,
    });
  }

  // BƯỚC 4: ĐẶT LỊCH NHẮC ĐI NGỦ 2 GIAI ĐOẠN (Dựa trên mốc 5 chu kỳ = 7.5h)
  const idealSleepTime = new Date(targetWakeTime.getTime() - (7.5 * 60 + sleepLatency) * 60000);
  
  // Phase 1: Nhắc chuẩn bị (Soft) - Trước giờ ngủ 30 phút
  const phase1Time = new Date(idealSleepTime.getTime() - 30 * 60000);
  if (phase1Time > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌙 Chuẩn bị nghỉ ngơi thôi",
        body: `Bạn nên bắt đầu thư giãn để ngủ lúc ${idealSleepTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
      },
      trigger: { date: phase1Time } as Notifications.NotificationTriggerInput,
    });
  }

  // Phase 2: Nhắc đi ngủ ngay (Hard) - Đúng giờ ngủ để kịp 5 chu kỳ
  if (idealSleepTime > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚡ Đến giờ ngủ rồi!",
        body: "Hãy đi ngủ ngay bây giờ để thức dậy tỉnh táo với đủ 5 chu kỳ ngủ nhé.",
      },
      trigger: { date: idealSleepTime } as Notifications.NotificationTriggerInput,
    });
  }
}