import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  navy: '#0b1f4b',
  blue: '#1d4ed8',
  blueSoft: '#e0e9ff',
  gold: '#f5b301',
  bg: '#f3f5fa',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  green: '#059669',
  greenSoft: '#d1fae5',
  amber: '#b45309',
  amberSoft: '#fef3c7',
  red: '#dc2626',
  redSoft: '#fee2e2',
};

export function Screen({
  children,
  refreshing,
  onRefresh,
  scroll = true,
  edges = ['top'],
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.blue} /> : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]} accessibilityRole="header">{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'grey';
const toneMap: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: colors.blueSoft, fg: colors.blue },
  green: { bg: colors.greenSoft, fg: colors.green },
  amber: { bg: colors.amberSoft, fg: colors.amber },
  red: { bg: colors.redSoft, fg: colors.red },
  grey: { bg: '#eef2f7', fg: colors.muted },
};

export function Pill({ label, tone = 'grey' }: { label: string; tone?: Tone }) {
  const t = toneMap[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const bg = variant === 'primary' ? colors.blue : variant === 'danger' ? colors.redSoft : colors.card;
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? colors.red : colors.blue;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'secondary' ? colors.border : bg, opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function OfflineBanner({ offline, lastSyncedAt }: { offline: boolean; lastSyncedAt: number | null }) {
  if (!offline) return null;
  const mins = lastSyncedAt ? Math.max(0, Math.round((Date.now() - lastSyncedAt) / 60000)) : null;
  return (
    <View style={styles.offline} accessibilityRole="alert">
      <Text style={styles.offlineText}>
        📶 Offline — showing saved info{mins !== null ? ` from ${mins < 1 ? 'just now' : `${mins} min ago`}` : ''}. Reminders still work.
      </Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 32, gap: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },
  button: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  offline: { backgroundColor: colors.amberSoft, borderRadius: 12, padding: 12 },
  offlineText: { color: colors.amber, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
