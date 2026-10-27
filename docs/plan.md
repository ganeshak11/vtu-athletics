# VTU SportsOS — Master System Specification & Architecture Plan
## The Digital Operating System for University-Level Athletics Meets

**Official Platform for the 24th VTU Inter-Collegiate Athletics Meet 2026**  
**Host Institution:** Dr. ACS College of Engineering, Bengaluru  
**Governing Body:** Visvesvaraya Technological University (VTU)

---

# 1. Executive Summary & Core Vision

Managing a university-level athletics championship involves coordinating:
- 100+ participating engineering colleges across Karnataka
- 1,000+ student-athletes competing in 40+ track, field, and combined disciplines
- Dozens of accredited physical education directors (PEDs), coaches, and team managers
- World Athletics / AFI accredited technical officials and electronic track timing teams
- Campus logistics: hostel block assignments, thousands of daily meals, and physical accreditation
- Real-time scorekeeping, live public feeds, and university championship trophy computations

Traditionally, these operations relied on disconnected paper entry forms, manual Excel merges, WhatsApp broadcasts, printed heat sheets, and delayed physical notice boards. This led to lost entries, duplicate meal redemption, room overbooking, late reporting at call rooms, and slow result compilation.

**VTU SportsOS** replaces all disconnected processes with a single, synchronized digital operating platform. Every stakeholder—from a college principal registering a squad to a timing official recording track times—operates within the same secure real-time ecosystem.

---

# 2. Stakeholder User Roles & Access Architecture

VTU SportsOS implements role-gated access with dedicated interfaces:

| User Role | Access Credential | Primary Capabilities |
| :--- | :--- | :--- |
| **Student-Athlete** | Bib #, Chest #, or USN | Personal digital badge, live call room summons, heat/lane notifications, 4-day timetable, digital meal pass, personal results. |
| **College Delegation (Principal / PED)** | Institutional squad codes (e.g., `ACSCE-M`, `MITM-M`, `RVCE-G`) | Decentralized squad registration, eligibility compliance, reserve allocations, online fee checkout (Razorpay), receipt downloads. |
| **Accreditation Desk Volunteer** | Admin / Official credentials | Hardware/camera QR scanning, identity verification, fee payment confirmation, physical Bib badge issuance, accreditation audit logs. |
| **Call Room Marshal** | Official PIN (e.g., `1234`) | Device camera QR scanning, 6-state marshalling, accreditation guard check, 1-tap DNS reserve athlete substitution. |
| **Chief Referee / Timing Official** | Official PIN | Electronic track timing CSV import, 3-attempt field matrix, manual timing input, IAAF `Q`/`q` qualifier calculation. |
| **Hostel Warden** | Warden PIN (e.g., `2345` / `WARDEN`) | Single-tap QR arrival check-in, arrival timestamps, duplicate entry prevention. |
| **Dining Hall / Canteen Volunteer** | Food PIN (e.g., `3456` / `FOOD`) | Meal slot selection (Breakfast/Lunch/Dinner), high-speed QR redemption, strict duplicate claim prevention. |
| **Meet Director / University Admin** | Master Admin PIN (`ADMIN`) | Event control center, registration window lockdown, sequential block bib generator, college-separation heat generation, master Excel export. |
| **Public & Spectators** | Open Access (`/live`, `/leaderboard`) | Real-time results feed (15s auto-poll), category/gender search filters, official VTU championship points leaderboard, 5 spotlight trophy cards. |

---

# 3. Decentralized Athlete Registration & Financial Workflow

Rather than relying on a centralized manual spreadsheet upload by the host, VTU SportsOS distributes registration authority to each participating institution's Principal and Physical Education Director (PED).

```
   College Principal / PED Logs In
   (e.g., 'ACSCE-M' for Men or 'ACSCE-G' for Women)
                  │
                  ▼
   Fills Athlete Eligibility & Bio-data
   (SSLC Name, USN, Semester, Blood Group, Dates)
                  │
                  ▼
   Validates Strict Athletic Quota Rules
   ├── Compulsory Event 1
   ├── Optional Event 2 (Non-duplicate)
   ├── Optional Reserve Event (Must differ from regular events)
   ├── 4x100m Relay Squad (Max 4 athletes per college per gender)
   └── 21km Half Marathon participation
                  │
                  ▼
   Dynamic Fee Engine Computes Total
   (₹100/regular event, ₹100/relay, ₹100/marathon, ₹0 reserve)
                  │
                  ▼
   Online Checkout (Razorpay) ──► Payment Webhook Confirms Profile
                  │
                  ▼
   Profile Set to 'PAYMENT_CONFIRMED' (Eligible for Bib Generation)
```

### 3.1 Eligibility & Bio-Data Capture
Every athlete profile requires:
1. **SSLC Name**: Full legal name as verified on high school mark cards.
2. **University Seat Number (USN)**: Verified academic identifier.
3. **Current Semester**: 1st through 8th semester.
4. **Semester Start Date & College Joining Date**: To verify academic standing.
5. **Blood Group**: Emergency medical safety record.

### 3.2 Registration Rules & Quota Engine
* **Individual Events**: Each athlete may register for a maximum of two regular events (Event 1 is compulsory; Event 2 is optional). Event 2 cannot duplicate Event 1.
* **Reserve Event**: Colleges may designate an athlete as a reserve for one event. The reserve event must be distinct from their regular events.
* **Relay Squad Quota**: Each college can register a maximum of 4 athletes for the 4x100m Relay Squad per gender.
* **Reserve Pricing**: Regular events, relay events, and the half marathon cost ₹100 each. Reserve events are free (₹0).

---

# 4. Registration Lockdown & Sequential Block Bib Generation

Once the official registration deadline passes, meet directors close the registration window via the Event Control Center:

1. **Meet Settings Lockdown**: The registration window status switches from `OPEN` to `CLOSED`, disabling all modifications by colleges.
2. **Sequential Block Bib Generator**:
   * Athletes are partitioned by gender and grouped alphabetically by institution name.
   * **Boys Squads**: Sequential block numbering starting at Bib `#100`.
   * **Girls Squads**: Sequential block numbering starting at Bib `#2001`.
   * Athletes within each college block are sorted alphabetically by their SSLC name.
3. **Master Excel Export (`.xlsx`)**: Organizers can download the complete master roster with student details, blood groups, USNs, payment IDs, and allocated bib numbers with one click.
4. **Batch CSV Ingestion**: Support for offline spreadsheet ingestion with automated chest number assignment.

---

# 5. Meet Day Physical Accreditation & Batch ID Badging

Payment confirmation does not automatically grant competition rights—athletes must physically report to the campus Accreditation Desk upon arrival.

### 5.1 Accreditation Verification Desk
* Volunteers scan the athlete's digital QR badge using the device camera or enter their bib number.
* The system checks fee payment confirmation:
  * If unpaid: Rejects accreditation and directs the squad coach to the finance desk.
  * If paid & unaccredited: Transitions profile status to `ACCREDITED`, logs the exact timestamp, and authorizes the issuance of the physical chest bib.
  * If already accredited: Shows a warning preventing duplicate badge issuance.
* Real-time progress bar tracks total confirmed versus total physically accredited athletes.

### 5.2 Batch Printable ID Badges & Bib Cards
* High-resolution, print-ready badge sheet generator.
* College and gender filters allow batch printing before delegations arrive.
* Badges include: Full Name, College, USN, Blood Group, Registered Events (regular, reserve, relay), Allocated Bib Number, and official high-contrast QR code.

---

# 6. Intelligent Track Heat Seeding Engine

Track events (100m, 200m, 400m, 800m, 1500m, 110m Hurdles, 400m Hurdles, 4x100m Relay, 4x400m Relay) require objective heat seeding.

```
   Eligible Confirmed & Accredited Athletes for Event
                          │
                          ▼
             Group Athletes by College
                          │
                          ▼
            Sort Colleges by Squad Size
                          │
                          ▼
         College-Separation Seeding Algorithm
  (Distribute teammates across Heats 1..N to avoid clashes)
                          │
                          ▼
      Randomized Lane Allocation (Lanes 1 to 8)
                          │
                          ▼
          Published to Start List & Call Room
```

### 6.1 College Separation Algorithm
* To ensure fair competition, athletes from the same college are systematically separated into different preliminary heats during Round 1.
* Heats are capped at 8 athletes (corresponding to standard 8-lane synthetic tracks).
* Lanes are assigned across Lanes 1 through 8.

---

# 7. Digital Call Room & Heat Marshalling Desk

The Call Room manages athlete reporting and track readiness prior to every heat.

### 7.1 Marshalling Workflow
* Athletes report to the Call Room 30–45 minutes prior to their event.
* Officials scan the athlete's QR badge.
* The system verifies that the athlete is marked `ACCREDITED`. If not, check-in is blocked.
* The athlete's status transitions to `REPORTED`.

### 7.2 Six Operational Marshalling States
1. `NOT_REPORTED`: Initial state. Athlete has not yet checked into the call room.
2. `REPORTED`: Verified present and ready in the marshalling pen.
3. `DNS (Did Not Start)`: Competitor failed to report within the official window.
4. `STARTED`: Athletes have left the call room and taken their marks on the track.
5. `FINISHED`: Race concluded; awaiting official timing certification.
6. `DQ (Disqualified)`: Competitor disqualified for false start or lane infringement.

### 7.3 One-Tap DNS Reserve Athlete Substitution
* If a scheduled competitor fails to report within the reporting window, the marshal marks them as `DNS`.
* The system immediately queries the database for accredited reserve athletes registered for that event from the **same college**.
* The marshal taps the available reserve athlete:
  * The absent athlete is replaced.
  * The reserve athlete is allocated the assigned lane.
  * The start list and live results console update instantly.

---

# 8. Official Results & Electronic Track Timing Engine

VTU SportsOS supports electronic timing imports and manual referee entry for track, field, and combined disciplines.

### 8.1 Electronic Track Timing Import
* Compatible with electronic track timing systems.
* Referees import the standard `.csv` export file directly from the timing computer.
* Format accepted:
  ```
  Lane, Bib, Time
  or:
  Place, Lane, Bib, Time
  ```
* The engine parses split-second timings (e.g., `10.45` or `1:52.34`), matches them to the seeded athletes by Bib or Lane, and logs the official times.

### 8.2 Field Disciplines: 3-Attempt Scorekeeper Matrix
* Applied to Shot Put, Discus Throw, Javelin Throw, Long Jump, Triple Jump, High Jump, and Pole Vault.
* Scorekeeper enters performance metrics for Attempt 1, Attempt 2, and Attempt 3.
* The engine automatically calculates the **Best Mark** (the highest valid distance or height) and ranks athletes in descending order.

### 8.3 Automated IAAF / World Athletics Qualification Engine
* **Track Events (Time-based)**: Sorted ascending (lowest time = rank 1).
* **Field Events (Distance/Height-based)**: Sorted descending (highest mark = rank 1).
* **Dual Qualification Markers**:
  * **`Q` (Automatic Qualifiers)**: The top *N* finishers in each heat (e.g., top 2 per heat) advance automatically.
  * **`q` (Next Fastest Qualifiers)**: The next fastest athletes overall across all heats advance on time.
* **Ties**: Athletes with identical times/marks receive identical rank values. Non-finishers (`DNS`, `DNF`, `DQ`) receive `null` rank and `qualified = false`.

---

# 9. Real-Time Results & University Championship Standings

### 9.1 Live Results Feed (`/live`)
* Publicly accessible, auto-refreshing feed polling every 15 seconds.
* Live countdown ticker showing the next scheduled sync.
* Multi-faceted filtering:
  * By Category: Track, Field, Relay, Combined.
  * By Gender: Men, Women, Mixed.
  * By Search Query: Athlete Name, College Name, Bib Number.
* Displays official medal badges (🥇 Gold, 🥈 Silver, 🥉 Bronze) for completed final rounds.

### 9.2 Official VTU Points Scoring Engine (`/leaderboard`)
Points are awarded for positions 1 through 8 in all championship finals:

| Finish Position | Points Awarded | Medal |
| :---: | :---: | :---: |
| **1st Place** | **10 Points** | 🥇 Gold |
| **2nd Place** | **8 Points** | 🥈 Silver |
| **3rd Place** | **6 Points** | 🥉 Bronze |
| **4th Place** | **5 Points** | — |
| **5th Place** | **4 Points** | — |
| **6th Place** | **3 Points** | — |
| **7th Place** | **2 Points** | — |
| **8th Place** | **1 Point** | — |

### 9.3 Five Spotlight Championship Trophies
1. **Overall University Champion Institution**: Highest cumulative points across all events.
2. **Best Men’s College Trophy**: Highest points scored in men’s track and field.
3. **Best Women’s College Trophy**: Highest points scored in women’s track and field.
4. **Best Male Athlete of the Meet**: Individual male competitor with highest points/golds.
5. **Best Female Athlete of the Meet**: Individual female competitor with highest points/golds.

---

# 10. Campus Logistics: Hostel & Canteen Operations

### 10.1 Warden Accommodation Check-In (`/warden`)
* Wardens scan athlete QR badges at campus hostel entrances.
* Confirms that registration fees are paid.
* Records the arrival timestamp and sets arrival status to `checked_in`.
* Prevents duplicate check-ins.

### 10.2 Canteen Digital Food Pass Scanner (`/volunteer`)
* Replaces printed food coupons with digital QR scanning.
* Active meal slot selection: Day 1–4 Breakfast, Lunch, and Dinner.
* Instant eligibility verification against the athlete registry.
* **Strict Anti-Duplicate Mechanism**: If a meal has already been redeemed for that session, the scan is rejected and displays the exact time it was claimed.
* Live audit log displays the last 10 redeemed meals on the volunteer's screen.

---

# 11. Complete Event Lifecycle Summary

| Phase | System Module | Primary Action | Key Output |
| :--- | :--- | :--- | :--- |
| **Phase 1: Pre-Meet** | College Delegation Portal (`/principal`) | Principals/PEDs register squads with SSLC bio-data & events. | Confirmed rosters, entry fees collected via Razorpay. |
| **Phase 2: Lockdown** | Admin Hub (`/admin`) | Registration window closed; sequential bib numbering executed. | Boys `#100+`, Girls `#2001+` assigned; Master Excel export. |
| **Phase 3: Accreditation** | Accreditation Desk (`/admin/accreditation`) | Arriving athletes scanned; credentials verified. | Physical ID badges issued; status set to `ACCREDITED`. |
| **Phase 4: Logistics** | Warden & Dining Desks (`/warden`, `/volunteer`) | QR scans at hostels and dining halls. | Room check-in logged; duplicate-free meal distribution. |
| **Phase 5: Seeding** | Heat Seeding Engine (`/admin/events/heats`) | Automatic 8-lane track seeding with college separation. | Published heat start lists with balanced institution distribution. |
| **Phase 6: Marshalling** | Call Room Desk (`/referee`) | Pre-race QR check-in & 1-tap DNS reserve substitutions. | Final confirmed lane rosters; no empty lanes. |
| **Phase 7: Timing** | Results Engine (`/referee/results`) | Electronic track timing import & 3-attempt field matrix. | IAAF `Q`/`q` advancement calculated; official times certified. |
| **Phase 8: Broadcast** | Public Portals (`/live`, `/leaderboard`) | Real-time score ticker & points leaderboard. | Live medal tallies & 5 Championship Trophy winners calculated. |
