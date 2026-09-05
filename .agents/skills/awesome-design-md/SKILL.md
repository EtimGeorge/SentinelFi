---
name: awesome-design-md
description: Create a DESIGN.md style baseline BEFORE building UI. Use FIRST when no design draft exists — installs a proven visual style, then invoke frontend-design to implement. For borrowing a known product style, getting consistent typography/colors/spacing, or needing a fast visual starting point.
license: MIT
compatibility: opencode
---

# awesome-design-md

Use this skill when you want to apply a proven visual style to a project by adding a `DESIGN.md` file from the VoltAgent `awesome-design-md` collection.

## When to use

- User wants UI to look like a known product/site style (e.g., "make it look like Linear/Stripe/Vercel")
- User asks to add or refresh `DESIGN.md` for coding-agent UI output
- User wants consistent typography, colors, spacing, and component styling before UI implementation
- User has no design draft and needs a fast, high-quality visual starting point

## Prerequisites

- Run from the target project root
- `npx` is available
- If `DESIGN.md` already exists, decide whether to overwrite (`--force`) or write to another path (`--out`)

## Install via getdesign CLI (recommended)

```bash
npx --yes getdesign@latest add <slug>
# First install writes ./DESIGN.md
# If DESIGN.md already exists, CLI writes ./<slug>/DESIGN.md
```

Overwrite active DESIGN.md:

```bash
npx --yes getdesign@latest add <slug> --force
```

Write to custom path:

```bash
npx --yes getdesign@latest add <slug> --out ./docs/DESIGN.md
```

List available slugs:

```bash
npx --yes getdesign@latest list
```

Repository: https://github.com/VoltAgent/awesome-design-md

## No-Design-Draft Fast Path

When user has no design draft, pick one baseline slug by product intent:

- `B2B/SaaS dashboard`: `linear`, `vercel`, `supabase`
- `Marketing landing page`: `framer`, `stripe`, `notion`
- `Documentation`: `mintlify`, `hashicorp`, `mongodb`
- `E-commerce/consumer`: `airbnb`, `shopify`, `nike`
- `Media/editorial`: `theverge`, `wired`, `spotify`

Then run:

```bash
npx --yes getdesign@latest add <slug> --force
```

This gives the agent an explicit style anchor immediately, avoiding generic defaults.

## Fuzzy Style Request Mapping

- `极简专业 / SaaS 感`: `linear`, `vercel`
- `增长营销 / 品牌展示`: `framer`, `stripe`
- `文档知识库 / 开发者文档`: `mintlify`, `hashicorp`, `mongodb`
- `电商消费 / 商品导向`: `shopify`, `airbnb`, `nike`
- `媒体杂志 / 视觉冲击`: `theverge`, `wired`, `spotify`

Pick one primary slug from user intent and install with `--force` for deterministic output. If user gives no domain cue, default to `linear`.

## Prompt Pattern

After installing, tell the agent:

- `Use DESIGN.md as the source of truth for UI decisions in this task.`
- `Follow color roles, typography hierarchy, spacing scale, and component states from DESIGN.md.`
- `If a UI decision is unclear, prefer consistency with DESIGN.md over introducing new styles.`

## What To Do After Install

1. Read `./DESIGN.md` that was just created
2. Use it as source of truth for all UI code generation (colors, typography, spacing, shadows, component states)
3. If `frontend-design` skill is also installed, invoke it next to implement pages/components with DESIGN.md tokens
