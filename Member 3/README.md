# Member 3 — Admin, Monitoring & Analytics

This directory contains the Member 3 contribution to CARELOOP — Closing the Screening-to-Care Loop.

## Delivered modules

1. **Admin workspace shell** — responsive sidebar navigation and section switching.
2. **Admin Dashboard** — six KPI cards and recent escalations.
3. **Case Monitoring** — searchable case list with status and priority filters.
4. **Escalation Monitoring** — overdue referrals, missed appointments, unacknowledged notifications, unresolved cases, and unassigned cases.
5. **Lost-to-Follow-Up Monitoring** — rule-based risk reasons, overdue days, ownership, and suggested next action.
6. **Analytics & Reports** — referral completion, appointment attendance, notification acknowledgement, average time to consultation, verified closure, unresolved cases, and trend charts.

## Source layout

```text
Member 3/
├── README.md
└── src/
    ├── features/
    │   └── admin/
    │       ├── AdminApp.tsx
    │       ├── AdminDashboard.tsx
    │       ├── CaseMonitoring.tsx
    │       ├── EscalationMonitoring.tsx
    │       ├── LostToFollowUp.tsx
    │       ├── Analytics.tsx
    │       ├── index.ts
    │       ├── components/
    │       │   ├── StatCard.tsx
    │       │   ├── CaseTable.tsx
    │       │   ├── AlertList.tsx
    │       │   └── AnalyticsCharts.tsx
    │       └── services/
    │           ├── adminService.ts
    │           └── demoData.ts
    ├── services/
    │   └── api.ts
    └── types/
        └── admin.ts
```

## Demo mode

The admin modules use fictional, synthetic demonstration records by default. This allows the interface to be demonstrated before the backend API is available. The UI labels this mode as **DEMO DATA**.

To use the backend instead, set this environment variable in the host Vite application:

```env
VITE_CARELOOP_USE_DEMO_DATA=false
VITE_CARELOOP_API_URL=https://your-api-base-url
```

Do not put secrets in Vite environment variables; values prefixed with `VITE_` are exposed to the browser.

## API contracts expected from the backend team

- `GET /api/admin/overview`
- `GET /api/admin/cases`
- `GET /api/admin/escalations`
- `GET /api/admin/at-risk`
- `GET /api/admin/analytics`

These are expected contracts, not confirmed deployed endpoints. Confirm response shapes and field names with Member 2 before switching off demo mode.

## Host application requirements

This is a feature module intended to be imported into the team's host React application. The host app must provide:

- React
- TypeScript
- Tailwind CSS
- Recharts

Import the standalone workspace with:

```tsx
import { AdminApp } from "./features/admin";

export default function App() {
  return <AdminApp />;
}
```

The repository's root configuration and other members' folders are intentionally untouched. No root package, router, build configuration, or dependency files have been created or modified by this contribution.

## Safety and integration notes

- Use synthetic demonstration data only; never commit real patient or medical information.
- Coordinate API response contracts and shared status definitions with the backend team.
- Due-date and risk calculations should be confirmed against the team's agreed business rules.
- All Member 3 work must remain inside `Member 3/`.

## Code review and build readiness

- Local relative imports were checked against the files in this directory; all 42 checked import references resolve.
- Vite environment variables used by the API service have local TypeScript declarations in `src/types/env.d.ts`.
- Recharts tooltip configuration uses the library's default formatter to reduce version-specific TypeScript incompatibilities.
- The case table and escalation list use compatibility-safe string formatting.

**Build status:** A full production build has not yet been run. This folder is a feature module, not a standalone app: the repository root currently does not provide a package manifest, TypeScript/Vite configuration, or installed React/Recharts dependencies. The host application must provide React, React DOM, Vite, TypeScript, Tailwind CSS and Recharts and include this folder in its TypeScript build. Do not mark the module as build-tested until the host app's actual build succeeds.
