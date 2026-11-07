import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type AppVariant = 'athletes' | 'officials';

const extra = (Constants.expoConfig?.extra || {}) as { appVariant?: AppVariant; apiUrl?: string | null };

export const APP_VARIANT: AppVariant = extra.appVariant === 'officials' ? 'officials' : 'athletes';

/**
 * Base URL of the Express API, including the /api prefix.
 * Set EXPO_PUBLIC_API_URL for real builds (e.g. https://api.example.org/api).
 * Local dev fallback: Android emulator reaches the host machine at 10.0.2.2.
 */
export const API_BASE_URL: string = (
  process.env.EXPO_PUBLIC_API_URL ||
  extra.apiUrl ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api')
).replace(/\/+$/, '');

/** Reminder offsets before the call room time, in minutes */
export const REMINDER_OFFSETS_MIN = [30, 10, 5] as const;

export const MEET = {
  name: 'Dr. ACS AURA 2026',
  subtitle: '28th VTU State Level Inter-Collegiate Athletic Meet',
  dates: '7–10 December 2026',
  venue: 'Dr. ACS College of Engineering, Bengaluru',
  timeZone: 'Asia/Kolkata',
};
