# VTU SportsOS — Central Inter-Collegiate Athletics Platform

Modern, multi-tier athletic meet management, collegiate squad registration, offline accreditation scanning, contiguous bid allocation, heat seeding, and real-time live scoring system for VTU athletic championships.

---

## Architecture Overview

```text
vtu-athletics/
├── backend/                  # Central REST API (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/           # Database & Supabase connection
│   │   ├── middleware/       # JWT Auth & Role guards
│   │   ├── routes/           # Auth, Squads, Admin, Finance, Accreditation, Public
│   │   ├── utils/            # Passphrases & bcrypt hashing
│   │   └── server.ts         # Express server (Port 5000)
│   └── package.json
│
├── frontend/
│   ├── web/                  # Web App (Next.js 16 + React 19 + TypeScript)
│   │   ├── src/app/          # Squad Portal, Admin Management, Finance Desk, Live Backup
│   │   └── package.json
│   │
│   └── mobile/               # Mobile App (React Native + Expo + TypeScript)
│       ├── android/          # Native Android Project (Gradle / Kotlin)
│       ├── ios/              # Native iOS Project (Xcode / CocoaPods)
│       ├── App.tsx           # Mobile entry point
│       └── package.json
│
├── supabase/
│   └── migrations/           # Central PostgreSQL Migrations (0001 - 0014)
│       ├── 0001_colleges_squads_staff.sql
│       ├── 0002_events_catalogue.sql
│       ├── 0003_profiles_registrations.sql
│       ├── 0004_payments.sql
│       ├── 0005_registration_lock_bids.sql
│       └── 0006_accreditation.sql
│
└── docs/                     # Architectural specifications & execution plans
```

---

## Getting Started

### 1. Database (Supabase Local)
```bash
npx supabase start
```
- API URL: `http://127.0.0.1:54321`
- Database URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

### 2. Central Backend API
```bash
cd backend
npm install
npm run dev      # Runs with tsx on http://localhost:5000
```
- Health Check: `http://localhost:5000/health`
- Events Catalogue: `http://localhost:5000/api/events`

### 3. Web Portal (Registration, Admin & Finance)
```bash
cd frontend/web
npm install
npm run dev      # Runs Next.js on http://localhost:3000
```

### 4. Mobile Apps (Android & iOS)
```bash
cd frontend/mobile
npm install
npx expo start   # Runs Expo development server
npm run android  # Builds and launches Android app
npm run ios      # Builds and launches iOS app (macOS only)
```
