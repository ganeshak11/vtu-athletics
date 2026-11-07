/**
 * Athlete session: auth token (SecureStore), cached profile (AsyncStorage, so the pass and
 * schedule open with no internet), background refresh, reminder + push sync.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Platform } from 'react-native';
import * as SecureStoreNative from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError } from './api';
import { syncReminders } from './reminders';
import { registerPushToken, unregisterPushToken } from './push';
import type { AthleteMe } from './types';

const TOKEN_KEY = 'aura_athlete_token';

/** SecureStore on phones; web preview (no SecureStore) falls back to AsyncStorage */
const SecureStore =
  Platform.OS === 'web'
    ? {
        getItemAsync: (k: string) => AsyncStorage.getItem(k),
        setItemAsync: (k: string, v: string) => AsyncStorage.setItem(k, v),
        deleteItemAsync: (k: string) => AsyncStorage.removeItem(k),
      }
    : SecureStoreNative;
const CACHE_KEY = '@aura/athlete-me';
const REFRESH_EVERY_MS = 5 * 60 * 1000;

type Status = 'loading' | 'signedOut' | 'signedIn';
export type LoginInput = { bib: string; dob: string } | { qrToken: string };

type Ctx = {
  status: Status;
  me: AthleteMe | null;
  lastSyncedAt: number | null;
  refreshing: boolean;
  offline: boolean;
  remindersScheduled: number | null;
  login: (input: LoginInput) => Promise<void>;
  refresh: () => Promise<void>;
  resyncReminders: () => Promise<number>;
  logout: () => Promise<void>;
};

const AthleteSessionContext = createContext<Ctx | null>(null);

export function AthleteSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<AthleteMe | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [remindersScheduled, setRemindersScheduled] = useState<number | null>(null);
  const tokenRef = useRef<string | null>(null);
  const inFlight = useRef(false);

  const clearLocal = useCallback(async () => {
    tokenRef.current = null;
    setToken(null);
    setMe(null);
    setLastSyncedAt(null);
    setRemindersScheduled(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
      AsyncStorage.removeItem(CACHE_KEY).catch(() => {}),
      syncReminders([]).catch(() => 0),
    ]);
    setStatus('signedOut');
  }, []);

  const applyProfile = useCallback(async (data: AthleteMe) => {
    setMe(data);
    const at = Date.now();
    setLastSyncedAt(at);
    setOffline(false);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data, at })).catch(() => {});
    try {
      setRemindersScheduled(await syncReminders(data.schedule));
    } catch {
      // keep previous reminders
    }
  }, []);

  const fetchProfile = useCallback(
    async (authToken: string) => {
      const data = await api<AthleteMe>('/athlete/me', { token: authToken });
      await applyProfile(data);
      return data;
    },
    [applyProfile]
  );

  const refresh = useCallback(async () => {
    const t = tokenRef.current;
    if (!t || inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      await fetchProfile(t);
      registerPushToken(t);
    } catch (e) {
      if (e instanceof ApiError && e.offline) setOffline(true);
      else if (e instanceof ApiError && (e.status === 401 || e.status === 403 || e.status === 404)) await clearLocal();
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [fetchProfile, clearLocal]);

  // Restore session on launch: show cached data immediately, then refresh
  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (!saved) {
        setStatus('signedOut');
        return;
      }
      tokenRef.current = saved;
      setToken(saved);
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, at } = JSON.parse(raw);
          setMe(data);
          setLastSyncedAt(at);
        }
      } catch {
        // ignore bad cache
      }
      setStatus('signedIn');
      refresh();
    })();
  }, [refresh]);

  // Refresh when the app returns to the foreground and every few minutes while open
  useEffect(() => {
    if (!token) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, REFRESH_EVERY_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [token, refresh]);

  const login = useCallback(
    async (input: LoginInput) => {
      const res = await api<{ token: string }>('/athlete/login', { method: 'POST', body: input });
      await SecureStore.setItemAsync(TOKEN_KEY, res.token);
      tokenRef.current = res.token;
      setToken(res.token);
      await fetchProfile(res.token);
      setStatus('signedIn');
      registerPushToken(res.token);
    },
    [fetchProfile]
  );

  const logout = useCallback(async () => {
    const t = tokenRef.current;
    if (t) await unregisterPushToken(t);
    await clearLocal();
  }, [clearLocal]);

  const resyncReminders = useCallback(async () => {
    const n = await syncReminders(me?.schedule || []);
    setRemindersScheduled(n);
    if (tokenRef.current) registerPushToken(tokenRef.current);
    return n;
  }, [me]);

  const value = useMemo(
    () => ({ status, me, lastSyncedAt, refreshing, offline, remindersScheduled, login, refresh, resyncReminders, logout }),
    [status, me, lastSyncedAt, refreshing, offline, remindersScheduled, login, refresh, resyncReminders, logout]
  );
  return <AthleteSessionContext.Provider value={value}>{children}</AthleteSessionContext.Provider>;
}

export function useAthleteSession(): Ctx {
  const ctx = useContext(AthleteSessionContext);
  if (!ctx) throw new Error('useAthleteSession must be used inside AthleteSessionProvider');
  return ctx;
}
