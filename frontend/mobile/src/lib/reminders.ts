/**
 * Call room reminders, scheduled ON THE PHONE (they fire even with no internet at the stadium).
 *
 * For every upcoming event the athlete competes in, a local notification is scheduled
 * REMINDER_OFFSETS_MIN (30 / 10 / 5) minutes before the call room time. Each sync cancels
 * and re-creates all reminders, so schedule changes (delays, re-drawn heats) are picked up
 * whenever the app refreshes or a "schedule changed" push arrives.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REMINDER_OFFSETS_MIN } from './config';
import { fmtTime, stageLabel } from './format';
import type { ScheduleEntry } from './types';

export const CALL_ROOM_CHANNEL = 'call-room';
const ENABLED_KEY = '@aura/reminders-enabled';
const FINISHED = new Set(['COMPLETED', 'OFFICIAL', 'IN_PROGRESS', 'ON_TRACK']);

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CALL_ROOM_CHANNEL, {
    name: 'Call room reminders',
    description: 'Reminders before you must report to the call room',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    sound: 'default',
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'denied'; // web preview: no local notifications
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'denied';
  // Android 13+: the system prompt only appears once a channel exists
  await ensureNotificationChannel();
  const p = await Notifications.requestPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

/** Android 12+ exact alarms. Returns null on platforms where it does not apply. */
export async function getExactAlarmGranted(): Promise<boolean | null> {
  if (Platform.OS !== 'android') return null;
  try {
    return (await Notifications.getExactAlarmPermissionsAsync()).granted;
  } catch {
    return null;
  }
}

/** Opens the system screen where the athlete can allow exact alarms (result applies on return). */
export async function requestExactAlarm(): Promise<boolean | null> {
  if (Platform.OS !== 'android') return null;
  try {
    return (await Notifications.requestExactAlarmPermissionsAsync()).granted;
  } catch {
    return null;
  }
}

export async function getRemindersEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) !== 'false';
  } catch {
    return true;
  }
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

/** Events that should get reminders: competing (not a reserve), not yet reported, not finished */
export function isRemindable(e: ScheduleEntry): boolean {
  return !!e.callRoomAt && e.kind !== 'reserve' && !e.isRelayReserve && !e.reported && !FINISHED.has(e.status);
}

function describe(e: ScheduleEntry): string {
  const parts = [stageLabel(e.stage), e.heatNumber ? `Heat ${e.heatNumber}` : '', e.lane ? `Lane ${e.lane}` : '', e.relayLeg ? `Leg ${e.relayLeg}` : '']
    .filter(Boolean)
    .join(' · ');
  return parts;
}

/**
 * Cancels all scheduled reminders and schedules fresh ones for `schedule`.
 * Returns how many notifications were scheduled.
 */
export async function syncReminders(schedule: ScheduleEntry[]): Promise<number> {
  if (Platform.OS === 'web') return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await getRemindersEnabled())) return 0;
  if ((await getNotificationPermission()) !== 'granted') return 0;
  await ensureNotificationChannel();

  const now = Date.now();
  let count = 0;
  for (const e of schedule) {
    if (!isRemindable(e)) continue;
    const callRoomMs = new Date(e.callRoomAt!).getTime();
    for (const offset of REMINDER_OFFSETS_MIN) {
      const fireAt = callRoomMs - offset * 60 * 1000;
      if (fireAt <= now + 15 * 1000) continue;
      const detail = describe(e);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${e.eventName} — call room in ${offset} min`,
          body: `${detail ? `${detail}. ` : ''}Report to the Call Room by ${fmtTime(e.callRoomAt)}${e.callRoomEstimated ? ' (approx.)' : ''}. Carry your ID card.`,
          data: { kind: 'call-room-reminder', key: e.key, offset },
          sound: 'default',
          ...(Platform.OS === 'android' ? { priority: Notifications.AndroidNotificationPriority.MAX } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          channelId: CALL_ROOM_CHANNEL,
          // Last reminder must not be deferred by battery saving (uses setAlarmClock when allowed)
          ...(offset === Math.min(...REMINDER_OFFSETS_MIN) ? { delivery: 'alarmClock' as const } : {}),
        },
      });
      count += 1;
    }
  }
  return count;
}
