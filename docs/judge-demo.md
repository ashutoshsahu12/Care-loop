# CARELOOP judge demo

CARELOOP addresses the screening-to-care gap. A result becomes an assigned case with a next step, deadlines, and a timeline. A referral can stall after it is sent. A missed visit can require outreach. Completion requires an authorized clinical outcome and evidence.

## Watch one case move

Open `/judge-demo` on the deployed app. Stay in the same tab as you switch roles. To start from the original 12 fictional cases, use **Reset synthetic cases**.

| Role | What to show | What to verify |
| --- | --- | --- |
| Care coordinator | Record a screening for Kavita Sundaram and refer it to Dr. Neha Verma. | The new case has an owner and the referral waits for acceptance. |
| Doctor | Accept the referral. Switch to the coordinator to schedule a linked appointment, record attendance, and complete a follow-up. Return as the doctor to record verified closure with an evidence note. | The referral, visit, follow-up, and closure are recorded against the same case. |
| Patient | Open **My case**, then acknowledge the new screening message in **Notifications**. | The timeline shows closure. Each notification links to its own case. |
| Administrator | Open **Escalations** and find the seeded critical case CL-P-1006. Open **Care outcomes**. | The stalled referral remains visible. The metrics reflect changes in the same synthetic cohort. |

## Verification

[GitHub Actions](https://github.com/ashutoshsahu12/Care-loop/actions) runs the build and unit checks alongside two Chromium walkthroughs. One uses the real HTTP server and local SQLite. The other uses the Vercel build with no external server, completing the same workflow and checking deep links, refresh and role switching, separate sessions, live synthetic metrics, and reset.

The hosted demo runs the same TypeScript API router, clinical workflow rules, schema, and seed in the browser with SQLite compiled to WebAssembly. The browser saves changes to session storage. It uses fictional identities and in-app notification events. The HTTP deployment can also run on Cloudflare with a configured D1 database. Healthcare deployment would require real authentication, approved data handling, message integration, and clinical review.

## Proposed pilot

Start with a screening program at one clinic, one coordinator, and one receiving clinician. Agree which results enter the pilot, how deadlines are set, who handles exceptions, and what counts as documented closure. First rehearse a stalled referral, a missed visit, and a completed case using fictional records. After clinical and governance approval, compare the pilot workflow with the clinic’s existing process over a fixed period.

| Measure | Definition |
| --- | --- |
| Verified closure | Cases with a documented, authorized closure divided by all cases in the pilot cohort |
| Overdue cases | Open cases with a next-action deadline that has passed at review time |
| Time to consultation | Elapsed time from screening to first attended consultation, reported as a median among eligible cases |
| Attendance | Attended visits divided by visits marked attended or missed |

The judge page calculates figures from the synthetic demo records. The pilot would establish operational benefit and assess the coordinator’s workload before a wider rollout.
