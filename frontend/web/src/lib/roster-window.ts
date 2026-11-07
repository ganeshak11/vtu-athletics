/**
 * Roster edit window rules shared by athlete and relay mutations and the squad pages.
 *
 * - Registration OPEN:   a squad may edit while its roster is unlocked.
 * - Registration CLOSED: only a squad the admin emergency-unlocked AFTER the close
 *                        (squads.late_entry_open = true, migration 0017) may edit — late entries.
 *
 * Pure helper (no 'use server'): pass it the meet setting and a squad row fetched with '*'
 * so it keeps working before migration 0017 adds late_entry_open.
 */
export interface RosterWindowSquad {
  roster_locked?: boolean | null;
  late_entry_open?: boolean | null;
  payment_status?: string | null;
  gender?: string | null;
}

export function isLateEntryWindow(registrationOpen: boolean, squad: RosterWindowSquad | null | undefined): boolean {
  return !registrationOpen && squad?.roster_locked !== true && squad?.late_entry_open === true;
}

export function canEditRoster(registrationOpen: boolean, squad: RosterWindowSquad | null | undefined): boolean {
  if (!squad) return false;
  if (squad.roster_locked === true) return false;
  return registrationOpen || squad.late_entry_open === true;
}

/** Human-readable reason the roster cannot be edited, or null when editing is allowed. */
export function rosterEditBlockReason(registrationOpen: boolean, squad: RosterWindowSquad | null | undefined): string | null {
  if (!squad) return 'Unable to verify squad roster status. Please try again.';
  if (canEditRoster(registrationOpen, squad)) return null;
  if (!registrationOpen && squad.roster_locked !== true) {
    return 'Championship registrations are officially closed by the VTU Directorate. Contact the Directorate to request a late entry.';
  }
  if (!registrationOpen) {
    return 'Championship registrations are officially closed by the VTU Directorate.';
  }
  return String(squad.payment_status || '').toUpperCase() === 'VERIFIED'
    ? 'Roster Locked: Your entry fee payment has been verified. The squad roster is permanently frozen. Contact the VTU Directorate for an emergency unlock.'
    : 'Roster Locked & Payment Submitted: Athletes cannot be added or removed while the roster is frozen. Contact the VTU Directorate for an emergency unlock.';
}
