import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useAthleteSession } from '@/lib/athlete-session';
import { fmtDay, fmtTime, minutesUntil, stageLabel } from '@/lib/format';
import { isRemindable } from '@/lib/reminders';
import { Card, Muted, OfflineBanner, Pill, Screen, colors } from '@/components/ui';

export default function PassScreen() {
  const { me, refreshing, refresh, offline, lastSyncedAt } = useAthleteSession();
  if (!me) {
    return (
      <Screen>
        <Muted>Loading your pass…</Muted>
      </Screen>
    );
  }
  const a = me.athlete;
  const accredited = a.accreditationStatus === 'ACCREDITED';
  const next = me.schedule.find((e) => isRemindable(e) && e.callRoomAt && new Date(e.callRoomAt).getTime() > Date.now() - 30 * 60000);
  const mins = next ? minutesUntil(next.callRoomAt) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <OfflineBanner offline={offline} lastSyncedAt={lastSyncedAt} />

      <View style={s.badge}>
        <View style={s.badgeTop}>
          <Text style={s.badgeBrand}>DR. ACS-AURA 2026</Text>
          <Text style={s.badgeSub}>28th VTU State Athletic Meet</Text>
        </View>
        <View style={s.identity}>
          {a.photoUrl ? (
            <Image source={{ uri: a.photoUrl }} style={s.photo} accessibilityLabel={`Photo of ${a.name}`} />
          ) : (
            <View style={[s.photo, s.photoEmpty]}>
              <Text style={{ fontSize: 34, fontWeight: '800', color: colors.blue }}>{a.name.charAt(0)}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.bibLabel}>BIB</Text>
            <Text style={s.bib} accessibilityLabel={`Bib number ${a.bibNumber ?? 'not assigned'}`}>{a.bibNumber ?? '—'}</Text>
            <Pill label={accredited ? '✓ Accredited' : 'Not yet accredited'} tone={accredited ? 'green' : 'amber'} />
          </View>
        </View>
        <Text style={s.name}>{a.name}</Text>
        <Text style={s.college}>{a.college?.name}</Text>
        <View style={s.metaRow}>
          <Meta label="USN" value={a.usn} />
          <Meta label="Division" value={a.gender === 'women' ? 'Women' : 'Men'} />
          <Meta label="Blood" value={a.bloodGroup || '—'} />
        </View>
      </View>

      {next && (
        <Card style={{ borderColor: colors.blue, borderWidth: 2, gap: 6 }}>
          <Text style={s.nextLabel}>NEXT CALL ROOM</Text>
          <Text style={s.nextEvent}>{next.eventName}</Text>
          <Muted>
            {[stageLabel(next.stage), next.heatNumber ? `Heat ${next.heatNumber}` : '', next.lane ? `Lane ${next.lane}` : ''].filter(Boolean).join(' · ') || 'Heat to be announced'}
          </Muted>
          <Text style={s.nextTime}>
            {fmtDay(next.callRoomAt)} · Report by {fmtTime(next.callRoomAt)}
            {next.callRoomEstimated ? ' (approx.)' : ''}
          </Text>
          {mins !== null && (
            <Pill label={mins > 0 ? `in ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`}` : 'Call room time now'} tone={mins <= 10 ? 'red' : mins <= 30 ? 'amber' : 'blue'} />
          )}
          <Text style={s.link} onPress={() => router.push('/events')}>See all my events →</Text>
        </Card>
      )}

      <Card style={{ alignItems: 'center', gap: 10 }}>
        <Text style={s.qrTitle}>Show this to officials</Text>
        <View style={s.qrWrap}>
          <QRCode value={a.qrToken} size={210} ecl="M" />
        </View>
        <Muted style={{ textAlign: 'center' }}>Meals, hostel and call room scan this code. Your printed ID card has the same code.</Muted>
      </Card>
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { backgroundColor: colors.navy, borderRadius: 20, padding: 18, gap: 8 },
  badgeTop: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', paddingBottom: 10, marginBottom: 4 },
  badgeBrand: { color: colors.gold, fontWeight: '900', letterSpacing: 1.5, fontSize: 13 },
  badgeSub: { color: '#c7d2fe', fontSize: 12 },
  identity: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  photo: { width: 96, height: 120, borderRadius: 12, backgroundColor: '#fff' },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  bibLabel: { color: '#c7d2fe', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  bib: { color: '#fff', fontSize: 54, fontWeight: '900', lineHeight: 58 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  college: { color: '#c7d2fe', fontSize: 14 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  metaLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  metaValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  nextLabel: { color: colors.blue, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  nextEvent: { fontSize: 20, fontWeight: '800', color: colors.text },
  nextTime: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { color: colors.blue, fontWeight: '700', marginTop: 4 },
  qrTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  qrWrap: { padding: 14, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border },
});
