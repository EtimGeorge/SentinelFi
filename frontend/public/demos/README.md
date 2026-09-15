# Demo Videos (`public/demos/`)

Self-hosted lesson videos for the Sentinel Academy (`/training`) are stored
here as `<slug>.mp4` — one per lesson defined in
`frontend/lib/academy-content.ts`:

- `onboarding.mp4`
- `wbs-architecture.mp4`
- `ai-forensics.mp4`
- `strategic-reporting.mp4`
- `compliance.mp4`
- `api-integration.mp4`

## How they are produced

Run `frontend/scripts/capture-demo-videos.mjs` (Playwright) against a seeded,
read-only demo tenant after each release. Never record real tenant data —
the demo tenant contains fixtures only. See the script header for the
step-by-step runbook.

## Until videos exist

The Academy modal plays gracefully with `preload="metadata"` — an empty file
shows the player shell. Record and commit real captures before announcing
the Academy publicly.