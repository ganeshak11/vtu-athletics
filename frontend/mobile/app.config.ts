import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * One codebase, two apps:
 *
 *   APP_VARIANT=athletes  → "AURA Athletes"   (students: pass, events, reminders)   [default]
 *   APP_VARIANT=officials → "AURA Officials"  (food, warden, call room, referees…)
 *
 *   APP_VARIANT=athletes  npx expo start          # dev
 *   APP_VARIANT=officials npx expo run:android    # dev build of the officials app
 *   eas build --profile athletes-production        # see eas.json
 *
 * API base URL: EXPO_PUBLIC_API_URL (e.g. https://api.aura2026.example/api is NOT assumed —
 * set it per build). Falls back to the Android emulator → host loopback for local dev.
 *
 * NOTE: android.package / ios.bundleIdentifier are permanent once an app is uploaded to the
 * Play Store / App Store. Change them here BEFORE the first upload if needed.
 */
type Variant = 'athletes' | 'officials';

const VARIANTS: Record<Variant, { name: string; slug: string; scheme: string; id: string; color: string }> = {
  athletes: {
    name: 'AURA Athletes',
    slug: 'aura-athletes',
    scheme: 'aura-athletes',
    id: 'in.acsce.aura.athletes',
    color: '#1d4ed8',
  },
  officials: {
    name: 'AURA Officials',
    slug: 'aura-officials',
    scheme: 'aura-officials',
    id: 'in.acsce.aura.officials',
    color: '#0f172a',
  },
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant: Variant = process.env.APP_VARIANT === 'officials' ? 'officials' : 'athletes';
  const v = VARIANTS[variant];

  return {
    ...config,
    name: v.name,
    slug: v.slug,
    scheme: v.scheme,
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: false,
      bundleIdentifier: v.id,
      infoPlist: {
        NSCameraUsageDescription:
          variant === 'officials'
            ? 'AURA Officials uses the camera to scan athlete ID-card QR codes.'
            : 'AURA Athletes uses the camera to scan the QR code on your ID card to log in.',
      },
    },
    android: {
      package: v.id,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // Exact-time reminders (30/10/5 min before call room). Android 14+ denies this by default;
      // the app asks the athlete to allow it and falls back to best-effort timing otherwise.
      permissions: variant === 'athletes' ? ['android.permission.SCHEDULE_EXACT_ALARM'] : [],
    },
    web: { favicon: './assets/favicon.png' },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-camera',
        {
          cameraPermission:
            variant === 'officials'
              ? 'AURA Officials uses the camera to scan athlete ID-card QR codes.'
              : 'AURA Athletes uses the camera to scan the QR code on your ID card to log in.',
        },
      ],
      [
        'expo-notifications',
        {
          color: v.color,
          defaultChannel: 'call-room',
        },
      ],
    ],
    experiments: { typedRoutes: true },
    extra: {
      appVariant: variant,
      apiUrl: process.env.EXPO_PUBLIC_API_URL || null,
      // Filled in by `eas init` (required for push notification tokens)
      eas: { projectId: process.env.EAS_PROJECT_ID || undefined },
    },
  };
};
