import React from 'react';
import { Text } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useAthleteSession } from '@/lib/athlete-session';
import { colors } from '@/components/ui';

const icon = (glyph: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>
);

export default function TabsLayout() {
  const { status } = useAthleteSession();
  if (status === 'signedOut') return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="pass" options={{ title: 'My Pass', tabBarIcon: icon('🪪') }} />
      <Tabs.Screen name="events" options={{ title: 'My Events', tabBarIcon: icon('🏃') }} />
      <Tabs.Screen name="stay" options={{ title: 'Stay & Meals', tabBarIcon: icon('🏨') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
