# Asset Ledger

A mobile-first field workspace built on the existing Next.js App Router scaffold. Uses the original React, TypeScript, Tailwind and ESLint setup without additional dependencies.

## Run locally

```sh
cd ~/Projects/asset-ledger
npm install
npm run dev -- --hostname 127.0.0.1
```

Open http://localhost:3000. If that port is already in use, use the local URL printed by Next.js.

## Explore

- Project Dashboard: live session totals, Full-Stop blockers, review progress and asset shortcuts.
- Asset Catalogue: search by name, reference, location or discipline; filter by status; open any record.
- Asset detail: observations, metadata, evidence placeholder, review comments and editable demo status.
- Consultant Review: outstanding records only. Changing a record to Reviewed removes it from the queue when you return.

All records, names, observations and comments are synthetic. Session changes use React memory only and reset on refresh. There is no database, authentication, access control, upload, actual scan, or backend. Nothing is sent to consultants. Reviewed indicates demonstration completeness only, not engineering or safety approval. Full-Stop is a clearly labelled review hold, not an operational safety mechanism. No public deployment is configured by this change.

## Checks

```sh
npm run lint
npm run build
```

After a build, preview with `npm run start -- --hostname 127.0.0.1`. System fonts are used so builds do not need to fetch web fonts.

## One application: heritage conservation roadmap

Asset Ledger is the sole product and existing codebase. The supplied Heritage Ledger discussion is incorporated as heritage-conservation scope within Asset Ledger, not a separate app, starter or deployment. No downloaded starter was available or imported.

The Development Roadmap screen records seven design references: Sortly (inventory / QR), Fieldwire (drawings), OpenSpace (site documentation), Arches (heritage archive), ShareMyToolbox (movement), Kojo (costs), and Coeli Enterprise (conservation history). These are inspiration only; no integrations or product comparisons have been implemented or independently verified.

The catalogue retains the six building assets and adds four synthetic heritage elements with original identifiers GY-192, JW-582, UB-038 and HY-142. Heritage details include material, demo dimensions, original location, storage location, conservation phase and a significance note. Search also covers heritage materials and locations. Existing dashboard totals and review workflows include both kinds of record.

Planned order: persistent Element Catalogue v1 using the existing Next.js application, PostgreSQL and dedicated file storage; authentication and permissions; real evidence uploads and recorded consultant decisions; drawing-linked identification and actual QR labels; timestamped movement history; costs and long-term conservation records. Offline operation and reliable synchronization remain planned.

Full-Stop production target: hold dependent work until an authorized consultant reviews the evidence and records approval or rejection with a reason and timestamp; rejection retains the hold. The current demo cannot enforce this and does not provide an authorization boundary or durable audit trail. Any demo user can change its in-memory status. Evaluate licensing before incorporating any third-party source, including Arches.

## Drawing and stage-check workflow lab

Open `/workflow` or choose **Drawing & stage checks** in the main workspace. The existing catalogue is preserved; the workflow's synthetic stage scenarios are separate from catalogue snapshots. No third-party code was incorporated.

### Separate responsibilities

- Contractor: records evidence, submits checks, passes internal quality checks, records next working locations, and proposes oversight changes.
- Consultant: controls the asset oversight plan on the client's behalf within the assumed demo delegation. Reviews contractor requests, authorizes or rejects plan changes, and approves/releases consultant-controlled holds after internal verification.
- A hold-point stage requires both checks. Contractor passes and comments never release consultant holds. Consultant approval cannot replace the internal check. A consultant question also requires consultant resolution even where routine consultant approval was not originally required.
- A Full-Stop from either party reopens evidence, invalidates previous passes and requires repeat checks. Consultant holds remain until consultant release. A new stage needs its own evidence/checks.
- Current controls are read-only in the contractor view. Contractors can draft change requests, which do not change the active plan. Consultants can approve or reject with reasons. Requests based on superseded plan versions cannot be approved.
- Consultants can publish revised oversight requirements with reasons. New versions affect subsequent stage starts only. Current holds and checks retain their snapshots. The contractor receives a session notice of published changes and request decisions.

### Try it

1. In Contractor mode, select GY-192. Its internal check is already complete, but the consultant hold is still red. The contractor cannot release it.
2. Switch to Consultant, add a decision reason and select **Approve / release consultant hold**. The stage turns green and the contractor gets a session notice. Routine work then uses the checklist and Complete and continue action.
3. Switch back to Contractor, record the next working location and start the next stage. It requires its own check.
4. In Project controls, submit a contractor change request. Switch to Consultant to inspect and approve/reject it. A request or plan relaxation cannot clear an existing hold.

The schematic pins, evidence summaries, role switches, plan authority and notifications are local simulations only. No actual drawings/photos are uploaded, no secure authentication/authorization exists, and no messages, emails or push notifications leave the app. Real consultant authority and owner-reserved decisions must follow project agreements; the demo does not implement those agreements. Crate references are text, not linked manifests.

Session state resets on refresh or leaving the workflow page. Updates do not synchronize between browsers or users. Event history is not a durable audit trail. Response targets use elapsed hours; Today evaluates overdue state when timing is refreshed. No working-calendar scheduler, automatic reminder, or escalation service runs. No public deployment is configured.

### Verification

With Node.js 24 (or another runtime supporting TypeScript type stripping):

```sh
node --test app/workflow/workflow.test.mjs
npm run lint
npm run build
```

Tests cover separate authority, preservation of consultant holds, evidence changes invalidating passes, plan request decisions/version conflicts, and the complete eight-stage journey.

## Streamlined field workflow and readability

Routine stages now use a checklist, evidence/verification note and next location with **Complete and continue**. The operation records evidence, submission and the contractor check in the event history before starting the next activity. Empty evidence, unchecked checklists, unresolved questions and holds cannot be bypassed. Explicit consultant hold points still require release. Unfinished hold-point stages stay amber until submitted; active Full-Stops stay red.

**Consultant review** is non-blocking after contractor verification. A frozen evidence snapshot remains in the consultant review panel after advancement. Accepting an earlier review does not approve the current stage; raising an issue places a consultant Full-Stop on current work. **Require consultant approval at this stage** adds a current-stage hold and a reason, preserving existing contractor verification.

The visual design uses navy navigation, blue primary actions, darker text, clearer borders and labelled traffic lights. Main instructions and labels are approximately 15–16px; headings, controls and touch targets are larger. Both the existing workspace and workflow screens use the higher-contrast theme. This is not a full accessibility certification.

The 16 workflow checks cover the streamlined operations and background-review snapshots as well as the separate consultant/contractor authority rules. No cloud storage, actual uploads or secure accounts have been added.

## Sign-in and roles

Pages and API routes require a signed-in account, provided by Neon Auth (email and password). The sign-in and sign-up pages are public. Copy `.env.example` to `.env.local` and fill in the values. `npm run build` needs the `NEON_AUTH_*` values present, so set them before building.

Our sign-up page accepts only emails in `ALLOWED_SIGNUP_EMAILS`, and the proxy blocks direct calls to the sign-up API. The Neon Auth service may still accept other sign-ups unless public sign-up is turned off in the Neon console. Before turning that setting off, confirm the invited sign-up still works. If it doesn't, leave the setting on and rely on the proxy block.

Each account needs a row in `user_roles` (role `Contractor` or `Consultant`). The owner adds these rows by hand. Event writes use the signed-in account's role, and an account with no role cannot write events. Consultant decisions are recorded only by a consultant account.

This is a demo-grade control for a small invited group. It is not a full audit or compliance system.
