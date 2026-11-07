import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAthleteSession } from '@/lib/athlete-session';
import { ApiError } from '@/lib/api';
import { Button, Muted, Screen, Title, colors } from '@/components/ui';

/** Log in by scanning the signed QR (AURA26.<id>.<sig>) printed on the athlete's own ID card */
export default function ScanLogin() {
  const { login } = useAthleteSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  async function onScanned(data: string) {
    if (handled.current) return;
    handled.current = true;
    if (!/^AURA26\./.test(data)) {
      setMessage('That is not an AURA athlete ID card. Scan the QR code printed on your own ID card.');
      setTimeout(() => (handled.current = false), 1500);
      return;
    }
    setBusy(true);
    setMessage('Logging in…');
    try {
      await login({ qrToken: data });
      router.dismissAll();
      router.replace('/pass');
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Could not log in. Please try again.');
      setBusy(false);
      setTimeout(() => (handled.current = false), 1500);
    }
  }

  if (!permission) return <Screen scroll={false}>{null}</Screen>;

  if (!permission.granted) {
    return (
      <Screen>
        <Title>Camera access needed</Title>
        <Muted>AURA Athletes uses the camera only to read the QR code on your ID card.</Muted>
        <Button title="Allow camera" onPress={requestPermission} />
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : ({ data }) => onScanned(data)}
      />
      <View style={s.overlay} pointerEvents="box-none">
        <Text style={s.heading}>Scan your ID card</Text>
        <View style={s.frame} />
        <Text style={s.hint}>{message || 'Point the camera at the QR code on your AURA ID card.'}</Text>
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 64, paddingBottom: 40 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '800' },
  frame: { width: 240, height: 240, borderWidth: 3, borderColor: colors.gold, borderRadius: 24 },
  hint: { color: '#fff', fontSize: 15, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 12, borderRadius: 12, overflow: 'hidden' },
});
