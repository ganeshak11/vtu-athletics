import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { APP_VARIANT } from '@/lib/config';
import { useAthleteSession } from '@/lib/athlete-session';
import { colors } from '@/components/ui';

export default function Index() {
  const { status } = useAthleteSession();
  if (APP_VARIANT === 'officials') return <Redirect href="/officials" />;
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.blue} size="large" />
      </View>
    );
  }
  return <Redirect href={status === 'signedIn' ? '/pass' : '/login'} />;
}
