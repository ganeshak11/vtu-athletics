import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { router } from 'expo-router';
import { useAthleteSession } from '@/lib/athlete-session';
import { ApiError } from '@/lib/api';
import { MEET } from '@/lib/config';
import { toIsoDate } from '@/lib/format';
import { Button, Card, Muted, Screen, colors } from '@/components/ui';

export default function LoginScreen() {
  const { login } = useAthleteSession();
  const [bib, setBib] = useState('');
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mmRef = useRef<TextInputInstance>(null);
  const yyyyRef = useRef<TextInputInstance>(null);
  const ddRef = useRef<TextInputInstance>(null);

  async function submit() {
    setError(null);
    if (!/^\d{1,5}$/.test(bib.trim())) return setError('Enter your bib number (digits only).');
    const dob = toIsoDate(dd, mm, yyyy);
    if (!dob) return setError('Enter your date of birth as DD / MM / YYYY.');
    setLoading(true);
    try {
      await login({ bib: bib.trim(), dob });
      router.replace('/pass');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const digits = (v: string) => v.replace(/\D/g, '');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={s.hero}>
          <Text style={s.brand}>AURA ATHLETES</Text>
          <Text style={s.meet}>{MEET.name}</Text>
          <Text style={s.sub}>{MEET.subtitle}</Text>
          <Text style={s.sub}>{MEET.dates}</Text>
        </View>

        <Card style={{ gap: 14 }}>
          <View>
            <Text style={s.label} nativeID="bibLabel">Bib number</Text>
            <TextInput
              accessibilityLabelledBy="bibLabel"
              value={bib}
              onChangeText={(v) => setBib(digits(v).slice(0, 5))}
              keyboardType="number-pad"
              returnKeyType="next"
              onSubmitEditing={() => ddRef.current?.focus()}
              placeholder="e.g. 105"
              placeholderTextColor="#94a3b8"
              style={[s.input, s.bibInput]}
              maxLength={5}
            />
          </View>

          <View>
            <Text style={s.label} nativeID="dobLabel">Date of birth (as per SSLC)</Text>
            <View style={s.dobRow}>
              <TextInput
                ref={ddRef}
                accessibilityLabel="Day of birth"
                value={dd}
                onChangeText={(v) => {
                  const x = digits(v).slice(0, 2);
                  setDd(x);
                  if (x.length === 2) mmRef.current?.focus();
                }}
                keyboardType="number-pad"
                placeholder="DD"
                placeholderTextColor="#94a3b8"
                style={[s.input, s.dobBox]}
                maxLength={2}
              />
              <Text style={s.slash}>/</Text>
              <TextInput
                ref={mmRef}
                accessibilityLabel="Month of birth"
                value={mm}
                onChangeText={(v) => {
                  const x = digits(v).slice(0, 2);
                  setMm(x);
                  if (x.length === 2) yyyyRef.current?.focus();
                }}
                keyboardType="number-pad"
                placeholder="MM"
                placeholderTextColor="#94a3b8"
                style={[s.input, s.dobBox]}
                maxLength={2}
              />
              <Text style={s.slash}>/</Text>
              <TextInput
                ref={yyyyRef}
                accessibilityLabel="Year of birth"
                value={yyyy}
                onChangeText={(v) => setYyyy(digits(v).slice(0, 4))}
                keyboardType="number-pad"
                placeholder="YYYY"
                placeholderTextColor="#94a3b8"
                style={[s.input, s.dobBox, { flex: 1.6 }]}
                maxLength={4}
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            </View>
          </View>

          {error && (
            <View style={s.error} accessibilityRole="alert">
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Button title="Log in" onPress={submit} loading={loading} />
        </Card>

        <View style={s.orRow}>
          <View style={s.line} />
          <Text style={s.or}>or</Text>
          <View style={s.line} />
        </View>

        <Button title="📷  Scan the QR on my ID card" variant="secondary" onPress={() => router.push('/scan')} />

        <Muted style={{ textAlign: 'center', marginTop: 4 }}>
          Your bib number is printed on your ID card. If your date of birth is not accepted, ask your college PED to check it on the registration portal.
        </Muted>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.navy, borderRadius: 20, padding: 22, gap: 4 },
  brand: { color: colors.gold, fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  meet: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 4 },
  sub: { color: '#c7d2fe', fontSize: 13 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    fontSize: 18,
    color: colors.text,
    backgroundColor: '#f8fafc',
  },
  bibInput: { fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  dobRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dobBox: { flex: 1, textAlign: 'center', fontWeight: '700' },
  slash: { fontSize: 20, color: colors.muted },
  error: { backgroundColor: colors.redSoft, borderRadius: 10, padding: 12 },
  errorText: { color: colors.red, fontWeight: '600', lineHeight: 20 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.muted, fontWeight: '600' },
});
