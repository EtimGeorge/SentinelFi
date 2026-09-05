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
