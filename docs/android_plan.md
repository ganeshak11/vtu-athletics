Android app plan: VTU SportsOS (Dr. ACS AURA 2026)

The meet runs 7–10 December 2026, so we have about 4 weeks. Officials’ phones need the app installed and tested by around 1 December, and students need it before they arrive.

What already exists
frontend/mobile: a single-screen Expo prototype (SDK 58, one 1,049-line App.tsx). It already has athlete login, a QR pass, a camera scanner, and PIN login for food, warden and accreditation staff. It’s a good proof of concept, but not production-ready: the server address is hard-coded to a local machine, there’s no navigation, and there’s no offline handling.
The Express backend (backend/) already has the official routes, all login-protected: accreditation scan, hostel check-in, meal scan (with duplicate blocking), call room inspection, schedule and heats, and athlete login plus profile.
The database already has the meal log, hostel allocations, accreditation scans, call room inspections, and schedule items with a call-room time per event.
Missing entirely: notifications. The docs’ own audit lists them as “zero implementation”.
Two blockers to fix before anything else
The QR formats don’t match. Printed ID cards encode VTU-ATH-2026|USN:…|BIB:…|NAME:…, but the scanners expect vtu-athlete:<database id>. As things stand, scanning a printed card at the canteen or hostel would fail. The format is also unsigned, so anyone could generate a fake one. → Switch to one signed QR format, and settle it before ID cards are printed.
Bib-number login exposes other students’ details. The current athlete login accepts any bib number or USN, so typing 101 shows someone else’s photo, USN and blood group. → Scanning the QR on their own ID card logs them in directly. Typing a bib number also requires a second check, such as the last 4 digits of their Aadhaar.
The two apps

One codebase, two separate Android apps (built as separate packages from the same Expo project). Students only ever see the student app, and officials’ phones only have the scanner.

1. Student app (“AURA Athlete”)
Screen	Shows
Login	Scan own ID-card QR, or bib + last 4 Aadhaar digits
My Pass	Photo, name, college, bib, blood group, accreditation status, and a large QR to show to officials
My Events	Each event with date, call room time, start time, heat and lane once seeded, relay leg, and live status (Scheduled / Call room open / Delayed / Done)
Meals & Stay	Hostel and room; which meals have been used today
Results	Own results (later phase)

Notifications at 30, 10 and 5 minutes before call room:

Scheduled on the phone itself from the athlete’s schedule, so they fire even without internet at the stadium. This is the main mechanism.
Server push messages for anything that changes: “Call room OPEN for 100m Heat 2”, a delay, or a heat re-draw. When a push arrives, the app reschedules its local reminders.
Android limits to handle: Android 13+ asks the user for notification permission, Android 12+ restricts exact-time alarms, and battery saving can delay reminders. The app will ask for these permissions on first launch, with a short explanation.
I’ll check these against the Expo SDK 58 docs before building.
2. Officials app (“AURA Officials”)
Login: staff PIN, which decides what the app becomes. I recommend 6-digit PINs, since 4-digit ones are easy to guess.
Food volunteer: the current meal (Breakfast, Lunch, Snacks or Dinner) is chosen automatically from the time of day, with a manual override → scan → large green ✓ or red ✗. A repeat shows “Already claimed at 12:41”.
Warden: scan → check-in shown with hostel and room → duplicate check-ins blocked.
Call room official: pick a heat → shows who has reported and who is missing → scan to mark Reported → mark DNS (did not start) and substitute a reserve with one tap.
Accreditation desk: scan on arrival → marks the athlete accredited (blocked if their fee isn’t verified).
Every scan result shows the athlete’s photo, name, college and bib in large text, so the official can check the face against the person standing there.
Manual bib entry for damaged cards; sound and vibration feedback.
Offline queue: scans are stored when the network drops and sent later. Each scan carries its own ID, so a resend is never counted twice (the meal-scan code already supports this).
Backend and database work needed
One shared lookup: QR (signed or the old printed format) or bib → athlete. All scanners use it.
Athlete profile now also returns photo, events, heats and lanes, schedule, hostel and meals.
A call-room scan that works from the athlete alone: “scan athlete → find their heat that’s open in the call room”. Today the official has to pick the athlete’s heat entry by ID first.
A table storing each phone’s push address, and sending pushes through Expo Push, triggered when an admin opens a call room, delays an event or re-draws heats.
Admin web: schedule controls (“Open call room”, “Delay by N min”) that trigger those pushes.
The ID card QR in IdCardsClient.tsx switches to the signed format before cards are printed.
Phases
Phase	Work	Target
0. Foundations	Signed QR + shared lookup, secure athlete login, project restructure (two apps, real server address, navigation)	Nov 8–12
1. Officials app	PIN login, the 4 scanner modes, photo check screen, offline queue	Nov 13–20
2. Student app	Login, Pass, My Events, Meals & Stay, cached for offline use	Nov 18–24
3. Notifications	On-phone reminders at 30/10/5 min, push addresses, admin triggers	Nov 22–28
4. Field test	Real Android phones, poor network, a 100-scan meal rush, printed cards	Nov 29 – Dec 3
5. Rollout	Install the officials APK on volunteers’ phones; publish the student APK and a download QR	Dec 4–6
Things you’ll need to decide or arrange
Distribution: a new personal Play Store account must run a closed test (currently 12 testers for 14 days) before it can publish publicly. That’s tight for a 7 December meet. I recommend a downloadable APK from the website (download QR on the ID card or in the WhatsApp group), with the Play Store as optional. Please double-check the current Play Store rule; I’m going from memory.
iPhone students: they can’t install an Android APK. I’d add a simple “My Events” page on the website for them, without push notifications.
Data the app depends on: the schedule (dates, call-room times) must be entered from Order of Events, heats seeded, and hostel rooms allocated. There’s currently no admin screen for hostel allocation.
Scope: CLAUDE.md says to work only on web registration, so it needs updating to include frontend/mobile and backend/.
I've read the docs, the existing Expo app and the Express backend, and written the Android plan. Nothing is built yet. The plan starts by fixing the ID-card QR, because 2 blockers must be settled before cards are printed: the QR mismatch and login by bib number alone.
Approve this plan and start Phase 0?
Discuss changes first

Discuss changes first

Sure. What would you like to change? These are the parts most open to a different call:

Two apps or one. I proposed two separate apps from one codebase. One app with a “Student / Official” switch on the first screen is simpler to share, but students would see the officials’ login.
How students log in. I proposed scanning their own ID-card QR, or bib number + last 4 Aadhaar digits. Alternatives: bib + USN, bib + date of birth, or QR scan only.
Reminder times. I proposed 30, 10 and 5 minutes before call room. Should it also remind the evening before or 1 hour before, and should students choose for themselves?
Which officials get the app. I proposed food, warden, call room and accreditation desk. Referees (result entry) stay on the web. Add or drop any?
Distribution. I proposed a downloadable APK first, with the Play Store optional. Do you already have a Play Store developer account, or a college or organisation account?
iPhone students. I proposed a “My Events” page on the website for them. Or skip it?
Timeline and order. Officials’ app first, then students. Would you rather start with the student app?
Anything missing, such as live results, medal table, transport routes, or venue map in the student app.

Tell me which points to change, or describe it your own way, and I’ll revise the plan.

Lets do 2 apps with names AURA Athlets and AURA Officials
and students login with there bib number and dob.
reminder times just set it for whatever you proposed i will change later if required
no every one gets the apps even refrees, cuz we cants afford network loses in app atleast we can store in a system or local device and then sync to server / db later
i have a play store deve;opers account
and also i want ios app ready to but apple developers account
start with students its simple and will be finished quick
and in officials there are lot of things to be added i will tell you later once student is finished