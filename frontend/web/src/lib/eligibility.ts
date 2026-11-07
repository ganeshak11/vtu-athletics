/**
 * Athlete eligibility helpers shared by the registration forms and server actions.
 *
 * VTU Rule 11 / 45: the student-athlete must be below 25 years of age as on 1st July 2026.
 * Someone born on 1 July 2001 turns 25 on the cut-off date, so the earliest eligible
 * date of birth is 2 July 2001.
 */
export const AGE_CUTOFF_DATE = '2026-07-01';
export const MAX_AGE_ON_CUTOFF = 25;
/** Earliest eligible DOB (inclusive) */
export const EARLIEST_ELIGIBLE_DOB = '2001-07-02';
/** Typo guard only (not a VTU rule): a university athlete younger than this on the cut-off is almost certainly a mistyped year */
const MIN_PLAUSIBLE_AGE_ON_CUTOFF = 14;

function ageOn(dobIso: string, onIso: string): number {
  const [by, bm, bd] = dobIso.split('-').map(Number);
  const [oy, om, od] = onIso.split('-').map(Number);
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age -= 1;
  return age;
}

/** Returns an error message, or null when the date of birth is acceptable. */
export function validateDateOfBirth(dob: string | null | undefined, todayIso?: string): string | null {
  const v = String(dob || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v + 'T00:00:00Z').getTime())) {
    return 'Please enter a valid date of birth (as per SSLC certificate).';
  }
  const today = todayIso || new Date().toISOString().slice(0, 10);
  if (v > today) return 'Date of birth cannot be in the future.';
  const age = ageOn(v, AGE_CUTOFF_DATE);
  if (age >= MAX_AGE_ON_CUTOFF) {
    return `Not eligible (VTU Rule 11): the athlete must be below ${MAX_AGE_ON_CUTOFF} years as on 1 July 2026 (born on or after 2 July 2001).`;
  }
  if (age < MIN_PLAUSIBLE_AGE_ON_CUTOFF) {
    return 'Please check the date of birth — the year looks incorrect.';
  }
  return null;
}
