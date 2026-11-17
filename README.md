# Asset Ledger

A mobile-first field workspace for tracking building and heritage assets, built with Next.js (App Router), React, TypeScript and Tailwind. Sign-in and the shared workflow record use Neon (Postgres and Neon Auth).

## Run locally

1. Install packages:

   ```sh
   cd ~/Projects/asset-ledger
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` and `ALLOWED_SIGNUP_EMAILS`.
3. Create or update the database tables (safe to run again after pulling changes):

   ```sh
   npm run migrate
   ```

4. Start the app and open http://localhost:3000 (or the URL Next.js prints):

   ```sh
   npm run dev -- --hostname 127.0.0.1
   ```

5. Create an account on the sign-up page, then give it a role (see [Sign-in and roles](#sign-in-and-roles)). Without a role you can sign in but cannot use the workflow.

## Explore

- Project Dashboard: live session totals, Full-Stop blockers, review progress and asset shortcuts.
- Asset Catalogue: search by name, reference, location or discipline; filter by status; open any record.
- Asset detail: observations, metadata, evidence placeholder, review comments and editable demo status.
- Consultant Review: outstanding records only. Changing a record to Reviewed removes it from the queue when you return.

All records, names, observations and comments are synthetic. The main workspace (dashboard, catalogue and review queue) still keeps changes in browser memory only; they reset on refresh and are not tied to roles. The workflow screen is the part that is saved and role-controlled (see below). There is no upload or actual scan. Nothing is sent to consultants. Reviewed indicates demonstration completeness only, not engineering or safety approval. Full-Stop is a clearly labelled review hold, not an operational safety mechanism. No public deployment is configured by this change.

## Checks

```sh
npm test            # workflow rules, saved-operation handling and SQL splitting
npm run typecheck
npm run lint
npm run build       # needs the values in .env.local
```

GitHub runs the tests, type check and lint on every pull request and push to `main` (`.github/workflows/checks.yml`).

After a build, preview with `npm run start -- --hostname 127.0.0.1`. System fonts are used so builds do not need to fetch web fonts.

## One application: heritage conservation roadmap

Asset Ledger is the sole product and existing codebase. The supplied Heritage Ledger discussion is incorporated as heritage-conservation scope within Asset Ledger, not a separate app, starter or deployment. No downloaded starter was available or imported.

The Development Roadmap screen records seven design references: Sortly (inventory / QR), Fieldwire (drawings), OpenSpace (site documentation), Arches (heritage archive), ShareMyToolbox (movement), Kojo (costs), and Coeli Enterprise (conservation history). These are inspiration only; no integrations or product comparisons have been implemented or independently verified.

The catalogue retains the six building assets and adds four synthetic heritage elements with original identifiers GY-192, JW-582, UB-038 and HY-142. Heritage details include material, demo dimensions, original location, storage location, conservation phase and a significance note. Search also covers heritage materials and locations. Existing dashboard totals and review workflows include both kinds of record.

Planned order: persistent Element Catalogue v1 using the existing Next.js application, PostgreSQL and dedicated file storage; authentication and permissions; real evidence uploads and recorded consultant decisions; drawing-linked identification and actual QR labels; timestamped movement history; costs and long-term conservation records. Offline operation and reliable synchronization remain planned.

Full-Stop production target: hold dependent work until an authorized consultant reviews the evidence and records approval or rejection with a reason and timestamp; rejection retains the hold. The workflow screen now enforces this using the signed-in account's role and keeps a saved, append-only history. The main workspace's Full-Stop status is still in-memory and can be changed by any signed-in user. Evaluate licensing before incorporating any third-party source, including Arches.

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

You need two accounts: one with the Contractor role and one with the Consultant role (for example, two browsers or a private window).

1. As the contractor, select GY-192. Its internal check is already complete, but the consultant hold is still red. The contractor cannot release it.
2. As the consultant, add a decision reason and select **Approve / release consultant hold**. The stage turns green and the contractor gets an inbox notice. Routine work then uses the checklist and Complete and continue action.
3. As the contractor, record the next working location and start the next stage. It requires its own check.
4. In Project controls, submit a contractor change request. As the consultant, inspect and approve/reject it. A request or plan relaxation cannot clear an existing hold.

The schematic pins and evidence summaries are illustrative. No actual drawings/photos are uploaded, and no messages, emails or push notifications leave the app. Real consultant authority and owner-reserved decisions must follow project agreements; the demo does not implement those agreements. Crate references are text, not linked manifests.

Every workflow change is saved on the server (`workflow_ops` table) with the person's account, name, role and time, and all signed-in users see the same state. The server rebuilds the current state by replaying the saved changes, and checks each new change against the rules using the role from the signed-in account, never a role sent by the browser. If two people save at once, the second is told to check the updated state and try again. The screen reloads when you return to its tab; it does not push live updates. Response targets use elapsed hours; Today evaluates overdue state when you select Refresh. No working-calendar scheduler, automatic reminder, or escalation service runs. No public deployment is configured.

### Verification

With Node.js 24 (or another runtime supporting TypeScript type stripping):

```sh
npm test
npm run lint
npm run build
```

Tests cover separate authority, preservation of consultant holds, evidence changes invalidating passes, plan request decisions/version conflicts, the complete eight-stage journey, checking of saved operations (unknown actions, browser-supplied roles, who-did-it recording, replay), and the database script's statement splitting.

## Streamlined field workflow and readability

Routine stages now use a checklist, evidence/verification note and next location with **Complete and continue**. The operation records evidence, submission and the contractor check in the event history before starting the next activity. Empty evidence, unchecked checklists, unresolved questions and holds cannot be bypassed. Explicit consultant hold points still require release. Unfinished hold-point stages stay amber until submitted; active Full-Stops stay red.

**Consultant review** is non-blocking after contractor verification. A frozen evidence snapshot remains in the consultant review panel after advancement. Accepting an earlier review does not approve the current stage; raising an issue places a consultant Full-Stop on current work. **Require consultant approval at this stage** adds a current-stage hold and a reason, preserving existing contractor verification.

The visual design uses navy navigation, blue primary actions, darker text, clearer borders and labelled traffic lights. Main instructions and labels are approximately 15–16px; headings, controls and touch targets are larger. Both the existing workspace and workflow screens use the higher-contrast theme. This is not a full accessibility certification.

The workflow tests cover the streamlined operations and background-review snapshots as well as the separate consultant/contractor authority rules. No cloud storage or actual uploads have been added.

## Sign-in and roles

Pages and API routes require a signed-in account, provided by Neon Auth (email and password). The sign-in and sign-up pages are public. Copy `.env.example` to `.env.local` and fill in the values. `npm run build` needs the `NEON_AUTH_*` values present, so set them before building.

Our sign-up page accepts only emails in `ALLOWED_SIGNUP_EMAILS`, and the proxy blocks direct calls to the sign-up API. The Neon Auth service may still accept other sign-ups unless public sign-up is turned off in the Neon console. Before turning that setting off, confirm the invited sign-up still works. If it doesn't, leave the setting on and rely on the proxy block.

Each account needs a row in `user_roles` (role `Contractor` or `Consultant`). The owner adds these rows by hand, for example in the Neon SQL editor:

```sql
-- Find the account's id in the Neon console (Auth → Users), then:
INSERT INTO user_roles (user_id, role) VALUES ('<user id>', 'Consultant');
```

The workflow screen and the events API use the signed-in account's role; there is no role switcher. An account with no role can sign in but cannot read or change the workflow. Consultant decisions are recorded only by a consultant account.

### History cannot be edited

`audit_events` and `workflow_ops` record who acted (account id and name). Database triggers refuse any UPDATE, DELETE or TRUNCATE on them, so a mistaken or deliberate change to history fails. The database owner can still remove those triggers. For a stronger guarantee, give the app its own database role that can only read and insert, and use that role's connection string as `DATABASE_URL`:

```sql
CREATE ROLE asset_ledger_app WITH LOGIN PASSWORD '<strong password>';
GRANT SELECT, INSERT ON audit_events, workflow_ops TO asset_ledger_app;
GRANT SELECT ON user_roles TO asset_ledger_app;
GRANT USAGE ON SEQUENCE audit_events_id_seq TO asset_ledger_app;
```

Keep the owner connection for `npm run migrate` and for adding roles.

This is a control for a small invited group. It is not a certified audit or compliance system.

## Phone app and LiDAR scanning

`mobile/` holds the phone app (Expo, iOS and Android) for site capture: LiDAR surface and room scans on iPhone/iPad Pro, photo sets on other phones, scale checks, tap-to-measure and defect records. It records evidence only. Approvals stay in this web app. See `mobile/README.md` for build steps. The web app's lint and type-check skip `mobile/`.

### Phone sync and file storage (Cloudflare R2)

Scans, photos and defects sync from the phone to this app. Files go straight from the phone to a private Cloudflare R2 bucket using 1-hour signed upload links; they never pass through the web server. Each scan and defect also adds an `Evidence` event to `audit_events` (stage 0 unless the phone sends one).

Setup:

1. In Cloudflare, create an R2 bucket (e.g. `assetledger-scans`) and an API token with Object Read & Write on that bucket only.
2. Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET` to `.env.local` (see `.env.example`) and to the hosting environment. Never commit them.
3. Run `node --env-file=.env.local scripts/migrate.mjs` to add the `device_tokens`, `scans` and `defects` tables.
4. For each phone: `node --env-file=.env.local scripts/create-device-token.mjs <user-id> "Phone name"`. The account must already have a `user_roles` row. Enter the printed token and the web app address in the phone's Settings.
5. To block a phone, set `revoked_at` on its `device_tokens` row.

Routes:

- `GET /api/device/whoami`, `POST /api/device/uploads`, `POST /api/device/scans`, `POST /api/device/defects`: phone only, `Authorization: Bearer <device token>`. The proxy lets `/api/device/*` through and each route checks the token.
- `GET /api/scans?elementId=...`: signed-in web users. Returns scans and defects with 15-minute download links.

Repeat syncs are safe. A scan's files and capture details are fixed once received; only its scale check, measurements and notes can be updated, and each update is logged. A defect already received is not changed. Phone uploads never record consultant decisions.

Not built yet: showing scans and the 3D model on the web asset pages (the API is ready), photo-set processing into 3D models, and checking that uploaded files exist before a scan is recorded.

`node --test lib/r2.test.mjs` checks that storage paths are built only from safe IDs and file names.
