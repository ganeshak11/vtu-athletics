import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change to your backend host LAN IP or domain when testing on physical phone
const API_URL = 'http://10.0.2.2:5000'; // Standard Android emulator localhost alias, or http://localhost:5000

interface ScanRecord {
  clientScanUuid: string;
  athleteId: string;
  mode: 'accreditation' | 'accommodation';
  timestamp: string;
  hostelId?: string;
  roomAssigned?: string;
  cautionDeposit?: string;
}

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [mode, setMode] = useState<'accreditation' | 'accommodation'>('accreditation');
  
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<'accreditation_volunteer' | 'warden'>('accreditation_volunteer');
  const [pin, setPin] = useState('1234');
  const [staffName, setStaffName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Scanner state
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<ScanRecord[]>([]);
  const [torchOn, setTorchOn] = useState(false);

  // Hostel specific state
  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<string>('');
  const [roomAssigned, setRoomAssigned] = useState('Room 101');

  useEffect(() => {
    loadOfflineQueue();
  }, []);

  useEffect(() => {
    if (isLoggedIn && token) {
      syncOfflineQueue();
      if (mode === 'accommodation') {
        fetchHostels();
      }
    }
  }, [isLoggedIn, token, mode]);

  const loadOfflineQueue = async () => {
    try {
      const saved = await AsyncStorage.getItem('@vtu_mobile_queue');
      if (saved) setOfflineQueue(JSON.parse(saved));
    } catch (e) {}
  };

  const saveOfflineQueue = async (queue: ScanRecord[]) => {
    setOfflineQueue(queue);
    try {
      await AsyncStorage.setItem('@vtu_mobile_queue', JSON.stringify(queue));
    } catch (e) {}
  };

  const fetchHostels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/accommodation/hostels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHostels(data.hostels || []);
        if (data.hostels?.length > 0 && !selectedHostelId) {
          setSelectedHostelId(data.hostels[0].id);
        }
      }
    } catch (e) {}
  };

  const handlePinLogin = async () => {
    if (!pin) {
      Alert.alert('Error', 'Please enter your access PIN.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/staff/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: staffRole, pin }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        setStaffName(data.staff?.displayName || 'Volunteer');
        setIsLoggedIn(true);
        if (staffRole === 'warden') setMode('accommodation');
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid PIN');
      }
    } catch (err: any) {
      Alert.alert('Network Error', 'Could not connect to VTU API server at ' + API_URL);
    } finally {
      setLoading(false);
    }
  };

  const generateUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const processBarcodeScan = async (rawString: string) => {
    if (!isScanning || loading) return;
    setIsScanning(false);

    let athleteId = rawString.trim();
    try {
      if (rawString.includes('{')) {
        const parsed = JSON.parse(rawString);
        if (parsed.id) athleteId = parsed.id;
      }
    } catch (e) {}

    await sendScanRecord(athleteId);

    // Auto resume scanner after 2.5 seconds
    setTimeout(() => {
      setIsScanning(true);
    }, 2500);
  };

  const sendScanRecord = async (athleteId: string) => {
    const clientScanUuid = generateUuid();
    setLoading(true);

    const record: ScanRecord = {
      clientScanUuid,
      athleteId,
      mode,
      timestamp: new Date().toISOString(),
      hostelId: selectedHostelId,
      roomAssigned,
      cautionDeposit: '500.00',
    };

    try {
      let endpoint = `${API_URL}/api/accreditation/scan`;
      let body: any = {
        clientScanUuid,
        athleteId,
        deviceTimestamp: record.timestamp,
      };

      if (mode === 'accommodation') {
        endpoint = `${API_URL}/api/accommodation/checkin`;
        body = {
          clientScanUuid,
          athleteId,
          hostelId: selectedHostelId,
          roomAssigned,
          cautionDeposit: 500,
          cautionReceiptNo: `APP-${Date.now().toString().slice(-4)}`,
          deviceTimestamp: record.timestamp,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Scan Alert', data.error || 'Verification rejected');
        setLastScanResult({ error: data.error });
      } else {
        setLastScanResult(data.result);
      }
    } catch (e) {
      // Offline fallback: save to local queue
      const updated = [...offlineQueue, record];
      await saveOfflineQueue(updated);
      Alert.alert('Offline Mode', 'Network unavailable. Scan stored in offline queue and will sync automatically.');
      setLastScanResult({
        offline: true,
        athlete_id: athleteId,
        sslc_name: 'Queued Offline',
      });
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !token) return;

    const remaining = [...offlineQueue];
    for (let i = 0; i < offlineQueue.length; i++) {
      const item = offlineQueue[i];
      try {
        const endpoint =
          item.mode === 'accommodation'
            ? `${API_URL}/api/accommodation/checkin`
            : `${API_URL}/api/accreditation/scan`;

        const body =
          item.mode === 'accommodation'
            ? {
                clientScanUuid: item.clientScanUuid,
                athleteId: item.athleteId,
                hostelId: item.hostelId,
                roomAssigned: item.roomAssigned,
                cautionDeposit: 500,
                cautionReceiptNo: 'OFFLINE-SYNC',
                deviceTimestamp: item.timestamp,
              }
            : {
                clientScanUuid: item.clientScanUuid,
                athleteId: item.athleteId,
                deviceTimestamp: item.timestamp,
              };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          remaining.shift();
        }
      } catch (e) {
        break;
      }
    }

    await saveOfflineQueue(remaining);
  };

  // 1. PIN Login Screen
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.darkContainer}>
        <StatusBar style="light" />
        <View style={styles.loginCard}>
          <Text style={styles.loginIcon}>⚡</Text>
          <Text style={styles.loginTitle}>VTU SportsOS Scanner</Text>
          <Text style={styles.loginSubtitle}>Select scanner role and enter your staff PIN</Text>

          <View style={styles.rolePickerRow}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                staffRole === 'accreditation_volunteer' && styles.roleButtonActive,
              ]}
              onPress={() => setStaffRole('accreditation_volunteer')}
            >
              <Text style={styles.roleButtonText}>Gate Scanner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                staffRole === 'warden' && styles.roleButtonActive,
              ]}
              onPress={() => setStaffRole('warden')}
            >
              <Text style={styles.roleButtonText}>Hostel Warden</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.pinInput}
            placeholder="PIN (Default: 1234)"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            maxLength={6}
            secureTextEntry
            value={pin}
            onChangeText={setPin}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePinLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Unlock Scanner Camera →</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Camera Permission Screen
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.darkContainer}>
        <View style={styles.loginCard}>
          <Text style={styles.loginIcon}>📷</Text>
          <Text style={styles.loginTitle}>Camera Access Required</Text>
          <Text style={styles.loginSubtitle}>
            VTU SportsOS requires camera access to scan athlete QR code passes.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Scanner Camera & Operational View
  return (
    <SafeAreaView style={styles.darkContainer}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTag}>
            {mode === 'accreditation' ? 'ENTRY GATE ACCREDITATION' : 'HOSTEL CHECK-IN'}
          </Text>
          <Text style={styles.headerStaff}>{staffName}</Text>
        </View>

        <View style={styles.headerActions}>
          {offlineQueue.length > 0 && (
            <TouchableOpacity style={styles.queueBadge} onPress={syncOfflineQueue}>
              <Text style={styles.queueBadgeText}>Queue: {offlineQueue.length} 🔄</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setTorchOn(!torchOn)}
          >
            <Text style={styles.headerButtonText}>{torchOn ? '🔦 ON' : '🔦 OFF'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera Live View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          enableTorch={torchOn}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'code128', 'ean13'],
          }}
          onBarcodeScanned={
            isScanning
              ? ({ data }) => processBarcodeScan(data)
              : undefined
          }
        />

        {/* Viewfinder Target Box */}
        <View style={styles.viewfinderBox}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {!isScanning && (
          <View style={styles.scanningOverlay}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.scanningText}>Verifying pass with server...</Text>
          </View>
        )}
      </View>

      {/* Feedback & Result Card */}
      {lastScanResult && (
        <View
          style={[
            styles.resultCard,
            lastScanResult.error
              ? styles.resultError
              : lastScanResult.already_accredited || lastScanResult.already_checked_in
              ? styles.resultWarn
              : styles.resultSuccess,
          ]}
        >
          <Text style={styles.resultBadge}>
            {lastScanResult.error
              ? '❌ REJECTED'
              : lastScanResult.already_accredited
              ? '⚠️ ALREADY ACCREDITED'
              : lastScanResult.already_checked_in
              ? '⚠️ ALREADY CHECKED-IN'
              : '✅ VERIFIED ENTRY'}
          </Text>
          <Text style={styles.resultTitle}>
            CHEST #{lastScanResult.bid_number || '---'} • {lastScanResult.sslc_name}
          </Text>
          <Text style={styles.resultCollege}>
            {lastScanResult.college_name} ({lastScanResult.squad_code})
          </Text>
          {lastScanResult.room_assigned && (
            <Text style={styles.resultRoom}>
              Room: {lastScanResult.room_assigned} • Deposit: ₹{lastScanResult.caution_deposit}
            </Text>
          )}
        </View>
      )}

      {/* Manual Input Fallback */}
      <View style={styles.bottomBar}>
        <TextInput
          style={styles.manualInput}
          placeholder="Manual Athlete ID or USN..."
          placeholderTextColor="#94a3b8"
          value={manualInput}
          onChangeText={setManualInput}
        />
        <TouchableOpacity
          style={styles.manualSubmitButton}
          onPress={() => {
            if (manualInput) {
              sendScanRecord(manualInput.trim());
              setManualInput('');
            }
          }}
        >
          <Text style={styles.manualSubmitText}>Verify</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  darkContainer: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  loginCard: {
    margin: 24,
    marginTop: 80,
    padding: 24,
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
  },
  loginIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  roleButtonActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0369a1',
  },
  roleButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  pinInput: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    paddingVertical: 14,
    letterSpacing: 4,
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTag: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerStaff: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  queueBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  queueBadgeText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
  },
  headerButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderBox: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38bdf8',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  scanningOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  resultCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  resultSuccess: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  resultWarn: {
    backgroundColor: '#451a03',
    borderColor: '#f59e0b',
  },
  resultError: {
    backgroundColor: '#4c0519',
    borderColor: '#f43f5e',
  },
  resultBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  resultCollege: {
    fontSize: 13,
    color: '#cbd5e1',
    marginTop: 2,
  },
  resultRoom: {
    fontSize: 12,
    color: '#38bdf8',
    marginTop: 4,
    fontWeight: '700',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
  manualSubmitButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  manualSubmitText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
