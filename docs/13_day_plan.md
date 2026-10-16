# VTU SportsOS — 13-Day Full Build Plan

> **Meet date**: ~October 30, 2026
> **Today**: October 17, 2026
> **Days available**: 13 (full days)
> **Scope**: Everything. No cuts. No fallbacks.

---

## Day 1 — Project Bootstrap + Migration 0001 (Squads & Auth)

**Morning:**
- [ ] Initialize Supabase project (`supabase init`, local dev)
- [ ] Initialize Next.js 14 app (App Router, TypeScript)
- [ ] Set up: Supabase client, env vars, iron-session auth helpers
- [ ] Design system: CSS variables, dark theme, typography (Inter font), components
- [ ] Write `0001_colleges_squads_staff.sql`
  - `colleges` table
  - `squads` table (passphrase hash, PED contact, roster lock, payment status)
  - `staff` table (username/PIN auth, role enum, event scope)
  - `meet_settings` table

**Afternoon:**
- [ ] Build: Admin login page (username + password)
- [ ] Build: Admin → "Manage Colleges" (add/edit college, auto-creates men + women squads)
- [ ] Build: Passphrase generation + display (admin gives to PED coordinator)
- [ ] Build: Squad login page (squad code + passphrase)
- [ ] Build: Squad dashboard shell (college name, gender, status badges)
- [ ] Build: Admin → "Manage Staff" (create accreditation/warden/call room/referee accounts with PINs)

---

## Day 2 — Events + Athlete Registration

**Morning:**
- [ ] Write `0002_events_catalogue.sql` — all events with category config
- [ ] Seed script: all track, field, relay, road events with correct `start_type`, `max_lanes`, `has_rounds`, `is_progressive_height`
- [ ] Write `0003_profiles_registrations.sql`
  - `profiles` (athlete bio-data)
  - `registrations` (normalized junction: profile_id, event_id, kind)
  - `relay_teams`, `relay_members`
  - Quota enforcement triggers

**Afternoon:**
- [ ] Build: "Add Athlete" form (name, USN, semester, blood group, joining date, sem start date)
- [ ] Build: Event selection UI — pick up to 2 regular events from dropdown, 1 reserve, relay toggle, marathon toggle
- [ ] Implement: Client + server quota validation
- [ ] Build: Roster list view (table of all athletes with their events, edit/delete)
- [ ] Build: Relay team composition page (drag/assign 4 runners + 2 reserves per relay event)

---

## Day 3 — Payment Flow + Verification

**Morning:**
- [ ] Write `0004_payments.sql` (UTR, screenshot, status lifecycle, amount matching)
- [ ] Build: Fee computation display (breakdown: X regular × ₹100 + Y relay × ₹100 + ...)
- [ ] Build: Payment page — display host UPI QR code, show amount due
- [ ] Build: UTR + screenshot upload form (Supabase Storage for screenshots)

**Afternoon:**
- [ ] Build: Finance desk login (staff role: `finance_desk`)
- [ ] Build: Finance desk → payment verification dashboard
  - List all submitted payments with screenshots
  - Approve / Reject with reason
  - Show amount_submitted vs amount_expected comparison
- [ ] Implement: `squad.payment_status` auto-derivation from payment records
- [ ] Implement: Roster lock on first payment submission
- [ ] Build: Squad dashboard → payment status indicator + history

---

## Day 4 — Registration Close + Bid Generation + Amendments

**Morning:**
- [ ] Write `0005_registration_lock_bids.sql`
  - Bid generation RPC function
  - Amendment tables (withdraw, substitute, late entry audit log)
- [ ] Build: Admin → "Close Registration" button (with confirmation modal)
- [ ] Implement: Bid generation algorithm
  - Sort squads alphabetically by college name
  - Men: sequential blocks starting from 100
  - Women: sequential blocks starting from 2001
  - Assign contiguous bid numbers within each squad

**Afternoon:**
- [ ] Build: Admin → bid assignment overview (table: college, gender, bid range)
- [ ] Build: Squad dashboard → athletes with bid numbers displayed
- [ ] Build: Admin → "/admin/amendments" page
  - "Withdraw Athlete" — void bid, mark withdrawn
  - "Substitute Athlete" — new athlete inherits bid + event registrations
  - "Add Late Entry" — new bid at end of squad's block, recalculate fee
- [ ] Build: Top-up payment flow for fee increases from late entries

---

## Day 5 — Accreditation + Accommodation

**Morning:**
- [ ] Write `0006_accreditation.sql` (scan audit log with client UUID idempotency)
- [ ] Write `0007_accommodation.sql` (check-in fields, scan log)
- [ ] Build: Athlete QR code card generation (bid number, name, college, events encoded)
- [ ] Build: Squad dashboard → "Print Athlete Cards" (PDF/printable view of all QR cards)
- [ ] Integrate: `html5-qrcode` library for camera scanning

**Afternoon:**
- [ ] Build: Accreditation volunteer login (PIN-based)
- [ ] Build: Accreditation scanner page
  - Camera opens → scan QR → display athlete info (name, college, bid#, events)
  - "Confirm Accreditation" button → mark ACCREDITED
  - Physical ID card verification reminder on screen
- [ ] Build: Accreditation dashboard (count: accredited/total, filter by college, search by bid#)
- [ ] Build: Warden login (PIN-based)
- [ ] Build: Accommodation scanner page (scan QR → mark checked in, timestamp)
- [ ] Build: Accommodation dashboard (checked-in count per college)

---

## Day 6 — Schedule Builder + Notifications

**Morning:**
- [ ] Write `0008_schedule_notifications.sql`
  - `schedule_items` table (event_id, round, date, time, venue)
  - `notifications` table (recipient squad/profile, message, read status)
- [ ] Build: Admin → schedule builder UI
  - Calendar/timeline view per day
  - Drag events into time slots
  - Set venue for each item
  - Publish/unpublish toggle

**Afternoon:**
- [ ] Build: Public schedule view (day-by-day, filterable by event category)
- [ ] Build: Squad dashboard → "My Schedule" (only events their athletes are in)
- [ ] Build: Notification system
  - Admin can broadcast to all squads or specific squads
  - Auto-notifications: payment verified, registration closed, heat published
  - In-app notification bell with unread count
  - Notification list page with read/unread state
- [ ] Build: Admin → "Send Notification" form (select recipients, compose message)

---

## Day 7 — Heat Draw + Seeding

**Morning:**
- [ ] Write `0009_rounds_heats_lanes.sql`
  - `event_rounds` table (round number, round type: heat/semi/final)
  - `event_heats` table (heat number within round)
  - `event_results` table (seeded state, lane assignment)
  - Seeding RPC function
- [ ] Implement: Seeding algorithm
  - **Lane events (100m, 200m, 400m, hurdles):** random draw, college separation (no two from same college in adjacent lanes), distribute across heats evenly
  - **Waterfall (800m):** random group assignment
  - **Mass start (1500m, 5000m, 10000m):** single group, random order
  - **Road (half marathon):** mass start, no lanes

**Afternoon:**
- [ ] Build: Admin → "Generate Heats" button per event
  - Preview heat assignments before confirming
  - Manual override: swap athletes between heats/lanes
- [ ] Build: Heat sheet view (public-facing)
  - Lane # | Bid # | Athlete Name | College
  - Printable format (A4 landscape)
- [ ] Build: Squad dashboard → "My Heats" (which heat/lane for each athlete)
- [ ] Auto-notification: "Heats published for [event]" → relevant squads

---

## Day 8 — Call Room + Track Results Entry

**Morning:**
- [ ] Write `0010_call_room.sql`
  - `call_room_logs` table (6 statuses: CALLED, REPORTED, ID_CHECKED, READY, NO_SHOW, SUBSTITUTED)
  - Reserve substitution procedure
- [ ] Build: Call room official login (PIN-based, scoped)
- [ ] Build: Call room page
  - Select event + heat → see expected athletes
  - Scan QR or tap athlete → cycle through statuses
  - "No Show" button → trigger reserve substitution prompt
  - Reserve substitution: select reserve athlete, assign to heat

**Afternoon:**
- [ ] Write `0011_track_results.sql` (manual time entry, auto-ranking)
- [ ] Build: Referee login (PIN-based, scoped to assigned events)
- [ ] Build: Track results entry page
  - Select event → select round → select heat
  - Enter time per lane (mm:ss.xx format)
  - Mark DNS / DNF / DQ per athlete
  - Auto-rank by ascending time
  - "Confirm Results" → lock heat results
- [ ] Implement: Round advancement
  - Top N per heat auto-qualify (Q)
  - Next M fastest across all heats qualify (q)
  - "Advance to Final" button → generates final heat with qualified athletes

---

## Day 9 — Field Results + HJ/PV

**Morning:**
- [ ] Write `0012_field_results.sql`
  - `field_attempts` table
  - `progressive_height_attempts` table
  - Ranking functions
- [ ] Build: Field event results entry (throws + horizontal jumps)
  - Select event → list athletes
  - Per athlete: enter up to 6 attempts (distance or foul/pass/no_mark)
  - Auto-compute best mark
  - Auto-rank descending by best mark
  - Tie-break: 2nd best → 3rd best

**Afternoon:**
- [ ] Build: High Jump / Pole Vault progressive height entry
  - Admin sets starting height and increments
  - Per height: enter O (clear) / X (fail) / - (pass) for each attempt
  - Auto-compute: who cleared, who's eliminated (3 consecutive X)
  - "Raise Bar" button → next height
  - Auto-rank: highest cleared, then countback (fewest fails at last height, then fewest total fails)
- [ ] Build: Relay results entry
  - Select relay event → list teams by college
  - Enter time per team
  - Mark DNS/DNF/DQ
  - Auto-rank ascending
- [ ] Build: Half marathon results entry (mass finish list: bid# + time)

---

## Day 10 — Scoring + Leaderboard + Live

**Morning:**
- [ ] Write `0013_scoring_leaderboard.sql`
  - `scoring_config` table (rank → points mapping)
  - College points materialized view / function
  - Athlete points view (excluding relay)
  - Trophy computation (best athlete, best college)
- [ ] Implement: Scoring rules
  - DNS/DNF/DQ = 0 points
  - Ties: shared higher rank, next rank skipped
  - Relay points → college only, not individual
  - Best Athlete tie-break: golds → silvers → bronzes → co-champion
  - Best College tie-break: golds → silvers → bronzes → co-champion

**Afternoon:**
- [ ] Build: `/leaderboard` public page
  - College standings table (rank, college, total points, G/S/B counts)
  - Best Athlete Men + Best Athlete Women tables
  - Auto-updates as results are confirmed
- [ ] Build: `/live` public page
  - Event-by-event results (completed + in-progress)
  - Filter by: track, field, relay, road
  - 10-second polling refresh (not WebSocket for spectators)
- [ ] Build: Event detail page — full results with all attempts visible

---

## Day 11 — Offline Scanning + RLS + PWA

**Morning:**
- [ ] Implement: Service Worker for PWA
  - Cache shell + critical assets for offline use
  - IndexedDB write queue for scan operations
  - Client-side UUID generation for idempotency
  - Sync queue replay on reconnection
  - Visual indicator: online/offline status bar
- [ ] Implement: Server-side idempotency check (reject duplicate client UUIDs)
- [ ] Implement: Conflict resolution (first write wins, second returns "already processed")

**Afternoon:**
- [ ] Write `0014_rls_policies.sql`
  - RLS policies for EVERY table matching the permission matrix
  - Squad managers: own squad only
  - Staff: role-scoped access
  - Referees: scoped to assigned events
  - Public: read-only on results, leaderboard, schedule
- [ ] Test: Every role can only access what the matrix allows
- [ ] PWA manifest + icons + install prompt
- [ ] Test: Install PWA on Android + iOS, verify offline scanning works

---

## Day 12 — Admin Dashboard + Polish

**Morning:**
- [ ] Build: Admin dashboard home
  - Registration stats: total colleges, total squads, total athletes, by gender
  - Payment stats: pending / verified / rejected counts, total revenue
  - Event progress: not started / in progress / completed per event
  - Quick links to all admin functions
- [ ] Build: Print-friendly views
  - Heat sheets (A4 landscape)
  - Results sheets per event
  - Accreditation roster per college
  - Bid number master list
  - College-wise athlete list with events

**Afternoon:**
- [ ] Mobile responsiveness pass on ALL pages
  - Squad registration flow (PEDs will use phones)
  - Accreditation scanner (phone camera)
  - Live results (spectators on phones)
  - Leaderboard (spectators on phones)
- [ ] Error handling pass
  - Form validations with clear error messages
  - Network error handling with retry
  - Loading states and skeletons
  - Empty states
- [ ] Edge case testing
  - 0 athletes registered
  - All athletes DNS
  - Tie at every position
  - Single athlete in event (auto-gold)

---

## Day 13 — Deploy + Full Dry Run

**Morning:**
- [ ] Deploy frontend to Vercel
- [ ] Provision production Supabase instance (upgrade to Pro plan)
- [ ] Run all migrations on production
- [ ] Seed production event catalogue
- [ ] Create admin + staff accounts
- [ ] Configure Supabase Storage bucket for payment screenshots
- [ ] Set up custom domain (if available) or use Vercel URL

**Afternoon:**
- [ ] **FULL DRY RUN** — walk through entire flow:
  1. Admin creates 3 test colleges
  2. PED logs in as squad, registers 5 athletes each
  3. PED submits payment (UTR + screenshot)
  4. Finance desk verifies payment
  5. Admin closes registration → bids generated
  6. Admin publishes schedule
  7. Admin generates heats for 100m, shot put, high jump
  8. Accreditation volunteer scans 5 athletes
  9. Warden checks in 3 athletes
  10. Call room official processes a heat
  11. Referee enters track results for a heat
  12. Referee enters field results with attempts
  13. Referee enters HJ results with progressive heights
  14. Verify scoring auto-computes correctly
  15. Check `/live` and `/leaderboard` show correct data
  16. Test offline scan → reconnect → verify sync
- [ ] Fix any bugs found in dry run
- [ ] **Share registration link with PEDs**

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Vanilla CSS (dark mode, glassmorphism, Inter font) |
| Backend | Next.js Server Actions + Supabase RPCs |
| Database | Supabase (PostgreSQL) |
| Auth | iron-session (encrypted HTTP-only cookies) |
| Storage | Supabase Storage (payment screenshots) |
| QR Scan | `html5-qrcode` (WebRTC camera) |
| QR Gen | `qrcode` (generate athlete QR codes) |
| Offline | Service Worker + IndexedDB |
| PWA | `next-pwa` |
| Deploy | Vercel + Supabase Cloud |

---

## Migration File Map

```
supabase/migrations/
├── 0001_colleges_squads_staff.sql          Day 1
├── 0002_events_catalogue.sql               Day 2
├── 0003_profiles_registrations.sql         Day 2
├── 0004_payments.sql                       Day 3
├── 0005_registration_lock_bids.sql         Day 4
├── 0006_accreditation.sql                  Day 5
├── 0007_accommodation.sql                  Day 5
├── 0008_schedule_notifications.sql         Day 6
├── 0009_rounds_heats_lanes.sql             Day 7
├── 0010_call_room.sql                      Day 8
├── 0011_track_results.sql                  Day 8
├── 0012_field_results.sql                  Day 9
├── 0013_scoring_leaderboard.sql            Day 10
└── 0014_rls_policies.sql                   Day 11
```

---

## Definition of "Done"

**Every single one of these must work on Day 13:**

### PED (Squad Manager) can:
- [x] Log in with squad code + passphrase
- [x] Register athletes with event selection (quota enforced)
- [x] Compose relay teams
- [x] See fee breakdown, upload UTR + screenshot
- [x] View bid numbers after registration closes
- [x] View schedule for their athletes
- [x] Receive notifications

### Admin can:
- [x] Manage colleges, squads, staff accounts
- [x] Verify payments (approve/reject)
- [x] Close registration, generate bids
- [x] Process amendments (withdraw/substitute/late entry)
- [x] Build schedule (assign events to timeslots)
- [x] Generate heat draws with college separation
- [x] Send notifications to squads
- [x] View dashboard with all stats

### Finance Desk can:
- [x] Log in, see pending payments, approve/reject with reason

### Accreditation Volunteer can:
- [x] Log in with PIN, scan athlete QR, confirm accreditation
- [x] Works offline (queues scans, syncs on reconnect)

### Warden can:
- [x] Log in with PIN, scan athlete QR, mark accommodation check-in
- [x] Works offline

### Call Room Official can:
- [x] Log in with PIN, process athletes for a heat
- [x] Mark no-shows, trigger reserve substitution

### Referee can:
- [x] Log in with PIN (scoped to events)
- [x] Enter track times, field attempts, HJ/PV progressive heights
- [x] Confirm results, advance rounds

### Public (Spectators) can:
- [x] View live results per event (auto-refreshing)
- [x] View leaderboard (college standings + best athlete)
- [x] View schedule
- [x] Install as PWA on phone
