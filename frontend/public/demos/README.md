# Demo Videos (`public/demos/`)

Self-hosted lesson videos for the Sentinel Academy (`/training`) and
marketing pages are stored here. Each file maps to a lesson in
`frontend/lib/academy-content.ts`.

## Sandbox role walkthroughs (this folder's primary content)

These are the interactive marketing sandbox videos -- recorded against the
DemoSandbox on `/landing/workflows` (no auth, fake data, read-only).

| File | Source | Academy lesson slug |
|---|---|---|
| `demo-sandbox-ceo.webm` (+ `.mp4`) | CEO scenario: portfolio risk -> WBS drill -> audit trail | `demo-sandbox-ceo` |
| `demo-sandbox-pm.webm` (+ `.mp4`) | PM scenario: WBS roll-up -> duplicate-block -> on-track | `demo-sandbox-pm` |
| `demo-sandbox-audit.webm` (+ `.mp4`) | AUDIT scenario: forensics queue -> audit trail -> reconciliation | `demo-sandbox-audit` |
| `demo-sandbox-walkthrough.webm` (+ `.mp4`) | All three roles in sequence -- marketing asset | (not an academy lesson) |

## Legacy lesson videos (placeholder stubs)

These filenames are registered in `ACADEMY_LESSONS` for real application
flows. When the recordings exist they supersede these placeholders.

- `onboarding.mp4`
- `wbs-architecture.mp4`
- `ai-forensics.mp4`
- `strategic-reporting.mp4`
- `compliance.mp4`
- `api-integration.mp4`

## How the sandbox videos are produced

Run the dev server, then the Playwright capture script:

```bash
npm run dev:frontend            # in one terminal
node frontend/scripts/capture-demo-videos.mjs   # in another
```

Prerequisites: `npx playwright install chromium` (once per machine).

The script records the `/landing/workflows` page via Playwright's native
`page.video` API. Each role gets its own clean page (fresh navigation,
auto-play, wait for "Scenario complete." banner). A fourth "walkthrough"
video cycles through all three roles in one take.

Output format is WebM (Playwright default). If `ffmpeg` is on `PATH` the
script also writes `.mp4` variants (H.264 + AAC) because Safari does not
play WebM reliably. When `ffmpeg` is absent the script prints the exact
conversion command to run manually.

## Timing & coupling

- Sandbox auto-advances every 3.2 s. Per-role capture takes ~12-14 s.
- Walkthrough (CEO -> PM -> AUDIT) takes ~45 s.
- Selectors in `capture-demo-videos.mjs` target the DemoSandbox component.
  If the UI changes the script throws -- re-run and verify before committing.

## Re-recording cadence

Re-run the capture script after any release that touches:
- `/landing/workflows` page
- `DemoSandbox` component
- `demoSandboxData.ts` (scenario steps, panel spotlighting)

## Until videos exist

The Academy modal plays gracefully with `preload="metadata"` -- an empty
file shows the player shell. Record and commit real captures before
announcing the Academy publicly.
