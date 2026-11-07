import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAthleteSession } from '@/lib/athlete-session';
import { fmtTime } from '@/lib/format';
import { Card, Muted, OfflineBanner, Pill, Screen, Title, colors } from '@/components/ui';

const MEALS: { key: string; label: string }[] = [
  { key: 'BREAKFAST', label: 'Breakfast' },
  { key: 'LUNCH', label: 'Lunch' },
  { key: 'SNACKS', label: 'Snacks' },
  { key: 'DINNER', label: 'Dinner' },
];

export default function StayScreen() {
  const { me, refreshing, refresh, offline, lastSyncedAt } = useAthleteSession();
  const hostel = me?.hostel;
  const claimed = new Map((me?.meals.claimed || []).map((m) => [m.mealType, m.at]));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <OfflineBanner offline={offline} lastSyncedAt={lastSyncedAt} />
      <Title>Stay & Meals</Title>

      <Card style={{ gap: 8 }}>
        <Text style={s.cardTitle}>🏨 Accommodation</Text>
        {hostel ? (
          <>
            <Text style={s.big}>{hostel.name || 'Hostel allotted'}</Text>
            <Muted>{hostel.room || hostel.roomRange || 'Room details at the hostel desk'}</Muted>
            {!!hostel.notes && <Muted>{hostel.notes}</Muted>}
            <Pill
              label={hostel.checkedIn ? `✓ Checked in${hostel.checkedInAt ? ` at ${fmtTime(hostel.checkedInAt)}` : ''}` : 'Not checked in yet — show your pass to the warden'}
              tone={hostel.checkedIn ? 'green' : 'amber'}
            />
          </>
        ) : (
          <Muted>Accommodation has not been allotted to your college yet. Your team manager will be informed.</Muted>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.cardTitle}>🍽️ Today's meals</Text>
        <Muted>Show your pass QR at the dining hall. Each meal can be claimed once per day.</Muted>
        <View style={s.grid}>
          {MEALS.map((m) => {
            const at = claimed.get(m.key);
            return (
              <View key={m.key} style={[s.meal, at ? s.mealDone : null]}>
                <Text style={s.mealName}>{m.label}</Text>
                <Text style={[s.mealState, { color: at ? colors.green : colors.muted }]}>{at ? `✓ ${fmtTime(at)}` : 'Not claimed'}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  big: { fontSize: 20, fontWeight: '800', color: colors.navy },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  meal: { width: '47%', flexGrow: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, backgroundColor: '#f8fafc' },
  mealDone: { backgroundColor: colors.greenSoft, borderColor: '#a7f3d0' },
  mealName: { fontSize: 15, fontWeight: '800', color: colors.text },
  mealState: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
