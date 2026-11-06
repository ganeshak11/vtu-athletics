/**
 * Official host-college payment details shown to PEDs on the Fee Settlement page.
 *
 * meet_settings.host_upi_id / host_account_name in the database default to placeholders
 * ('vtuathletics@upi' / 'VTU Sports Board'). Those placeholders are ignored and these official
 * values are used instead; a real (non-placeholder) value saved in the DB still takes precedence.
 */
export const OFFICIAL_UPI_ID = 'ACSCOLLEGEOFENGINEERING@icici';
export const OFFICIAL_ACCOUNT_NAME = 'A C S College of Engineering';
/** Static QR image served from /public */
export const OFFICIAL_UPI_QR_SRC = '/QRCode.png';

const PLACEHOLDER_UPI_IDS = new Set(['vtuathletics@upi', '']);
const PLACEHOLDER_ACCOUNT_NAMES = new Set(['VTU Sports Board', '']);

export function resolveHostUpiId(dbValue?: string | null): string {
  const v = (dbValue || '').trim();
  return PLACEHOLDER_UPI_IDS.has(v) ? OFFICIAL_UPI_ID : v;
}

export function resolveHostAccountName(dbValue?: string | null): string {
  const v = (dbValue || '').trim();
  return PLACEHOLDER_ACCOUNT_NAMES.has(v) ? OFFICIAL_ACCOUNT_NAME : v;
}
