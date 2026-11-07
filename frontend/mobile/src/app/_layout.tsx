import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AthleteSessionProvider, useAthleteSession } from '@/lib/athlete-session';

// Show reminders and pushes even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** A server push about the schedule (call room open, delay, re-draw) → refetch and reschedule reminders */
function PushRefresh() {
  const { status, refresh } = useAthleteSession();
  useEffect(() => {
    if (status !== 'signedIn') return;
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const kind = (n.request.content.data as any)?.kind;
      if (kind && kind !== 'call-room-reminder') refresh();
    });
    return () => sub.remove();
  }, [status, refresh]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AthleteSessionProvider>
        <PushRefresh />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="officials" />
        </Stack>
      </AthleteSessionProvider>
    </SafeAreaProvider>
  );
}
