/**
 * Date/time formatting in India Standard Time (UTC+05:30, no daylight saving), independent of
 * the phone's timezone and of Intl/timeZone support in the JS engine.
 */
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ist(iso: string): Date {
  // A Date whose UTC fields read as India local time
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS);
}

/** "9:30 AM" in India time */
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = ist(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Mon, 7 Dec" */
export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return 'Date to be announced';
  const d = ist(iso);
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** YYYY-MM-DD in India time — used to group events by day */
export function dayKey(iso: string | null | undefined): string {
  if (!iso) return 'tba';
  return ist(iso).toISOString().slice(0, 10);
}

export function stageLabel(stage: string | null): string {
  switch (stage) {
    case 'HEATS': return 'Heats';
    case 'SEMI_FINAL': return 'Semi-final';
    case 'FINAL': return 'Final';
    case 'QUALIFYING': return 'Qualifying';
    default: return '';
  }
}

export function kindLabel(kind: string): string | null {
  switch (kind) {
    case 'reserve': return 'Reserve';
    case 'relay': return 'Relay';
    case 'half_marathon': return 'Half Marathon';
    default: return null;
  }
}

export function minutesUntil(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - now) / 60000);
}

/** "DD/MM/YYYY" parts → "YYYY-MM-DD", or null when not a real date */
export function toIsoDate(dd: string, mm: string, yyyy: string): string | null {
  const d = parseInt(dd, 10), m = parseInt(mm, 10), y = parseInt(yyyy, 10);
  if (!d || !m || !y || yyyy.length !== 4) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
