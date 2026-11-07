/**
 * Athlete date-of-birth helpers shared by the registration forms and server actions.
 *
 * There is NO age limit for registration. The date of birth is still collected because
 * athletes log in to the AURA Athletes app with bib number + date of birth, so it only
 * has to be a real, non-future date.
 */
/** Lower bound for the date picker — a typo guard (e.g. "0200"), not an eligibility rule. */
export const EARLIEST_DOB = '1900-01-01';

/** Returns an error message, or null when the date of birth is acceptable. */
export function validateDateOfBirth(dob: string | null | undefined, todayIso?: string): string | null {
  const v = String(dob || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v + 'T00:00:00Z').getTime())) {
    return 'Please enter a valid date of birth (as per SSLC certificate).';
  }
  const today = todayIso || new Date().toISOString().slice(0, 10);
  if (v > today) return 'Date of birth cannot be in the future.';
  if (v < EARLIEST_DOB) return 'Please check the date of birth — the year looks incorrect.';
  return null;
}
