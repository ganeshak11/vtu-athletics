/**
 * Remote push (Expo Push Service) — used by the server for "call room OPEN", delays and
 * schedule changes. Local reminders work without it. Requires a development/production
 * build and an EAS project id (`npx eas-cli@latest init`); silently skipped otherwise.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { ensureNotificationChannel, getNotificationPermission } from './reminders';

const PUSH_TOKEN_KEY = '@aura/push-token';

function projectId(): string | undefined {
  return (
    (Constants as any).easConfig?.projectId ||
    (Constants.expoConfig?.extra as any)?.eas?.projectId ||
    undefined
  );
}

export async function registerPushToken(authToken: string): Promise<void> {
  try {
    if (!Device.isDevice || !projectId()) return;
    if ((await getNotificationPermission()) !== 'granted') return;
    await ensureNotificationChannel();
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await api('/athlete/push-token', { method: 'POST', token: authToken, body: { token: data, platform: Platform.OS } });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, data);
  } catch {
    // Offline or not configured: local reminders still work; retried on next refresh
  }
}

export async function unregisterPushToken(authToken: string): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) await api('/athlete/push-token', { method: 'DELETE', token: authToken, body: { token }, timeoutMs: 5000 });
  } catch {
    // best effort
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {});
  }
}
