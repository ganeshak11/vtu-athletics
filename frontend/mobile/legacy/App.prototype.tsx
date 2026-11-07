import React, { useState, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

type StaffRole = 'accreditation_volunteer' | 'warden' | 'food_volunteer';
type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';

export default function App() {
  const [appRole, setAppRole] = useState<'athlete' | 'staff'>('athlete');

  // =========================================================================
  // ATHLETE PORTAL STATE
  // =========================================================================
  const [athleteInput, setAthleteInput] = useState('');
  const [athleteToken, setAthleteToken] = useState<string | null>(null);
  const [athleteData, setAthleteData] = useState<any | null>(null);
  const [athleteLoading, setAthleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pass' | 'schedule' | 'results' | 'meals'>('pass');

  // =========================================================================
  // STAFF SCANNER STATE
  // =========================================================================
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [staffRole, setStaffRole] = useState<StaffRole>('food_volunteer');
  const [activeMeal, setActiveMeal] = useState<MealType>('LUNCH');
  const [staffToken, setStaffToken] = useState<string | null>(null);
  const [pin, setPin] = useState('1234');
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    loadSavedAthleteSession();
  }, []);

  const loadSavedAthleteSession = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('@vtu_athlete_token');
      if (savedToken) {
        setAthleteToken(savedToken);
        fetchAthleteDetails(savedToken);
      }
    } catch (e) {
      console.warn('Failed to load saved athlete session', e);
    }
  };

  // =========================================================================
  // ATHLETE ACTIONS
  // =========================================================================
  const handleAthleteLogin = async () => {
    if (!athleteInput.trim()) {
      Alert.alert('Required', 'Please enter your USN (e.g. 1BM22IS073) or Chest/Bib Number (e.g. 101).');
      return;
    }

    setAthleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/athlete/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: athleteInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Login Failed', data.error || 'Could not verify athlete.');
        return;
      }

      setAthleteToken(data.token);
      await AsyncStorage.setItem('@vtu_athlete_token', data.token);
      await fetchAthleteDetails(data.token);
    } catch (err: any) {
      Alert.alert('Connection Error', `Could not reach server at ${API_URL}: ${err.message}`);
    } finally {
      setAthleteLoading(false);
    }
  };

  const fetchAthleteDetails = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/athlete/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAthleteData(data);
      }
    } catch (err) {
      console.warn('Error fetching athlete profile:', err);
    }
  };

  const handleAthleteLogout = async () => {
    setAthleteToken(null);
    setAthleteData(null);
    await AsyncStorage.removeItem('@vtu_athlete_token');
  };

  // =========================================================================
  // STAFF ACTIONS
  // =========================================================================
  const handleStaffLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/staff/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, role: staffRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Login Failed', data.error || 'Invalid PIN');
        return;
      }
      setStaffToken(data.token);
      setIsStaffLoggedIn(true);
    } catch (err: any) {
      Alert.alert('Network Error', err.message);
    }
  };

  const handleProcessScan = async (rawCode: string) => {
    setIsScanning(false);
    let athleteId = rawCode.trim();
    if (athleteId.startsWith('vtu-athlete:')) {
      athleteId = athleteId.replace('vtu-athlete:', '');
    }

    setScannerLoading(true);
    try {
      let endpoint = '/api/accreditation/scan';
      let body: any = { athleteId, clientScanUuid: Date.now().toString() };

      if (staffRole === 'warden') {
        endpoint = '/api/accommodation/checkin';
        body = { athleteId, hostelId: 'default', roomAssigned: 'Room 101', cautionDepositCollected: 500 };
      } else if (staffRole === 'food_volunteer') {
        endpoint = '/api/catering/scan';
        body = { athleteId, mealType: activeMeal, clientScanUuid: `scan-${Date.now()}` };
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setLastScanResult({ success: res.ok && data.success !== false, data });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setScannerLoading(false);
    }
  };

  // =========================================================================
  // RENDER: ATHLETE PORTAL VIEW
  // =========================================================================
  if (appRole === 'athlete') {
    if (!athleteToken || !athleteData) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>VTU SportsOS</Text>
            <TouchableOpacity onPress={() => setAppRole('staff')} style={styles.switchButton}>
              <Text style={styles.switchButtonText}>Staff Scanner ➔</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.badgeLabel}>ATHLETE PASS & MEAL CARD</Text>
            <Text style={styles.welcomeText}>Welcome, Athlete!</Text>
            <Text style={styles.helperText}>
              Enter your USN or Chest/Bib number to access your Digital ID, gate accreditation QR, meal coupons, and live event alerts.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. 1BM22IS073 or 101"
              placeholderTextColor="#888"
              value={athleteInput}
              onChangeText={setAthleteInput}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[styles.primaryButton, athleteLoading && { opacity: 0.6 }]}
              onPress={handleAthleteLogin}
              disabled={athleteLoading}
            >
              {athleteLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Access My Athlete Pass</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    const { athlete, events, heatAssignments, notifications, todayMeals } = athleteData;
    const hasUrgentNotification = notifications?.some((n: any) => n.type === 'URGENT');

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{athlete.name}</Text>
            <Text style={styles.headerSubtitle}>
              {athlete.college?.code || 'VTU'} • Chest #{athlete.bidNumber || 'Pending'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => fetchAthleteDetails(athleteToken)} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAthleteLogout} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {hasUrgentNotification && (
          <View style={styles.urgentBanner}>
            <Text style={styles.urgentBannerTitle}>🚨 CALL ROOM ALERT</Text>
            <Text style={styles.urgentBannerText}>
              {notifications.find((n: any) => n.type === 'URGENT')?.message}
            </Text>
          </View>
        )}

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'pass' && styles.tabItemActive]}
            onPress={() => setActiveTab('pass')}
          >
            <Text style={[styles.tabItemText, activeTab === 'pass' && styles.tabItemTextActive]}>🪪 ID Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'meals' && styles.tabItemActive]}
            onPress={() => setActiveTab('meals')}
          >
            <Text style={[styles.tabItemText, activeTab === 'meals' && styles.tabItemTextActive]}>🍽️ Meals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'schedule' && styles.tabItemActive]}
            onPress={() => setActiveTab('schedule')}
          >
            <Text style={[styles.tabItemText, activeTab === 'schedule' && styles.tabItemTextActive]}>
              📅 Heats ({heatAssignments?.length || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'results' && styles.tabItemActive]}
            onPress={() => setActiveTab('results')}
          >
            <Text style={[styles.tabItemText, activeTab === 'results' && styles.tabItemTextActive]}>🏆 Results</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* TAB 1: PASS */}
          {activeTab === 'pass' && (
            <View style={styles.card}>
              <View style={styles.passHeader}>
                <Text style={styles.passCollege}>{athlete.college?.name}</Text>
                <View style={[
                  styles.statusPill,
                  athlete.accreditationStatus === 'ACCREDITED' ? styles.statusGreen : styles.statusYellow
                ]}>
                  <Text style={styles.statusPillText}>{athlete.accreditationStatus}</Text>
                </View>
              </View>

              <View style={styles.qrContainer}>
                <QRCode
                  value={athlete.qrPayload || `vtu-athlete:${athlete.id}`}
                  size={200}
                  color="#000"
                  backgroundColor="#fff"
                />
                <Text style={styles.qrInstruction}>
                  Show this QR code at Stadium Gate, Hostel Desk & Mess Food Counters.
                </Text>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>CHEST NUMBER</Text>
                  <Text style={styles.detailValueLarge}>#{athlete.bidNumber || 'TBD'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>USN</Text>
                  <Text style={styles.detailValue}>{athlete.usn}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>BLOOD GROUP</Text>
                  <Text style={styles.detailValue}>{athlete.bloodGroup || 'O+'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>EVENTS REGISTERED</Text>
                  <Text style={styles.detailValue}>{events?.length || 0} Events</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: MEALS STATUS */}
          {activeTab === 'meals' && (
            <View>
              <Text style={styles.sectionHeading}>Today's Meal Coupon Card</Text>
              <Text style={styles.helperText}>
                Present your QR code at the catering mess counter. Food volunteers will scan it to verify and dispense your plate.
              </Text>

              <View style={styles.mealCard}>
                <View style={styles.mealRow}>
                  <Text style={styles.mealTitle}>☕ Breakfast (7:00 AM - 9:30 AM)</Text>
                  <View style={[styles.mealStatusPill, todayMeals?.breakfast ? styles.mealServed : styles.mealPending]}>
                    <Text style={styles.mealStatusText}>{todayMeals?.breakfast ? '✓ CLAIMED' : 'PENDING'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.mealCard}>
                <View style={styles.mealRow}>
                  <Text style={styles.mealTitle}>🍛 Lunch (12:30 PM - 3:00 PM)</Text>
                  <View style={[styles.mealStatusPill, todayMeals?.lunch ? styles.mealServed : styles.mealPending]}>
                    <Text style={styles.mealStatusText}>{todayMeals?.lunch ? '✓ CLAIMED' : 'PENDING'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.mealCard}>
                <View style={styles.mealRow}>
                  <Text style={styles.mealTitle}>🍪 High Tea / Snacks (4:30 PM - 5:30 PM)</Text>
                  <View style={[styles.mealStatusPill, todayMeals?.snacks ? styles.mealServed : styles.mealPending]}>
                    <Text style={styles.mealStatusText}>{todayMeals?.snacks ? '✓ CLAIMED' : 'PENDING'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.mealCard}>
                <View style={styles.mealRow}>
                  <Text style={styles.mealTitle}>🍲 Dinner (7:30 PM - 10:00 PM)</Text>
                  <View style={[styles.mealStatusPill, todayMeals?.dinner ? styles.mealServed : styles.mealPending]}>
                    <Text style={styles.mealStatusText}>{todayMeals?.dinner ? '✓ CLAIMED' : 'PENDING'}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB 3: SCHEDULE */}
          {activeTab === 'schedule' && (
            <View>
              <Text style={styles.sectionHeading}>My Event Schedule & Lane Draw</Text>
              {heatAssignments?.map((ha: any, idx: number) => {
                const heat = ha.heats;
                return (
                  <View key={idx} style={styles.heatCard}>
                    <View style={styles.heatHeaderRow}>
                      <Text style={styles.heatEventTitle}>{heat?.events?.name}</Text>
                      <View style={styles.heatStageBadge}>
                        <Text style={styles.heatStageText}>{heat?.stage}</Text>
                      </View>
                    </View>
                    <Text style={styles.laneHighlight}>Heat #{heat?.heat_number} • Lane/Order #{ha.lane_number}</Text>
                    <Text style={styles.heatStatusText}>Status: {heat?.status}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* TAB 4: RESULTS */}
          {activeTab === 'results' && (
            <View>
              <Text style={styles.sectionHeading}>My Recorded Times & Marks</Text>
              {heatAssignments?.map((ha: any, idx: number) => {
                const tr = ha.track_results;
                const vja = ha.vertical_jump_attempts;
                return (
                  <View key={idx} style={styles.heatCard}>
                    <Text style={styles.heatEventTitle}>{ha.heats?.events?.name}</Text>
                    {tr && (
                      <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Track Official Time:</Text>
                        <Text style={styles.resultValue}>{tr.time_seconds}s</Text>
                      </View>
                    )}
                    {vja && vja.length > 0 && (
                      <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>High Jump Attempts:</Text>
                        <Text style={styles.attemptsList}>
                          {vja.map((a: any) => `${a.bar_height_meters}m: ${a.result}`).join(' | ')}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // RENDER: STAFF SCANNER VIEW (GATE, HOSTEL & MESS VOLUNTEERS)
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff Scanner Hub</Text>
        <TouchableOpacity onPress={() => setAppRole('athlete')} style={styles.switchButton}>
          <Text style={styles.switchButtonText}>Athlete Pass ➔</Text>
        </TouchableOpacity>
      </View>

      {!isStaffLoggedIn ? (
        <View style={styles.loginCard}>
          <Text style={styles.badgeLabel}>OFFICIAL STAFF ACCESS</Text>
          <Text style={styles.welcomeText}>Volunteer Scanner Desk</Text>

          <View style={styles.roleToggleRow}>
            <TouchableOpacity
              style={[styles.roleTab, staffRole === 'food_volunteer' && styles.roleTabActive]}
              onPress={() => setStaffRole('food_volunteer')}
            >
              <Text style={styles.roleTabText}>🍽️ Mess Counter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleTab, staffRole === 'accreditation_volunteer' && styles.roleTabActive]}
              onPress={() => setStaffRole('accreditation_volunteer')}
            >
              <Text style={styles.roleTabText}>Gate Scanner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleTab, staffRole === 'warden' && styles.roleTabActive]}
              onPress={() => setStaffRole('warden')}
            >
              <Text style={styles.roleTabText}>Hostel Warden</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Volunteer PIN (default: 1234)"
            placeholderTextColor="#888"
            secureTextEntry
            keyboardType="numeric"
            value={pin}
            onChangeText={setPin}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleStaffLogin}>
            <Text style={styles.primaryButtonText}>Unlock Camera Scanner</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          {/* Active Meal Switcher for Mess Volunteers */}
          {staffRole === 'food_volunteer' && (
            <View style={styles.mealSwitcherRow}>
              {(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] as MealType[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.mealSwitchBtn, activeMeal === m && styles.mealSwitchBtnActive]}
                  onPress={() => setActiveMeal(m)}
                >
                  <Text style={[styles.mealSwitchText, activeMeal === m && styles.mealSwitchTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchOn}
              onBarcodeScanned={isScanning ? ({ data }) => handleProcessScan(data) : undefined}
            />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Camera permission required.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
                <Text style={styles.primaryButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Scan Result Overlay Modal/Banner */}
          {lastScanResult && (
            <View style={[styles.resultBanner, lastScanResult.success ? styles.bannerGreen : styles.bannerRed]}>
              <Text style={styles.bannerTitle}>
                {lastScanResult.success ? 'MEAL GRANTED ✓' : 'DUPLICATE BLOCKED ⚠️'}
              </Text>
              <Text style={styles.bannerMessage}>
                {lastScanResult.data?.athlete_name || 'Athlete'} (#{lastScanResult.data?.bid_number || '---'})
              </Text>
              <Text style={styles.bannerSub}>
                {lastScanResult.data?.college_name || ''}
              </Text>
              <Text style={styles.bannerDetail}>
                {lastScanResult.data?.message}
              </Text>

              <TouchableOpacity style={styles.nextAthleteBtn} onPress={() => { setLastScanResult(null); setIsScanning(true); }}>
                <Text style={styles.nextAthleteBtnText}>Scan Next Plate ➔</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerHint}>
              {staffRole === 'food_volunteer' ? `Scanning for: ${activeMeal}` : 'Point camera at Athlete QR Code'}
            </Text>
            <View style={styles.scannerActions}>
              <TouchableOpacity style={styles.actionPill} onPress={() => setTorchOn(!torchOn)}>
                <Text style={styles.actionPillText}>{torchOn ? 'Flash OFF' : 'Flash ON'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPill} onPress={() => { setLastScanResult(null); setIsScanning(true); }}>
                <Text style={styles.actionPillText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a233a',
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  switchButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  iconButton: {
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 8,
  },
  iconButtonText: {
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  loginCard: {
    margin: 20,
    backgroundColor: '#0f172a',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  badgeLabel: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  helperText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  urgentBanner: {
    backgroundColor: '#ef4444',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
  },
  urgentBannerTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  urgentBannerText: {
    color: '#ffffff',
    fontSize: 13,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingHorizontal: 8,
    marginTop: 10,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#38bdf8',
  },
  tabItemText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: '#38bdf8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  passCollege: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusYellow: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  statusPillText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: 'bold',
  },
  qrContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  qrInstruction: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 16,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  detailValueLarge: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 4,
  },
  mealCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  mealStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mealServed: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  mealPending: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
  },
  mealStatusText: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontSize: 12,
  },
  heatCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  heatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heatEventTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  heatStageBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heatStageText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  laneHighlight: {
    color: '#facc15',
    fontWeight: '600',
    fontSize: 14,
    marginTop: 6,
  },
  heatStatusText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  resultBox: {
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  resultLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  resultValue: {
    color: '#38bdf8',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  attemptsList: {
    color: '#ffffff',
    fontSize: 13,
    marginTop: 4,
  },
  cameraContainer: {
    flex: 1,
  },
  mealSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    padding: 8,
    gap: 6,
    zIndex: 10,
  },
  mealSwitchBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    alignItems: 'center',
  },
  mealSwitchBtnActive: {
    backgroundColor: '#2563eb',
  },
  mealSwitchText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mealSwitchTextActive: {
    color: '#ffffff',
  },
  resultBanner: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  bannerGreen: {
    backgroundColor: '#15803d',
  },
  bannerRed: {
    backgroundColor: '#b91c1c',
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bannerMessage: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  bannerDetail: {
    color: '#ffffff',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  nextAthleteBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 14,
  },
  nextAthleteBtnText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  scannerHint: {
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 13,
    marginBottom: 16,
  },
  scannerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionPill: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  actionPillText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  roleToggleRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderRadius: 8,
  },
  roleTabActive: {
    backgroundColor: '#2563eb',
  },
  roleTabText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    margin: 20,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 12,
  },
});
