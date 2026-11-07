import React from 'react';
import { Text } from 'react-native';
import { Screen, Card, Title, Muted } from '@/components/ui';

/** AURA Officials — scanner modes (food, warden, call room, accreditation, referees) come next. */
export default function OfficialsHome() {
  return (
    <Screen>
      <Title>AURA Officials</Title>
      <Card>
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Coming next</Text>
        <Muted>Scanner modes for food volunteers, wardens, call room officials, the accreditation desk and referees — with offline scanning and later sync — are being built after AURA Athletes.</Muted>
      </Card>
    </Screen>
  );
}
