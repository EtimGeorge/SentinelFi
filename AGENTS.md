# AGENTS

## graphify

- **graphify** (`.opencode/skills/graphify/SKILL.md`) - any input (code, docs, papers, images) → knowledge graph → clustered communities → HTML + JSON + audit report. Trigger: `/graphify`
- When user types `/graphify`, load the Skill with `skill({ name: "graphify" })` before doing anything else.
- If a knowledge graph exists in `graphify-out/GRAPH_REPORT.md`, read it for god nodes and community structure before searching raw files.
- PreToolUse hook: Before every Glob/Grep, check if `graphify-out/GRAPH_REPORT.md` exists; if so, navigate via graph instead of grepping.

## awesome-design-md

- **awesome-design-md** (`.opencode/skills/awesome-design-md/SKILL.md`) - Create a DESIGN.md style baseline BEFORE building UI. Use FIRST when no design draft exists.
- DESIGN.md is installed at `./DESIGN.md` (linear.app inspiration). Use `Use DESIGN.md as the source of truth for UI decisions` prompt pattern.
- When user asks to build UI like a known brand or wants consistent typography/colors/spacing, load `awesome-design-md` skill first.

## Design-token guardrail

- The ESLint workspace package `packages/eslint-plugin-sentinelfi` provides `sentinelfi/no-ai-tells`. `frontend/.eslintrc.json` extends `plugin:sentinelfi/recommended`. Canonical source is `packages/eslint-plugin-sentinelfi/index.js` — if a fresh clone fails to resolve the plugin, re-run `npm install` to recreate the workspace symlink.
- Never introduce raw `shadow-{sm|md|lg|xl|2xl}`, `tracking-widest/wide/wider`, `text-[8px|9px|10px]`, or decorative `bg-gradient-to-*` in app UI. Use DESIGN.md tokens (`elev-*`, `text-*`, `shadow-brand-*`).

## Workspace temp space

- Always write scratch/log/probe/temp files inside the repo's own `/.workspace-temp/` directory (already gitignored) — NEVER into the global system temp (`%TEMP%`, `C:\Users\user\AppData\Local\Temp`, etc.). The user must not have to clean up outside the project.

## Verification

Before finishing any code task, run (sequentially, not in parallel — parallel tsc/jest can cause phantom parse errors):

```bash
npx tsc --noEmit                      # frontend
npx tsc --noEmit -p backend/tsconfig.json   # backend
npm test --workspace frontend         # jest suite
npx next lint                         # eslint incl. sentinelfi guardrail
```
