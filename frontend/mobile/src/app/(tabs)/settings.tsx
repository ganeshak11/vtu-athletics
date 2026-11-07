import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useAthleteSession } from '@/lib/athlete-session';
import {
  getExactAlarmGranted,
  getNotificationPermission,
  getRemindersEnabled,
  requestExactAlarm,
  requestNotificationPermission,
  setRemindersEnabled,
  type PermissionState,
} from '@/lib/reminders';
import { REMINDER_OFFSETS_MIN } from '@/lib/config';
import { Button, Card, Muted, Pill, Screen, Title, colors } from '@/components/ui';

export default function SettingsScreen() {
  const { me, logout, refresh, refreshing, lastSyncedAt, remindersScheduled, resyncReminders } = useAthleteSession();
  const [enabled, setEnabled] = useState(true);
  const [perm, setPerm] = useState<PermissionState>('undetermined');
  const [exact, setExact] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setEnabled(await getRemindersEnabled());
    setPerm(await getNotificationPermission());
    setExact(await getExactAlarmGranted());
  }, []);

  useEffect(() => {
    load();
    // Permission screens open outside the app: re-check when the athlete comes back
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') load().then(() => resyncReminders());
    });
    return () => sub.remove();
  }, [load, resyncReminders]);

  async function toggle(v: boolean) {
    setEnabled(v);
    await setRemindersEnabled(v);
    if (v && perm !== 'granted') {
      const p = await requestNotificationPermission();
      setPerm(p);
    }
    await resyncReminders();
  }

  async function askNotifications() {
    const p = await requestNotificationPermission();
    setPerm(p);
    if (p === 'denied') {
      Alert.alert('Notifications are blocked', 'Open Settings and allow notifications for AURA Athletes to get call room reminders.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
    }
    await resyncReminders();
  }

  async function askExact() {
    await requestExactAlarm();
    setExact(await getExactAlarmGranted());
    await resyncReminders();
  }

  function confirmLogout() {
    Alert.alert('Log out?', 'Your reminders on this phone will be cancelled.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  const synced = lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'never';

  return (
    <Screen>
      <Title>Settings</Title>

      <Card style={{ gap: 12 }}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>Call room reminders</Text>
            <Muted>{REMINDER_OFFSETS_MIN.join(', ')} minutes before each call room time</Muted>
          </View>
          <Switch value={enabled} onValueChange={toggle} accessibilityLabel="Call room reminders" />
        </View>

        <View style={s.row}>
          <Text style={[s.rowTitle, { flex: 1 }]}>Notifications</Text>
          <Pill label={perm === 'granted' ? 'Allowed' : perm === 'denied' ? 'Blocked' : 'Not allowed yet'} tone={perm === 'granted' ? 'green' : 'red'} />
        </View>
        {perm !== 'granted' && <Button title="Allow notifications" onPress={askNotifications} />}

        {Platform.OS === 'android' && exact !== null && (
          <>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>On-time reminders</Text>
                <Muted>Lets Android deliver reminders at the exact minute, even in battery saver.</Muted>
              </View>
              <Pill label={exact ? 'On' : 'Off'} tone={exact ? 'green' : 'amber'} />
            </View>
            {!exact && <Button title="Turn on on-time reminders" variant="secondary" onPress={askExact} />}
          </>
        )}

        <Muted>
          {remindersScheduled === null ? 'Reminders not synced yet.' : `${remindersScheduled} reminder${remindersScheduled === 1 ? '' : 's'} scheduled on this phone.`}
        </Muted>
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.rowTitle}>Data</Text>
        <Muted>Last updated at {synced}. Your pass and schedule are saved on this phone and work offline.</Muted>
        <Button title="Refresh now" variant="secondary" loading={refreshing} onPress={refresh} />
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.rowTitle}>Account</Text>
        <Muted>
          Logged in as {me?.athlete.name} (bib {me?.athlete.bibNumber ?? '—'})
        </Muted>
        <Button title="Log out" variant="danger" onPress={confirmLogout} />
      </Card>

      <Muted style={{ textAlign: 'center', fontSize: 12 }}>
        AURA Athletes v{Constants.expoConfig?.version} · Dr. ACS College of Engineering, Bengaluru
      </Muted>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
});
