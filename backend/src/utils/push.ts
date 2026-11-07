/**
 * Server → phone push notifications through the Expo Push Service.
 * Tokens are registered by the AURA apps in `device_push_tokens` (migration 0021).
 * Sending is best-effort and never blocks or fails the API request that triggered it.
 */
import { supabase } from '../config/supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;

type PushMessage = {
  title: string;
  body: string;
  /** `kind` other than 'call-room-reminder' makes the app refetch and reschedule reminders */
  data: Record<string, unknown> & { kind: string };
};

export async function sendPushToProfiles(profileIds: string[], message: PushMessage): Promise<number> {
  const ids = Array.from(new Set(profileIds.filter(Boolean)));
  if (ids.length === 0) return 0;

  const { data: rows, error } = await supabase
    .from('device_push_tokens')
    .select('expo_push_token')
    .eq('app', 'athletes')
    .in('profile_id', ids);
  if (error || !rows || rows.length === 0) return 0;

  const tokens = rows.map((r: any) => r.expo_push_token as string);
  let sent = 0;
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const batch = tokens.slice(i, i + CHUNK);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(
          batch.map((to) => ({
            to,
            title: message.title,
            body: message.body,
            data: message.data,
            sound: 'default',
            priority: 'high',
            channelId: 'call-room',
          }))
        ),
      });
      const json: any = await res.json().catch(() => null);
      const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
      // Remove tokens for uninstalled apps / revoked permissions
      const dead = tickets
        .map((t, idx) => (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered' ? batch[idx] : null))
        .filter(Boolean) as string[];
      if (dead.length > 0) await supabase.from('device_push_tokens').delete().in('expo_push_token', dead);
      sent += tickets.filter((t) => t?.status === 'ok').length;
    } catch (err) {
      console.warn('Expo push send failed:', (err as Error).message);
    }
  }
  return sent;
}

/** Every athlete competing in a heat: individual entries + all members of relay teams in it */
async function heatProfileIds(heatId: string): Promise<{ ids: string[]; eventName: string; heatNumber: number | null }> {
  const { data: heat } = await supabase
    .from('heats')
    .select('heat_number, events ( name ), heat_athletes ( profile_id, relay_team_id )')
    .eq('id', heatId)
    .maybeSingle();
  if (!heat) return { ids: [], eventName: 'your event', heatNumber: null };

  const entries: any[] = (heat as any).heat_athletes || [];
  const ids = entries.map((e) => e.profile_id).filter(Boolean);
  const teamIds = entries.map((e) => e.relay_team_id).filter(Boolean);
  if (teamIds.length > 0) {
    const { data: members } = await supabase.from('relay_members').select('profile_id').in('relay_team_id', teamIds);
    ids.push(...(members || []).map((m: any) => m.profile_id));
  }
  return { ids, eventName: (heat as any).events?.name || 'your event', heatNumber: heat.heat_number ?? null };
}

/** Fire-and-forget push when a heat's status changes in a way athletes must know about. */
export function notifyHeatStatusChange(heatId: string, status: string): void {
  if (status !== 'CALL_ROOM') return;
  (async () => {
    const { ids, eventName, heatNumber } = await heatProfileIds(heatId);
    await sendPushToProfiles(ids, {
      title: `📣 Call room OPEN — ${eventName}`,
      body: `${heatNumber ? `Heat ${heatNumber}: ` : ''}Report to the Call Room now with your ID card.`,
      data: { kind: 'call-room-open', heatId },
    });
  })().catch((err) => console.warn('notifyHeatStatusChange failed:', err?.message));
}
