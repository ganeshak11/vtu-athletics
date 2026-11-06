# VTU SportsOS — Web Registration System (CLAUDE.md)

## System Overview
VTU SportsOS is the official athletic meet management system for the **28th VTU Inter-Collegiate State Level Athletic Meet 2026 (Dr. ACS AURA 2026)** hosted by Dr. ACS College of Engineering, Bengaluru under Visvesvaraya Technological University (VTU), Belagavi.

**Scope of Task**: Focus **EXCLUSIVELY** on the **Web Registration Part** under `frontend/web/`. Do not touch `backend/`, `frontend/mobile/`, or unrelated admin subpages unless directly required by the squad registration flow.

---

## Tech Stack & Architecture
- **Framework**: Next.js 16.3.1 (App Router, Turbopack, Server Actions enabled)
- **UI Library**: React 19, Vanilla CSS (`dashboard.css`, `home.css`, `globals.css`)
- **Backend / Database**: Supabase (PostgreSQL, Row Level Security, Storage Buckets)
- **Auth**: Passphrase-based squad authentication (`squad_code` + `passphrase` hashed via bcrypt or stored in session cookie `squad_session`)
- **Storage**: Supabase Storage Buckets (`athlete-photos` for passport photos, `payment-proofs` for transaction receipts)

---

## Registration Flow Architecture & File Map

```
frontend/web/
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   ├── auth.ts              # Squad & admin authentication actions
│   │   │   ├── athletes.ts          # Add/delete athlete, quota validations, photo upload
│   │   │   ├── relay.ts             # Relay team formation, 4x100/4x400/Mixed rules
│   │   │   └── payment.ts           # calculateSquadFees, submitPaymentAction, invoice
│   │   ├── login/
│   │   │   └── squad/page.tsx       # College PED passphrase login portal
│   │   ├── squad/
│   │   │   ├── layout.tsx           # Squad layout wrapper with session check
│   │   │   ├── SquadNav.tsx         # Navigation bar for contingent portal
│   │   │   ├── dashboard/page.tsx   # Contingent overview, quotas, roster summary, advisory
│   │   │   ├── athletes/
│   │   │   │   ├── page.tsx         # Server component fetching squad athletes & events
│   │   │   │   └── AthletesManager.tsx # Client modal: Bio-data, photos, event selection
│   │   │   ├── relay/
│   │   │   │   ├── page.tsx         # Server component fetching relay events & teams
│   │   │   │   └── RelayManager.tsx # 4 legs + 2 reserves assignment desk
│   │   │   ├── payment/
│   │   │   │   ├── page.tsx         # Server component fetching fee breakdown
│   │   │   │   └── PaymentClient.tsx# UPI QR, UTR submission, payment receipt modal
│   │   │   └── cards/
│   │   │       └── page.tsx         # Printable 6x4 inch athlete accreditation ID cards
│   │   └── components/
│   │       └── invoice/
│   │           ├── FeeInvoiceModal.tsx         # Official college fee invoice & receipt
│   │           └── RegistrationReportModal.tsx # Printable official entry roster form
│   └── lib/
│       ├── auth-guard.ts            # requireSquad() session verification
│       ├── supabase.ts              # supabaseAdmin client (service_role key)
│       └── championship-events.ts   # Event codes & official naming map
```

---

## VTU Official Registration Rules & Business Logic

### 1. Athlete Identification & Eligibility
- **Fields Required**: Full Name (SSLC/10th Certificate match), USN (University Seat Number), Semester (1–8 for UG, 1–4 for PG), Blood Group, College Joining Date, Semester Start Date, 12-digit Aadhaar Number.
- **Validations**:
  - Aadhaar: Exactly 12 digits, globally unique across entire championship (`profiles.aadhaar_number`).
  - USN: Valid VTU format (e.g. `1AH21CS001`), uppercase, globally unique across championship (`profiles.usn`).
  - Dates: `college_joining_date <= today`, `sem_start_date >= college_joining_date`.
  - Photo: Mandatory passport-size photo (JPG, PNG, WebP ≤ 5MB) uploaded to Supabase bucket `athlete-photos`.

### 2. Event Quotas & Combinations (VTU Athletic Code)
- **Individual Events**:
  - Maximum **2 individual events** per athlete (`event1Id` and `event2Id`).
  - Event 1 is mandatory unless athlete is registered **only** for a standalone Relay or Half Marathon.
  - Event 1 and Event 2 must be different.
  - **Reserve Event**: Maximum 1 reserve event (`reserveEventId`).
    - **Rule**: If an athlete registers for both Event 1 and Event 2, they **CANNOT** nominate a reserve event.
    - **Rule 36**: A reserve event can **only** be nominated if the athlete is registered for at least one individual regular event.
    - Reserve event must be distinct from Event 1 and Event 2.
- **Squad Quota (College-wide limit per event)**:
  - Maximum **2 athletes** from the same college squad in any single regular individual discipline.
- **Relay Events**:
  - **Rule 3 & 24**: Mutual exclusivity between divisional relays — an athlete can participate in **at most one** divisional relay (either `4x100m` OR `4x400m`, never both).
  - **Team Composition**: 4 active runners + up to 2 reserve runners (max 6 athletes registered per relay team).
  - **Rule 27 (4x400m Mixed Relay)**: Unrestricted across individual events. Running order is strictly:
    - **Leg 1**: Woman (Female athlete)
    - **Leg 2**: Man (Male athlete)
    - **Leg 3**: Woman (Female athlete)
    - **Leg 4**: Man (Male athlete)
    - Reserves: 1 Man and 1 Woman.
- **Half Marathon (21km)**:
  - Code `HM-M` (Men) or `HM-W` (Women).
  - Can be registered standalone.

### 3. Fee Computation Matrix
Fees are calculated dynamically via `calculateSquadFees()` in `frontend/web/src/app/actions/payment.ts`:
- **Regular Individual Event**: ₹100 per entry
- **Reserve Event**: **₹0 (Free)**
- **Half Marathon**: ₹100 per entry
- **Relay Team**: **Flat ₹400 per relay team** (irrespective of whether the team has 4 or 6 members).
- **Total Amount Formula**:
  $$\text{Total Amount} = (\text{Regular Count} \times 100) + (\text{HM Count} \times 100) + (\text{Relay Teams Count} \times 400)$$
- **Balance Due**: $\max(0, \text{Total Amount} - \text{Total Verified Payments})$

### 4. Payment Submission & Roster Lock Lifecycle
- **UPI Offline Payment**: PED transfers fee to host UPI ID (`host_upi_id` from `meet_settings`) and submits:
  - 8–30 alphanumeric UTR/Bank Reference Number (unique constraint).
  - Amount paid.
  - Transaction screenshot/receipt (JPG, PNG, PDF ≤ 5MB) uploaded to bucket `payment-proofs`.
- **Roster Lock State Transitions**:
  1. **Draft Phase (`roster_locked: false`, `payment_status: 'DRAFT'` / `'DrAFT'`)**:
     - PED freely adds/deletes athletes and configures relay teams.
  2. **Payment Submission (`submitPaymentAction`)**:
     - Submitting payment **automatically sets `roster_locked = true`** and `payment_status = 'SUBMITTED'`.
     - Squad entries are immediately **frozen** to prevent altering the roster while payment is verified.
  3. **Verification Desk (`verifyPaymentAction`)**:
     - **Approved (`VERIFIED`)**: `roster_locked` remains `true`, `payment_status` becomes `VERIFIED`. Official Registration Report and ID Cards are ready.
     - **Rejected (`REJECTED`)**: `payment_status` becomes `REJECTED`. Roster remains locked or unlocks only for payment re-upload.
  4. **Emergency Unlocking**:
     - Only an Admin can unlock a locked squad via `/admin/colleges` (`toggleSquadRosterLockAction`) if the college requests permission for an emergency roster adjustment.
- **Enforcement Across All Server Actions**:
  - `addAthleteAction`, `deleteAthleteAction`, and relay mutations in `relay.ts` **MUST check both** `meet_settings.registration_open !== false` AND `squad.roster_locked !== true`. If locked, return error immediately.

---

## Known Pitfalls & Watch-outs

1. **`DrAFT` vs `DRAFT` Typo**:
   - An earlier bulk replace of `DR` to `Dr` changed `DRAFT` to `DrAFT` in several files and DB migration check constraints:
     `payment_status IN ('DrAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED')`.
   - Always ensure code checking `payment_status` accounts for both or matches the exact string used in `payment.ts` and `squads` table.
2. **`package-lock.json` Integrity**:
   - Never do case-insensitive global search-and-replace across `package-lock.json` because base64 SHA-512 hashes will corrupt and break Vercel deployments (`EINTEGRITY`).
3. **Server Actions in Next.js 16**:
   - Always start action files with `'use server';`.
   - Avoid passing non-serializable objects (e.g. raw functions, unhandled File buffers across client-server boundaries). Use `FormData` for multipart uploads.
4. **Foreign Key Cascade on Delete**:
   - When deleting an athlete, registrations, relay memberships, and heat assignments must be deleted first or cascading to prevent FK constraint failures.

---

## Common Commands
```bash
# Run web development server
npm --prefix frontend/web run dev

# Full Next.js production build check
npm --prefix frontend/web run build

# Linting
npm --prefix frontend/web run lint
```
