<<<<<<< HEAD
# CARELOOP — Closing the Screening-to-Care Loop

A comprehensive healthcare coordination platform designed to ensure that no patient screening result is lost to follow-up. CARELOOP tracks patients from initial screening through specialist referrals, appointment scheduling, attendance, and verified clinical closure.

---

## Architecture & Technology Stack

The project operates on a unified, high-performance TypeScript stack:

- **Backend & Care Coordination Engine (Member 2):** Cloudflare Workers (TypeScript), Cloudflare D1 (SQLite), Zod validation, and Vitest.
- **Admin, Monitoring & Analytics Dashboard (Member 3):** React, Vite, TypeScript, Tailwind CSS, and Recharts.
- **Patient Experience & Web Application (Member 1):** Mobile-first React + Vite TypeScript webapp.

### Stack Discrepancy Note & Resolution
While early project notes mentioned self-hosted n8n and Supabase/Postgres, the codebase establishes **Cloudflare Workers + Cloudflare D1 (SQLite) + React/Vite/TypeScript** as authoritative. This edge-native architecture ensures deterministic sub-millisecond response times, zero external database hosting friction, parameterized SQL safety, and full local testability without requiring external containers or SaaS services.

---

## Repository Structure

```text
Care-loop/
├── README.md                  # Project overview & architecture
├── Member 2/                  # Backend & Care Coordination Engine (Cloudflare Workers + D1)
│   ├── README.md              # Backend documentation & API contracts
│   ├── package.json           # Backend dependencies and test scripts
│   ├── wrangler.toml          # Cloudflare Workers configuration
│   ├── src/                   # Database, services, rules, and API router
│   └── tests/                 # 12 Vitest test suites (47 tests)
└── Member 3/                  # Admin, Monitoring & Analytics Workspace (React + Vite)
    ├── README.md              # Frontend module documentation
    └── src/                   # Admin UI components, dashboards, and demo data
```

---

## Quick Start

### 1. Backend & Care Coordination Workflows (Member 2)
```bash
cd "Member 2"
npm install
npm test            # Run all 12 test suites (47 tests)
npm run build       # Verify TypeScript compilation and bundle
npm run dev         # Or 'npx wrangler dev' to run locally on http://localhost:8787
```

### 2. Admin Workspace (Member 3)
Member 3 is a feature module designed to be embedded in a host React + Vite application. It provides synthetic demo mode by default and connects to the Member 2 backend when configured:
```env
VITE_CARELOOP_USE_DEMO_DATA=false
VITE_CARELOOP_API_URL=http://localhost:8787
```

---

## Safety & Compliance Invariants

1. **Synthetic Demo Data Only:** The repository contains only synthetic test data with fictional patients and care workers. No identifiable patient data is committed.
2. **Deterministic Triage & Clinical Disclaimers:** Priority and target time-to-care SLA calculations are transparent and deterministic. No automated medical diagnoses or treatment recommendations are made. Ambiguous or urgent results route directly to qualified clinical review.
3. **Verified Closure Invariant:** Referral creation or appointment attendance alone does not close a case. Verified closure strictly requires an authorized clinician or administrator, documented clinical outcome, and evidence notes.
4. **Immutable Audit Trails:** Every important state mutation records an append-only event in the case timeline.
=======
# CARELOOP frontend

CARELOOP is a responsive React, Vite, and TypeScript prototype for coordinating a synthetic screening case through notification, patient acknowledgment, referral, appointment, follow-up, clinical review, and verified closure.

## Run locally

```powershell
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Run `npm run build` to type-check and create a production build; run `npm test` for the focused patient-data and case-history tests.

## Demo access

Open **Sign in**, choose a role, and enter any password. Demo credentials and mock responses are explicitly enabled only when `VITE_API_BASE_URL` is unset. The demo has no public self-registration and does not create real accounts. Demo users:

| Role | Email |
| --- | --- |
| Administrator | `admin@careloop.demo` |
| Doctor | `doctor@careloop.demo` |
| Care coordinator | `worker@careloop.demo` |
| Patient | `patient@careloop.demo` |

No demo passwords are embedded or persisted. The patient role is linked to one synthetic case (`CL-2048`). The portal only presents that patient's scoped case information and omits internal clinical notes. Patient notifications can be acknowledged once; acknowledgment is recorded as a separate case-history event. Help requests stay in the in-app workflow.

All demo records and dashboard/analytics figures are synthetic and illustrative. The mock service layer keeps mutations in memory; they reset when the page is reloaded and are not a durable source of truth. Do not enter real patient information.

## API configuration

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend base URL, for example `http://localhost:8000/api`. The API client adds the access token as a bearer token and reports API errors rather than silently switching to mock responses. The service layer is in `src/services/`; synthetic records and recorded demo case events are in `src/mocks/`.

The patient case service expects `GET /patient/cases`, `GET /cases/:id/timeline`, `POST /cases/:id/acknowledge`, and `POST /cases/:id/help-requests`. Case closure uses `POST /cases/:id/closure` with an outcome and evidence note. These paths must be agreed with and implemented by the API owner; the frontend does not transition production case status or authorize access.

The backend must enforce authentication, role permissions, and patient-level authorization independently of frontend route guards. The frontend role guards are for navigation and UX only.

## Care closure

Sending or acknowledging a notification, creating a referral, scheduling an appointment, or completing a follow-up does not close a case. The staff closure action requires an explicit confirmation and a written evidence note; the mock records the outcome, verifying actor, timestamp, and timeline event. A production backend must enforce authorized verification, persist the evidence, and return the verified-closure record before the UI presents the case as closed.

## Simulated KPI definitions

The current admin charts are illustrative and are **not computed from the demo patient list or a live database**. For API integration, the specification defines:

| KPI | Definition |
| --- | --- |
| Notification acknowledgment rate | Acknowledged in-app notifications ÷ notifications issued. |
| Referral completion rate | Referrals marked completed ÷ referrals created; define cancelled/rejected treatment consistently. |
| Appointment attendance rate | Appointments attended ÷ appointments due with a recorded attendance outcome. |
| Average time to consultation | Elapsed time from screening record to consultation timestamp, averaged across eligible cases. |
| Overdue case count | Open cases whose required next-action due date has passed. |
| Verified closure rate | Cases with authorized verification ÷ cases eligible for closure. |

Use database/API aggregates for production metrics and make numerator/denominator rules visible. Do not treat the sample figures as operational results.
>>>>>>> 61338a4 (Initial Commit)
