# Member 2 — Backend & Care Coordination Engine

This directory contains the Member 2 contribution to **CARELOOP — Closing the Screening-to-Care Loop**.

---

## 1. Stack Analysis & Resolution

### The Stack Discrepancy
- The architecture specification for this task specifies: **React + Vite + TypeScript, Cloudflare Workers + TypeScript, Cloudflare D1 (SQLite), Zod, Vitest, and Playwright**.
- The public repository README formerly described: **self-hosted n8n, Supabase/Postgres, Gemini for patient-facing language, a mobile web app, and a care-team dashboard**.

### Authoritative Stack Determination
Inspection of the checked-out repository reveals:
1. `Member 3/` is implemented entirely in **React + Vite + TypeScript** with standard REST fetch requests to `/api/admin/*` and environment variable binding via `VITE_CARELOOP_API_URL`.
2. There are **zero** n8n workflow definitions, **zero** Supabase configuration files, and **zero** PostgreSQL migration scripts in the codebase.
3. Member 3 explicitly left root configuration and other members' spaces untouched to avoid collisions.

**Resolution:**
The task specification's **Cloudflare Workers + TypeScript + Cloudflare D1 (SQLite) + Zod + Vitest** is established as **authoritative**. It integrates seamlessly with Member 3's existing TypeScript contracts and provides:
- Safe parameterized SQL queries using Cloudflare D1's SQLite API (`db.prepare().bind()`).
- Strict schema validation with Zod.
- Standard Web Fetch API runtime (`Request`, `Response`) for edge execution.
- High-speed, zero-dependency in-memory testing with Vitest.
- No heavy external service dependencies (no self-hosted n8n, Docker, or Supabase required to run or test).

---

## 2. Implemented Features & Workflows

### 1. Screening Result Submission & Automated Case Creation
- **Endpoint:** `POST /api/screenings`
- Evaluates incoming screening metrics through a deterministic clinical triage rule engine (`triageRules.ts`).
- Sets SLA due dates deterministically:
  - **Critical** (e.g. hypertensive crisis systolic >= 180 mmHg, severe NPDR / proliferative retinopathy): 24-hour SLA, requires clinician review, flagged as `critical`.
  - **High** (e.g. Stage 2 hypertension, moderate NPDR, positive VIA): 72-hour SLA, requires clinician review, flagged as `high`.
  - **Medium** (e.g. Stage 1 / elevated BP, mild NPDR): 7-day SLA for care worker intake, flagged as `medium`.
  - **Low** (routine normal): 14-day SLA, flagged as `low`.
- Auto-creates case in `cases` table with mandatory `due_at` and `next_action`.
- Generates a patient notification record and logs an immutable `case_created` audit event.

### 2. Case Retrieval, Assignment & Validated State Transitions
- **Endpoints:** `GET /api/cases`, `GET /api/cases/:id`, `PATCH /api/cases/:id/assign`, `PATCH /api/cases/:id/status`
- Full filtering support: `status`, `priority`, `assignedCareWorker`, `search`.
- Composite case detail graph returning patient profile, screening findings, referrals, appointments, tasks, closure records, and full audit timeline.
- Enforces state machine rules (`stateMachine.ts`):
  - Valid progression: `unassigned` -> `screening` -> `referred` -> `appointment_scheduled` -> `in_care` -> `completed` (via verified closure only) / `overdue`.
  - Direct transition to `completed` via standard status update is **blocked**; completion strictly requires the verified closure workflow.
  - Reopening a completed case is restricted to authorized clinicians or administrators.

### 3. Patient & Care Worker Acknowledgement
- **Endpoint:** `POST /api/notifications/:id/acknowledge`
- Records acknowledgement timestamp and marks status as `acknowledged`.
- Records immutable `patient_acknowledged` audit event on the case timeline.

### 4. Referral Creation & Clinician Handoffs
- **Endpoints:** `POST /api/cases/:id/referrals`, `GET /api/cases/:id/referrals`, `PATCH /api/referrals/:id`
- Records destination facility, specialty, urgency, and handoff clinician notes.
- Automatically transitions case status to `referred` and updates `next_action`.
- Records `referral_created` and `clinician_handoff` immutable audit events.

### 5. Appointment Scheduling & Attendance Recording
- **Endpoints:** `POST /api/cases/:id/appointments`, `PATCH /api/appointments/:id/attendance`
- Schedules consultations, transitioning case status to `appointment_scheduled`.
- Attendance outcomes:
  - `attended`: Transitions case to `in_care`, updates `next_action` to record follow-up/treatment plan.
  - `no_show`: Transitions case to `overdue`, updates `next_action` to reschedule missed appointment.
  - Records `attendance_recorded` audit event with provider notes.

### 6. Follow-Up Task Management
- **Endpoints:** `POST /api/cases/:id/tasks`, `PATCH /api/tasks/:id`, `GET /api/cases/:id/tasks`
- Enables care coordinators to create and assign tasks with due dates.
- Completing a task logs `follow_up_task_completed` audit event on the case.

### 7. Overdue Detection & Rule-Based Escalation Engine
- **Endpoints:** `GET /api/admin/escalations`, `GET /api/admin/at-risk`
- Detects actionable care gaps:
  - `overdue_referral`: Referrals pending acceptance >= 3 days or case past due date.
  - `missed_appointment`: No-show appointments without subsequent rescheduled visits.
  - `unacknowledged_notification`: Notifications unacknowledged > 48 hours.
  - `unassigned_case`: Active cases without an assigned care worker > 24 hours.
  - `unresolved_case`: Cases past target due date (`due_at < NOW()`).
- Computes Lost-to-Follow-Up risk reasons (`overdue_acknowledgement`, `pending_referral`, `missed_appointment`, `no_recent_follow_up`).
- Calculates `overdueDays`, `riskLevel`, and deterministic `suggestedNextAction`.

### 8. Immutable Audit Event Chronicle
- **Endpoint:** `GET /api/cases/:id/timeline`
- Append-only `case_events` table tracking actor ID, actor role, event type, status transition, summary, and structured metadata.
- Chronologically ordered audit trail for regulatory and clinical compliance.

### 9. Verified Case Closure Safety Rules
- **Endpoint:** `POST /api/cases/:id/close`
- **Mandatory Safety Invariant:** Referral creation or appointment scheduling alone does **NOT** prove completed care.
- Closure strictly requires:
  1. Authorized clinical role (`clinician` or `admin`). Care workers and patients cannot close cases (403 Forbidden).
  2. Documented clinical outcome (`care_completed`, `treatment_plan_established`, `declined_care`, `lost_to_follow_up_exhausted`).
  3. Evidence note of at least 10 non-whitespace characters documenting verification.
  4. Timestamp and verification actor details stored in `closure_records`.
  5. Immutable `verified_closure` case event logged to timeline.

---

## 3. Database Schema (Cloudflare D1 / SQLite)

The database schema (`src/db/schema.sql`) implements 10 relational tables:

1. `users` — Care team members, clinicians, administrators, and patients.
2. `patients` — Demographics, contact info, and patient references (`CL-P-1001` through `CL-P-1012`).
3. `screening_results` — Ingested screening tests, clinical scores, urgency, and raw telemetry.
4. `cases` — Care coordination cases (`CL-1001` through `CL-1012`), status, priority, owner, `next_action`, and `due_at`.
5. `referrals` — Specialist referrals, receiving facility, status, and clinician handoff notes.
6. `appointments` — Clinic appointments, scheduled timestamps, attendance status, and provider notes.
7. `notifications` — Sent and acknowledged alerts for patients and providers.
8. `follow_up_tasks` — Care worker tasks and due dates.
9. `case_events` — **Append-only** immutable audit timeline.
10. `closure_records` — Verified case closure documentation with evidence notes.

Synthetic demonstration records matching Member 3's exact demo dataset (`CL-1001` to `CL-1012`) are loaded from `src/db/seed.sql`.

---

## 4. Member 3 (Admin) API Compatibility

All Member 3 expected contracts are fully satisfied:

| Endpoint | Method | Response Type | Description |
|---|---|---|---|
| `/api/admin/overview` | `GET` | `AdminOverview` | Total patients, cases, pending, completed, overdue, unassigned |
| `/api/admin/cases` | `GET` | `CaseRecord[]` | Filterable by `status`, `priority`, `assignedCareWorker`, `search` |
| `/api/admin/escalations` | `GET` | `EscalationRecord[]` | Overdue referrals, missed appointments, unassigned cases |
| `/api/admin/at-risk` | `GET` | `AtRiskCase[]` | Lost-to-follow-up cases with risk reasons and suggested actions |
| `/api/admin/analytics` | `GET` | `AdminAnalytics` | Completion rates, attendance rates, closure rates, and trend series |

### Connecting Member 3 Frontend to Member 2 Backend
To switch Member 3 out of demo mode:
1. In the host Vite application, configure `.env`:
   ```env
   VITE_CARELOOP_USE_DEMO_DATA=false
   VITE_CARELOOP_API_URL=http://localhost:8787
   ```
2. Start the Member 2 backend worker on port 8787.
3. Member 3 will now display live data served by Cloudflare Workers and D1!

---

## 5. Directory Structure

```text
Member 2/
├── README.md                  # This documentation
├── package.json               # Backend dependencies and test scripts
├── tsconfig.json              # Strict TypeScript configuration
├── vitest.config.ts           # Vitest test configuration
├── wrangler.toml              # Cloudflare Workers & D1 configuration
├── .env.example               # Environment template (no secrets)
├── src/
│   ├── index.ts               # Root exports
│   ├── worker.ts              # Cloudflare Worker fetch handler
│   ├── types/
│   │   ├── admin.ts           # Types aligned with Member 3
│   │   ├── audit.ts           # Audit events and timeline types
│   │   ├── auth.ts            # Roles and user context
│   │   ├── domain.ts          # Core domain models
│   │   └── index.ts
│   ├── db/
│   │   ├── client.ts          # D1 SQLite client abstraction
│   │   ├── schema.sql         # Database DDL
│   │   ├── seed.sql           # Synthetic demo dataset
│   │   └── seed.ts            # Migration & seed runner
│   ├── validation/
│   │   └── schemas.ts         # Zod schemas for all mutations & queries
│   ├── rules/
│   │   ├── stateMachine.ts    # Allowed/blocked status transitions
│   │   ├── triageRules.ts     # Deterministic clinical triage & SLA rules
│   │   ├── escalationRules.ts # Overdue & lost-to-follow-up detection
│   │   └── closureRules.ts    # Verified case closure safety rules
│   ├── services/
│   │   ├── authService.ts     # Role-based access control
│   │   ├── caseService.ts     # Case lifecycle & screening ingestion
│   │   ├── referralService.ts # Referrals & clinician handoffs
│   │   ├── appointmentService.ts # Appointments & attendance
│   │   ├── taskService.ts     # Follow-up tasks
│   │   ├── notificationService.ts # Notifications & acknowledgement
│   │   ├── escalationService.ts # Escalation monitoring
│   │   ├── analyticsService.ts  # Admin overview & analytics
│   │   └── timelineService.ts # Immutable audit timeline
│   └── routes/
│       └── router.ts          # Web Fetch API router
└── tests/
    ├── helpers/
    │   └── testDb.ts          # Isolated in-memory database helper
    ├── auth.test.ts           # Role permissions and boundary checks
    ├── stateMachine.test.ts   # State machine transition rules
    ├── screeningCaseCreation.test.ts # Screening ingestion & SLA rules
    ├── referralHandoff.test.ts # Referral & clinician handoffs
    ├── appointmentAttendance.test.ts # Appointments & attendance outcomes
    ├── followUpTasks.test.ts  # Follow-up tasks
    ├── overdueEscalation.test.ts # Overdue & at-risk detection
    ├── verifiedClosure.test.ts # Verified case closure enforcement
    ├── auditTimeline.test.ts  # Immutable audit events & timeline
    ├── adminApiContracts.test.ts # Member 3 contract compliance
    └── edgeCasesAndWorkflows.test.ts # CORS, validation, unassignment
```

---

## 6. How to Run and Test

### Prerequisites
- Node.js >= 20 (Node 22 or 26 recommended)
- npm

### 1. Install Dependencies
```bash
cd "Member 2"
npm install
```

### 2. Run Test Suite
To run all 11 test suites (39 tests):
```bash
npm test
```

To run tests with code coverage:
```bash
npm run test:coverage
```

### 3. Verify TypeScript Build
```bash
npm run build
```

### 4. Deploy or Run Locally with Cloudflare Wrangler
```bash
# Run locally with Cloudflare Workers emulation
npx wrangler dev

# Deploy to Cloudflare Workers
npx wrangler deploy
```

---

## 7. Assumptions & Safety Adherence

1. **Synthetic Demo Data Only:** All data in `src/db/seed.sql` uses fictional patient names, mock phone numbers, and synthetic clinical screening readings. No real PHI or PII is included.
2. **Deterministic Rules & Medical Disclaimers:** Automated triage calculations compute priority and target time-to-care SLA deterministically. No automated clinical diagnoses or treatment recommendations are made. Any high or critical finding requires qualified human clinician review.
3. **Role Permission Enforcement:** Role checks are enforced at the API router boundary.
4. **Parameterized SQL:** All database operations utilize prepared statements with parameter binding to prevent SQL injection.
